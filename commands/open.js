// command for starting an open challenge

const Discord = require('discord.js')
const Elo = require('../util/calculate_elo')

const CHALLENGE_TIMER = 5 * 1 * 1000; // length of time an open challenge is kept open - set to 10 mins for testing
const MATCH_TIMER = 5 * 1 * 1000; // length of time an active game is kept open - set to 1 hour for testing
const WARNING_TIMER = 15 * 1 * 1000; /// length of time for players to respond to the warning message
const SUMMARY_TIMER = 15 * 1 * 1000; // length of time to keep the match summary up, in case match dispute resolution

exports.run = async (client, message, args, database) => {
    if (message.channel.name != 'elobot') return;
    
    
    
    let authorQuery = await database.query({sql: `SELECT * FROM players WHERE discord_id='${message.author.tag}';`})
    

    // check if the author is in the ladder
    if (authorQuery.results.length === 0) {
        message.channel.send(`Please use the \`\`!signup\`\` command to join the EloBot Ladder`);
        return;
    } 

    // check if they have any active games
    let activeGamesQuery = await database.query({sql:`SELECT * FROM active_games WHERE player1='${message.author.tag}' OR player2='${message.author.tag}'`})
    if (activeGamesQuery.results.length != 0) {
        message.channel.send('Please report on the result of your active game to open a new challenge');
        return;
    }

    // check if they have any open challenges pending
    let openChallengeQuery = await database.query({sql:`SELECT * FROM open_challenges WHERE discord_id='${message.author.tag}'`})
    if (openChallengeQuery.results.length != 0) {
        message.channel.send('You have an open challenge, please await a response to this challenge before opening another');
        return;
    }

    // no open challenges or active games, so create an open challenge:
    await database.query({sql: `INSERT INTO open_challenges (discord_id, time_of_challenge) VALUES (:first,:second);`, params: {first: message.author.tag, second: getTheTime()}})

    // get all the players from the ladder into an array
    let players = await database.query({sql: `SELECT * FROM players;`})
    let ladderPlayers = [];
    for (i in players.results) {
        ladderPlayers.push(players.results[i].discord_id)
    }    

    // create the challenge embed and send it
    let challengeEmbed = new Discord.RichEmbed()
        .setColor('#0099ff')
        .setTitle('Open Challenge')
        .setDescription(`An open challenge has been issued by **${message.author.username}** please react with :white_check_mark: if you wish to accept this open challenge`)
        .setFooter('This message brought to you by EloBot - Created by Cepheid#6411')

    let challengeMessage = await message.channel.send({embed: challengeEmbed})
    
    // await reactions
    const challengeFilter = (reaction, user) => {
        return reaction.emoji.name === '✅' && // 1. correct reaction
        user.id != message.author.id && // 2. not the challenger
        ladderPlayers.includes(user.tag); // 3. reacter is part of the ladder
    }

    let reacter
    let challengeAccepted = false;

    challengeMessage.react('✅');

    // await reactions on the challenge
    await challengeMessage.awaitReactions(challengeFilter, {max: 1, time: CHALLENGE_TIMER, errors: ['Timeout']}).then(collected => {
        reacter = collected.last().users.last()
        challengeAccepted = true;
    }).catch(collected => {
        database.query({sql: `DELETE FROM open_challenges WHERE discord_id='${message.author.tag}'`})
        message.channel.send(`Nobody responded to the open challenge in time`)
        challengeMessage.delete()
        challengeAccepted = false;
    })

    if (!challengeAccepted) return;
        
    // get random map
    let map = await database.query({sql: `SELECT * FROM mappool WHERE id=${Math.floor(Math.random()*7+1)}`})
    
    // create row in active_games
    await database.query({sql: `INSERT INTO active_games (player1,player2,map,time_of_challenge) VALUES (:player1,:player2,:map,:toc)`, 
        params: {player1: message.author.tag,
                player2: reacter.tag,
                map: map.results[0].abbreviation,
                toc: getTheTime()}})
    
    // create embed
    let matchEmbed = new Discord.RichEmbed()
        .setColor('#0099ff')
        .setTitle('Match')
        .setDescription(`${message.author} vs ${reacter}`)
        .setFooter(`This message brought to you by EloBot - Created by Cepheid`)
        .addField(`Map`,`${map.results[0].name} (${map.results[0].abbreviation})`)
        .addField('Report:','To report on the result of this match, please indicate whether you won - ✅ or lost - ❌ the match by reacting to this message. '
            + 'If there is an issue with this game, react with ❓ to have this match flagged for review by an admin')
    challengeMessage.delete()
    matchMessage = await message.channel.send(`${message.author} vs ${reacter}`,{embed: matchEmbed})
    
    // await reactions for match result
    const matchFilter = (reaction, user) => {
        return user.id === message.author.id || user.id === reacter.id &&
            user.id != matchMessage.author.id &&
            ['✅','❌'].includes(reaction.emoji.name) // support '❓' later
    }

    await matchMessage.react('✅')
    matchMessage.react('❌')

    let reportingPlayer
    let reportedEmoji

    await matchMessage.awaitReactions(matchFilter, {max: 1, time: MATCH_TIMER, errors: ['Timeout']}).then(async collected => {

        let lastReaction = collected.last()

        // since the bot adds reactions, collected will always contain a MessageReaction, so check to ensure it's actually a player:
        //if (lastReaction.users.last().id != message.author.id && lastReaction.users.last().id != reacter.id) { return };

        reportingPlayer = lastReaction.users.last().tag
        reportedEmoji = lastReaction.emoji.name
        database.query({sql: `DELETE FROM active_games WHERE player1='${reportingPlayer}' OR player2='${reportingPlayer}'`})

        // pass a function: 1. player1 tag 2. player2 tag, 3. who reported the result 4. what they reported 5. link to the database so function can query
        let matchResult = await processResult(message.author.tag, reacter.tag, reportingPlayer, reportedEmoji, database)

        // get the elo result to put into the summary, and later into the completed games table
        let eloResult = await calcElo([message.author.tag, reacter.tag, matchResult[2]], database)

        // create the embed
        let summaryEmbed = await createSummary(matchResult, map.results[0], message, reacter, eloResult)

        // remove the old embed
        matchMessage.delete()

        // send the new embed
        let summaryMessage = await message.channel.send({embed: summaryEmbed})
        
        // summary filter
        const summaryFilter = (reaction, user) => {
            return user.id === message.author.id || user.id === reacter.id &&
                user.id != summaryMessage.author.id &&
                ['✅','❓'].includes(reaction.emoji.name)
        }

        summaryMessage.awaitReactions(summaryFilter, {max: 2, time: SUMMARY_TIMER, errors: 'Timeout'}).then(collected =>{

            if (collected.keyArray().includes('❓')) {
                // there is a dispute
                console.log(`summary result disputed`)
            } else {
                // there were two reactions, neither of which were ❓
                console.log(`match confirmed`)
            }
        }).catch(function (err) {
            // Time out on the summary
            if (err) throw err;
            // either one or no reactions were received.
            // 1. check to see if there was 1 reaction
            // 2. check to see if that was a ❓
            // 3. if yes, make a disputed_game row
            // 4. if no, make a completed_game row
        })

        await summaryMessage.react('✅')
        summaryMessage.react('❓')

        //await processSummary(message, summaryMessage, reacter, map.results[0], database)

        //calcElo([message.author.tag, reacter.tag, winner], database)

    }).catch(async function (err) {
        if (err) throw err;
        console.log(`no reaction on the match`)
        // warn the players that they have not responded in time
        let warningMessage = await message.channel.send(`ATTENTION: ${message.author} and ${reacter}, No result has been reported for your match ` +
        `on ${map.results[0].name}, please react to this message with ✅ to indicate that you won the match or ❌ to indicate that you lost, `+
        `if no reaction is given within 15 minutes, this match shall be cancelled. If there was an issue with this match, `+
        `please react with ❓ (Not yet supported) to have this match flagged for review by an admin.`)

        await warningMessage.react('✅')
        warningMessage.react('❌')

        const warningFilter = (reaction, user) => {
            return user.id === message.author.id || user.id === reacter.id &&
                user.id != warningMessage.author.id &&
                ['✅','❌'].includes(reaction.emoji.name) // support '❓' later
        }

        let warningReportingPlayer
        let warningReportedEmoji

        await warningMessage.awaitReactions(warningFilter, {max: 1, time: WARNING_TIMER, errors: ['Timeout']}).then(collected =>{

            let warningLastReaction = collected.last()
            // as with match: since the bot adds reactions, collected will always contain a MessageReaction, check to ensure it's actually a player:
            if (warningLastReaction.users.last().id != message.author.id && warningLastReaction.users.last().id != reacter.id) { return };

            // report on the result as per match reaction
            // function to calculate winner from the reaction
            // function to send the result to the completed_games table

        }).catch(collected => {
            if (err) throw err;
            console.log(`Warning Timeout`)
        })
        
    })

    // await reactions on the summary embed

}

