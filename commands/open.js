// command for starting an open challenge

const Discord = require('discord.js')
const Elo = require('../util/calculate_elo')

const CHALLENGE_TIMER = 15 * 60 * 1000; // length of time an open challenge is kept open - set to 10 mins for testing
const MATCH_TIMER = 5000 //75 * 60 * 1000; // length of time an active game is kept open - set to 1 hour for testing
const WARNING_TIMER = 15 * 1 * 1000; /// length of time for players to respond to the warning message
const FIRST_SUMMARY_TIMER = 5 * 60 * 1000; // length of time to keep the match summary up, in case match dispute resolution
const SECOND_SUMMARY_TIMER = 5 * 60 * 1000; // length of time to keep the match summary up, in case match dispute resolution

exports.run = async (client, message, args, database) => {
    if (message.channel.name != 'elobot') return;

    const kaiserCry = client.emojis.get("650860898176598037")
    
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

    let busyPlayers = await getBusyPlayers(database)

    // await reactions on challenge
    const challengeFilter = (reaction, user) => {
        return reaction.emoji.name === '✅' && // 1. correct reaction
        user.id != message.author.id && // 2. not the challenger
        ladderPlayers.includes(user.tag) && // 3. reacter is part of the ladder
        !busyPlayers.includes(user.tag) // 4. reacter doesn't already have an active game or open challenge
    }

    let reacter
    let challengeAccepted = false;

    challengeMessage.react('✅');

    // await reactions on the challenge
    await challengeMessage.awaitReactions(challengeFilter, {max: 1, time: CHALLENGE_TIMER, errors: ['Timeout']}).then(collected => {
        
        reacter = collected.last().users.last()
        challengeAccepted = true;
    }).catch(collected => {
        
        deleteOpenChallenge(message.author, database)
        message.channel.send(`Nobody responded to ${message.author}'s open challenge in time`)
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
        .addField(`Report:`,`To report on the result of this match, please indicate whether you won - 🏆 or lost - ${kaiserCry} the match by reacting to this message. 
            \nIf there is an issue with this game, react with ❓ to have this match flagged for review by an admin.
            \nIf both players wish to cancel the match, they can react with 🚫`)
    challengeMessage.delete()
    matchMessage = await message.channel.send(`${message.author} vs ${reacter}`,{embed: matchEmbed})
    
    // await reactions for match result
    const matchFilter = (reaction, user) => {
        return user.id === message.author.id || user.id === reacter.id && // 1. is one of the players in the game
            !user.bot && // 2. not a bot
            ['🏆',`KaiserCry`, `🚫`].includes(reaction.emoji.name) // 3. is reacting with a valid response
    }

    await matchMessage.react('🏆')
    await matchMessage.react(kaiserCry)
    await matchMessage.react('🚫')

    let reportingPlayer
    let reportedEmoji

    let cancelledMatch = false;

    await matchMessage.awaitReactions(matchFilter, {max: 1, time: MATCH_TIMER, errors: ['Timeout']}).then(async collected => {

        //if (collected.last().length === undefined) throw err;

        let lastReaction = collected.last()
        reportingPlayer = lastReaction.users.last().tag

        console.log(lastReaction.emoji.name)

        if (lastReaction.emoji.name === '🚫') {
            // match was cancelled
            cancelledMatch = true;

            throw 'Match was cancelled'
        }

        database.query({sql: `DELETE FROM active_games WHERE player1='${reportingPlayer}' OR player2='${reportingPlayer}'`})

        // get the result of the match in a convenient form from understanding who responded 
        let matchResult = await processReaction(message.author.tag, reacter.tag, reportingPlayer, lastReaction.emoji.name, database)

        // get the elo result to put into the summary, and later into the completed games table
        let eloResult = await calcElo([message.author.tag, reacter.tag, matchResult[2]], database)

        // create the embed
        let summaryEmbed = await createSummary(matchResult, map.results[0], message, reacter, eloResult)

        // remove the old embed
        matchMessage.delete()

        // send the new embed
        let summaryMessage = await message.channel.send(`${message.author} vs ${reacter}`, {embed: summaryEmbed})
        
        // summary filter
        let summaryFilter = (reaction, user) => {
            return user.id === message.author.id || user.id === reacter.id &&
                user.id != summaryMessage.author.id &&
                ['✅','❓'].includes(reaction.emoji.name)
        }

        let disputingUser

        summaryMessage.awaitReactions(summaryFilter, {max: 1, time: FIRST_SUMMARY_TIMER, errors: 'Timeout'}).then(collected => {
            if (collected.keyArray().includes('❓')) {
                // first reaction was ❓

                disputingUser = collected.last().users.last().tag

                // add a record to the disputed games table
                createDisputedMatchRecord(matchResult, map.results[0].abbreviation, message.author, reacter, disputingUser, database)

                // delete the open games
                deleteOpenChallenge(message.author, database)

                // let the players know the match was disputed
                message.channel.send(`The result of the match between ${message.author} and ${reacter} has been disputed by ${disputingUser}.
                Please contact one of the admins (\`\`!admins\`\`) to have the result corrected.`)

                summaryMessage.clearReactions()

            } else {
                // first reaction was ✅

                // find out who reacted, and remove them from the summaryFilter, make a "secondFilter"
                let secondFilter

                if (collected.last().users.last() === message.author) {
                    secondFilter = (reaction, user) => {
                        return user.id === reacter.id &&
                            user.id != summaryMessage.author.id &&
                            ['✅','❓'].includes(reaction.emoji.name)
                    }
                } else {
                    secondFilter = (reaction, user) => {
                        return user.id === message.author.id &&
                            user.id != summaryMessage.author.id &&
                            ['✅','❓'].includes(reaction.emoji.name)
                    }
                }
                
                // await second reaction
                summaryMessage.awaitReactions(secondFilter, {max: 1, time: SECOND_SUMMARY_TIMER, errors: 'Timeout'}).then(collected =>{

                    if (collected.keyArray().includes('❓')) {
                        // second reaction was ❓

                        disputingUser = collected.last().users.last().tag

                        // add a record to the disputed games table
                        createDisputedMatchRecord(matchResult, map.results[0].abbreviation, message.author, reacter, disputingUser, database)

                        // delete the open game
                        deleteOpenChallenge(message.author, database)

                        // delete the active game

                        // let the players know the match was disputed
                        message.channel.send(`The result of the match between ${message.author} and ${reacter} has been disputed by ${disputingUser}.
                        Please contact one of the admins (\`\`!admins\`\`) to have the result corrected.`)

                        summaryMessage.clearReactions()
                    } else {
                        // second reaction was ✅

                        // add result to the "completed_games" table
                        confirmMatch(matchResult, eloResult, map.results[0].abbreviation, message.author, reacter, database)

                        // update the elo for the players on "players" table
                        updateElo(eloResult, message.author, reacter, database)

                        // delete the record for the open game in "open_games" table
                        deleteOpenChallenge(message.author, database)

                        summaryMessage.clearReactions()
                    }
                }).catch(async function (err) {
                    // Time out on the summary
                    if (err) throw err;

                    // add result to the "completed_games" table
                    confirmMatch(matchResult, eloResult, map.results[0].abbreviation, message.author, reacter, database)

                    // update the elo for the players on "players" table
                    updateElo(eloResult, message.author, reacter, database)
                    
                })
            }
        })

        await summaryMessage.react('✅')
        summaryMessage.react('❓')

    }).catch(async function (err) {

        if (err) console.log(err);

        // There was no report on the match
        if (cancelledMatch) {
            message.channel.send(`The match between ${message.author} and ${reacter} was cancelled. \nThe match has been deleted.`)
        } else {
            message.channel.send(`There was no response to the match between ${message.author} and ${reacter} on ${map.results[0].name}. \nThe match has been deleted.`)
        }

        // delete the open challenge
        deleteOpenChallenge(message.author, database)

        // delete the active game
        deleteActiveGame(message.author.tag, database)

        // delete the match embed
        matchMessage.delete()
        
    })

    // await reactions on the summary embed

}

async function confirmMatch(matchResult, eloResult, map, author, reacter, database) {

// +--------------------+------------+------+-----+---------+----------------+
// | Field              | Type       | Null | Key | Default | Extra          |
// +--------------------+------------+------+-----+---------+----------------+
// | id                 | bigint(20) | NO   | PRI | NULL    | auto_increment |
// | gametype           | int(2)     | NO   |     | 1       |                |
// | player1            | char(128)  | NO   |     | NULL    |                |
// | player1_newelo     | int(5)     | NO   |     | NULL    |                |
// | player2            | char(128)  | NO   |     | NULL    |                |
// | player2_newelo     | int(5)     | NO   |     | NULL    |                |
// | winner             | int(1)     | NO   |     | NULL    |                |
// | elo_change         | int(4)     | NO   |     | NULL    |                |
// | map                | char(4)    | NO   |     | NULL    |                |
// | time_of_completion | datetime   | NO   |     | NULL    |                |
// +--------------------+------------+------+-----+---------+----------------+

    // id is auto_increment
    // gametype is auto 1
    let player1 = author.tag
    let player1_newelo = eloResult[0]
    let player2 = reacter.tag
    let player2_newelo = eloResult[1]
    
    // convert winner to be the player who won i.e. p1 won, then winner = 1, p2 won, winner = 2
    let winner;
    if (matchResult[2] === 0) {
        winner = 2
    } else {
        winner = 1
    }

    let elo_change = eloResult[2]

    let time_of_completion = getTheTime()
    
    // this looks disgusting, but template literal notation does not seem to work for this query for some reason.
    await database.query({sql: `
        INSERT INTO
            completed_games
                (
                    player1,
                    player1_newelo,
                    player2,
                    player2_newelo,
                    winner,
                    elo_change,
                    map,
                    time_of_completion
                )
                VALUES
                (
                    :player1,
                    :player1_newelo,
                    :player2,
                    :player2_newelo,
                    :winner,
                    :elo_change,
                    :map,
                    :time_of_completion
                )
        `,
    params: {
        player1: player1,
        player1_newelo: player1_newelo,
        player2: player2,
        player2_newelo: player2_newelo,
        winner: winner,
        elo_change: elo_change,
        map: map,
        time_of_completion: time_of_completion
    }})
}

async function processReaction(player1tag, player2tag, reportingPlayer, reportedEmoji, database) {
    // figures out who won from the reaction and then calls calcElo with that information
    
    let winner

    // could use conditional ternary operators to make this shorter, but this is more readable
    if (player1tag === reportingPlayer) {
        // player 1 reacted
        if (reportedEmoji === '🏆') {
            // player 1 won
            winner = 1
        } else {
            // player 1 lost
            winner = 0
        }
    } else {
        // player 2 reacted
        if (reportedEmoji === '🏆') {
            // player 2 won
            winner = 0
        } else {
            // player 2 lost
            winner = 1
        }
    }

    return [player1tag, player2tag, winner]
}

async function deleteOpenChallenge(author, database) {
    await database.query({sql: `DELETE FROM open_challenges WHERE discord_id='${author.tag}'`})
}

async function calcElo(input, database) {
    
    // get player's elos - using single queries to avoid sql injection
    let player1EloQuery = await database.query({sql: `SELECT elo FROM players WHERE discord_id='${input[0]}'`})
    let player2EloQuery = await database.query({sql: `SELECT elo FROM players WHERE discord_id='${input[1]}'`})

    // calculate the change in elo
    let newElos = Elo.calculateElo(player1EloQuery.results[0].elo, player2EloQuery.results[0].elo, input[2])

    // absolute elo change
    newElos.push(Math.abs(player1EloQuery.results[0].elo - newElos[0]))
    
    return newElos

}

async function updateElo(input, challenger, reacter, database) {
    // update the players rows in the database
    await database.query({sql: `UPDATE players SET Elo=${input[0]} WHERE discord_id='${challenger.tag}'`})
    await database.query({sql: `UPDATE players SET Elo=${input[1]} WHERE discord_id='${reacter.tag}'`})
}

async function createDisputedMatchRecord(matchResult, map, challenger, reacter, disputingUser, database) {
// +-----------------+------------+------+-----+---------+----------------+
// | Field           | Type       | Null | Key | Default | Extra          |
// +-----------------+------------+------+-----+---------+----------------+
// | id              | bigint(20) | NO   | PRI | NULL    | auto_increment |
// | gametype        | int(2)     | NO   |     | 1       |                |
// | player1         | char(128)  | NO   |     | NULL    |                |
// | player2         | char(128)  | NO   |     | NULL    |                |
// | proposed_winner | char(128)  | NO   |     | NULL    |                |
// | disputing_user  | char(128)  | NO   |     | NULL    |                |
// | map             | char(4)    | NO   |     | NULL    |                |
// | time_of_dispute | datetime   | NO   |     | NULL    |                |
// +-----------------+------------+------+-----+---------+----------------+

    let player1 = matchResult[0]
    let player2 = matchResult[1]
    
    // convert winner to be the player who won i.e. p1 won, then winner = 1, p2 won, winner = 2
    let proposed_winner;
    if (matchResult[2] === 0) {
        proposed_winner = 2
    } else {
        proposed_winner = 1
    }

    let time_of_dispute = getTheTime()

    await database.query({sql: `
        INSERT INTO 
            disputed_games (
                player1, 
                player2, 
                proposed_winner, 
                disputing_user, 
                map, 
                time_of_dispute
            )
        VALUES (
                :player1,
                :player2,
                :proposed_winner,
                :disputing_user,
                :map,
                :time_of_dispute
            );`, 
        params: {
            player1: player1,
            player2: player2,
            proposed_winner: proposed_winner,
            disputing_user: disputingUser,
            map: map,
            time_of_dispute: time_of_dispute
        }
    })
    

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

async function getBusyPlayers(database) {
    let challengeQuery = await database.query({sql: `SELECT * FROM open_challenges`})
    let activeQuery = await database.query({sql: `SELECT * FROM active_games`})

    let playerList = []

    for (i in challengeQuery.results) {
        playerList.push(challengeQuery.results[i].discord_id)
    }

    for (i in activeQuery.results) {
        playerList.push(challengeQuery.results[i].discord_id)
    }

    return playerList
}

async function deleteActiveGame(player1, database) {
    await database.query({sql: `DELETE FROM active_games WHERE player1='${player1}'`})
}