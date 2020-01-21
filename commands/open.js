// command for starting an open challenge

const Discord = require('discord.js')

exports.run = async (client, message, args, database) => {
    if (message.channel.name != 'elobot') return;

    console.log(client.username)
    
    const CHALLENGE_TIMER = 5 * 1 * 1000; // length of time an open challenge is kept open - set to 10 mins for testing
    const MATCH_TIMER = 5 * 1 * 1000; // length of time an active game is kept open - set to 1 hour for testing
    const WARNING_TIMER = 15 * 1 * 1000; /// length of time for players to respond to the warning message
    const SUMMARY_TIMER = 15 * 60 * 1000; // length of time to keep the match summary up, in case match dispute resolution
    
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
            ['✅','❌','❓'].includes(reaction.emoji.name)
    }

    await matchMessage.react('✅')
    matchMessage.react('❌')

    let reportingPlayer
    let reportedEmoji

    // TO-DO - currently both the try and catch are being triggered when this times out. Investigate.

    await matchMessage.awaitReactions(matchFilter, {max: 1, time: MATCH_TIMER, errors: ['Timeout']}).then(collected => {
        console.log(`reaction on the match`)
        reportingPlayer = collected.last().users.last().tag
        reportedEmoji = collected.last().emoji.name
        //matchMessage.delete()
    }).catch(async function () {
        console.log(`no reaction on the match`)
        // warn the players that they have not responded in time
        warningMessage = await message.channel.send(`ATTENTION: ${message.author} and ${reacter}, No result has been reported for your match ` +
        `on ${map.results[0].name}, please react to this message with ✅ to indicate that you won the match or ❌ to indicate that you lost, `+
        `if no reaction is given within 15 minutes, this match shall be cancelled. If there was an issue with this match, `+
        `please react with ❓ to have this match flagged for review by an admin.`)

        await warningMessage.react('✅')
        warningMessage.react('❌')

        const warningFilter = (reaction, user) => {
            return user.id = message.author.id || user.id === reacter.id &&
                user.id != warningMessage.author.id &&
                ['✅','❌','❓'].includes(reaction.emoji.name)
        }

        let warningReportingPlayer
        let warningReportedEmoji

        await warningMessage.awaitReactions(warningFilter, {max: 1, time: WARNING_TIMER, errors: ['Timeout']}).then(collected =>{
            warningReportingPlayer = collected.last().users.last().tag
            console.log(warningReportingPlayer)
            warningReportedEmoji = collected.last().emoji.name
            console.log(warningReportedEmoji)
        }).catch(collected => {
            console.log(`Warning Timeout`)
        })
        
    })
    // TO-DO - shift all this to a module

}

function getTheTime() {
    // the current time in MySQL 'DATETIME' format 
    let theTime = new Date().toISOString()
        .replace("Z","")
        .replace("T"," ");
    return theTime
}