async function confirmMatch(matchResult, eloResult, map, author, reacter, database) {
    // completed_games table:
//     +--------------------+------------+------+-----+---------+----------------+
// | Field              | Type       | Null | Key | Default | Extra          |
// +--------------------+------------+------+-----+---------+----------------+
// | id                 | bigint(20) | NO   | PRI | NULL    | auto_increment |
// | gametype           | int(2)     | NO   |     | 1       |                |
// | player1            | char(128)  | NO   |     | NULL    |                |
// | player1_newelo     | int(5)     | NO   |     | NULL    |                |
// | player2            | char(128)  | NO   |     | NULL    |                |
// | player2_newelo     | int(5)     | NO   |     | NULL    |                |
// | winner             | char(128)  | NO   |     | NULL    |                |
// | elo_change         | int(4)     | NO   |     | NULL    |                |
// | map                | char(4)    | NO   |     | NULL    |                |
// | time_of_challenge  | datetime   | NO   |     | NULL    |                |
// | time_of_completion | datetime   | NO   |     | NULL    |                |
// +--------------------+------------+------+-----+---------+----------------+

    // id is auto_increment
    // gametype is auto 1
    let player1 = author.tag
    let player1_newelo = eloResult[0]
    let plyaer2 = reacter.tag
    let player2_newelo = eloResult[1]
    
    // convert winner to be the player who won i.e. p1 won, then winner = 1, p2 won, winner = 2
    let winner;
    if (eloResult[2] === 0) {
        winner = 1
    } else {
        winner = 2
    }

    // get old elo for elo_change
}

async function processResult(player1tag, player2tag, reportingPlayer, reportedEmoji, database) {
    // figures out who won from the reaction and then calls calcElo with that information
    
    let winner

    // could use conditional ternary operators to make this shorter, but this is more readable
    if (player1tag === reportingPlayer) {
        // player 1 reacted
        if (reportedEmoji === '✅') {
            // player 1 won
            winner = 1
        } else {
            // player 1 lost
            winner = 0
        }
    } else {
        // player 2 reacted
        if (reportedEmoji === '✅') {
            // player 2 won
            winner = 0
        } else {
            // player 2 lost
            winner = 1
        }
    }

    return [player1tag, player2tag, winner]
}

async function calcElo(input, database) {
    
    // get player's elos - using single queries to avoid sql injection
    let player1EloQuery = await database.query({sql: `SELECT elo FROM players WHERE discord_id='${input[0]}'`})
    let player2EloQuery = await database.query({sql: `SELECT elo FROM players WHERE discord_id='${input[1]}'`})

    // calculate the change in elo
    let newElos = Elo.calculateElo(player1EloQuery.results[0].elo, player2EloQuery.results[0].elo, input[2])

    // update the players rows in the database
    await database.query({sql: `UPDATE players SET Elo=${newElos[0]} WHERE discord_id='${input[0]}'`})
    await database.query({sql: `UPDATE players SET Elo=${newElos[1]} WHERE discord_id='${input[1]}'`})

    // absolute elo change
    newElos.push(Math.abs(player1EloQuery.results[0].elo - newElos[0]))
    
    return newElos

}

function getTheTime() {
    // the current time in MySQL 'DATETIME' format 
    let theTime = new Date().toISOString()
        .replace("Z","")
        .replace("T"," ");
    return theTime
}

async function createSummary(matchResult, map, message, reacter, newElos) {

    let winningPlayer

    // array that will store two strings to show elo change, a + and a -, if p1 wins, its ['+','-'], or if p2 wins ['-','+']
    let eloDeltaSign = []

    if (matchResult[2] === 1) {
        winningPlayer = message.author
        eloDeltaSign.push('+')
        eloDeltaSign.push('-')
    } else {
        winningPlayer = reacter
        eloDeltaSign.push('-')
        eloDeltaSign.push('+')
    } 

    console.log(`Winning player is: ${winningPlayer.tag}`)

    // creates a match summary embed
    return new Discord.RichEmbed()
        .setColor('#0099ff')
        .setTitle('Match Result Summary')
        .setDescription(`${message.author} vs ${reacter}`)
        .addField(`Winner:`, `${winningPlayer}`)
        .addField(`Elo Change:`,`${message.author}: ${newElos[0]} (${eloDeltaSign[0]}${newElos[2]})
            ${reacter}: ${newElos[1]} (${eloDeltaSign[1]}${newElos[2]})`)
        .setFooter(`This message brought to you by EloBot - Created by Cepheid`)
        .addField(`Map`,`${map.name} (${map.abbreviation})`)
        .addField('Confirm:','If this result is correct, please respond to this message with ✅')
        .addField('Dispute:','If this result is not correct, please respond to this message with ❓')
}