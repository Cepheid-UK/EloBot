// command for starting an open challenge

// DB has tables that are used here:
// players, mappool, open_challenges, active_games, completed_games

const Discord = require('discord.js')
const Elo = require('../util/calculate_elo')

exports.run = (client, message, args, connection) => {
    
    let CHALLENGE_TIMER = 1 * 10 * 1000; // length of time an open challenge is kept open - set to 10 sec for testing
    let GAME_TIMER = 1 * 10 * 1000; // length of time an active game is kept open - set to 10 sec for testing
    let SUMMARY_TIMER = 1 * 10 * 1000; // length of time to keep the match summary up, in case match dispute resolution

    let match = {}

    let discord_id = message.author.tag;
    let datetime = new Date();
    let time_of_challenge = datetime.toISOString();
    
    // convert ISO datetime string to SQL datetime format
    time_of_challenge = time_of_challenge.replace("Z","");
    time_of_challenge = time_of_challenge.replace("T"," ");
    
    //var challengeCloses = datetime.valueOf + TIMER;

    var sql_checkActiveGames = 'SELECT * FROM active_games WHERE player1=\'' + discord_id + '\' OR player2=\'' + discord_id + '\'';
    var sql_challenge = 'SELECT * FROM open_challenges WHERE discord_id=\'' + discord_id + '\'';

    // query active_games to ensure the player has no active games open
    connection.query(sql_checkActiveGames, function (err, result) {
        if (err) throw err;
        queryResult = result

        // first check if the player has any active games
        if (queryResult.length === 0) {
            connection.query(sql_challenge, async function (err, result) {
                if (err) throw err;
                var queryResult2 = result;
                
                // then check if the player has any open challenges
                if (queryResult2.length === 0) {
                    // no active games and no open challenges - create a new one
                    var sql_createOpenChallenge = 'INSERT INTO open_challenges (discord_id,time_of_challenge) VALUES (\'' + discord_id + '\',\'' + time_of_challenge + '\');'
                    // submit the query
                    connection.query(sql_createOpenChallenge, async function (err, result) {
                        if (err) throw err;

                        var embed = new Discord.RichEmbed()
                            .setColor('#0099ff')
                            .setTitle('Open Challenge')
                            .setDescription('An open challenge has been issued by **' + discord_id + '** please react with :white_check_mark: if you wish to accept this open challenge')
                            .setFooter('This message brought to you by EloBot - Created by Cepheid#6411')
                        
                        let sentEmbedMessage = await message.channel.send({embed})
                        
                        sentEmbedMessage.awaitReactions((reaction, user) => 
                            user.id != sentEmbedMessage.author.id && reaction.emoji.name == '✅' && user.tag != discord_id, {max: 1, time: CHALLENGE_TIMER}).then(collected => {

                                var acceptingUser = collected.last().users.last()
                                var openUser = message.author

                                var map;

                                // select a number between 1-8 for the map
                                sql_mapSelection = 'SELECT * FROM mappool WHERE id=' + Math.floor(Math.random()*8+1)

                                connection.query(sql_mapSelection, async function (err, result) {
                                    if (err) throw err;

                                    // record the map the query returns
                                    map = [result[0].name,result[0].abbreviation]

                                    // build the active game embed (this could be made into a function for easier reading)
                                    var activeGameEmbed = new Discord.RichEmbed()
                                    .setColor('#0099ff')
                                    .setTitle('Match')
                                    .setDescription(' **' + openUser + '** Vs **' + acceptingUser +'**')
                                    .setFooter('This message brought to you by EloBot - Created by Cepheid')
                                    .addField('Map:', map[0] + ' (' + map[1] + ')')

                                    // create the embed
                                    let sentMatchEmbed = await sentEmbedMessage.channel.send({embed: activeGameEmbed})
                                    
                                    // give reactions for players to click on
                                    
                                    // create the filter which determines what conditions the awaitReactions should run
                                    //var matchFilter = (reaction, user) => user.id != sentMatchEmbed.author.id && (reaction.emoji.name == '✅' || reaction.emoji.name == '❌')
                                    
                                    // awaitReactions with the conditions, max: 1 only waits for one response that matches the conditions, times out after GAME_TIMER seconds
                                    sentMatchEmbed.awaitReactions((reaction, user) => user.id != sentMatchEmbed.author.id && (reaction.emoji.name == '✅' || reaction.emoji.name == '❌'), {max: 1, time: GAME_TIMER}).then(collectedMatch => {
                                        // If you get here, it means one of the participating players has pressed ✅ or ❌ on the match embed. (Hopefully!)
                                        // TO-DO - add a filter to this to make sure only the players can respond to the match, possibly also an admin role.

                                        var reportingUser = collectedMatch.last().users.last()

                                        // create an array of the participating players 
                                        var participatingPlayers = [openUser.tag, acceptingUser.tag]
                                    
                                                                                        
                                        // the player who has reacted
                                        var reportingUser = collectedMatch.last().users.last()

                                        // create the sql queries to get the current elos of the participating players
                                        
                                        var sql_retreivePlayer1Elo = 'SELECT Elo FROM players WHERE Discord_Id=\'' + participatingPlayers[0] + '\''
                                        var sql_retreivePlayer2Elo = 'SELECT Elo FROM players WHERE Discord_Id=\'' + participatingPlayers[1] + '\''
                                        
                                        // query the sqls
                                        connection.query(sql_retreivePlayer1Elo, function(err, results) {
                                            
                                            // add first player's elo to results array 'elos'
                                            var elos = []
                                            elos.push(results[0].Elo)

                                            connection.query(sql_retreivePlayer2Elo, function (err, results) {
                                                // get the second player's elo
                                                elos.push(results[0].Elo)
                                                console.log(elos)
                                                
                                                // get the response to see if the reporting player reported a win or loss
                                                var response = collectedMatch.last().emoji.name
                                                
                                                let winner
                                                let winningUser

                                                // see if the response was a win or a loss
                                                if (response === '✅') {
                                                    // reportingUser won
                                                    if (reportingUser.tag === participatingPlayers[0]) {
                                                        winner = 1
                                                    } else {
                                                        winner = 0
                                                    }
                                                } else if (response === '❌') {
                                                    // reportingUser lost
                                                    if (reportingUser.tag === participatingPlayers[0]) {
                                                        winner = 0
                                                    } else {
                                                        winner = 1
                                                    }
                                                }

                                                // calculate elo change
                                                // must be in two queries for security (no multiple lines of sql)
                                                var newElos = Elo.calculateElo(elos[0], elos[1], winner)
                                                console.log(newElos)
                                                var sql_submitNewElos1 = 'UPDATE players '
                                                                        +'SET Elo=\'' + newElos[0] + '\' '
                                                                        +'WHERE Discord_Id=\'' + participatingPlayers[0] + '\''
                                                
                                                var sql_submitNewElos2 = 'UPDATE players '
                                                                        +'SET Elo=\'' + newElos[1] + '\' ' 
                                                                        +'WHERE Discord_Id=\'' + participatingPlayers[1] + '\';'
                                                
                                                // submit results
                                                connection.query(sql_submitNewElos1, function (err, results) {
                                                    if (err) throw err;
                                                    connection.query(sql_submitNewElos2, function (err, results) {
                                                        if (err) throw err;
                                                    })
                                                })
                                            })
                                        })

                                        sentMatchEmbed.clearReactions()
                                        

                                        var sql_deleteActiveGamesFromMatchEmbed = 'DELETE FROM active_games WHERE player1=\'' + openUser.tag + '\''
                                        connection.query(sql_deleteActiveGamesFromMatchEmbed, async function (err, results) {
                                            if (err) throw err;

                                            let summaryEmbed = activeGameEmbed
                                            let winningUser = 'Winner'; // TO-DO - re-calculate who the winner is
                                            summaryEmbed.addField('Winner', winningUser)
                                                        .setTitle('Match Summary')
                                                        .addField('If this is not correct, you may dispute this result with', '❓') // add to "disputed_games" table
                                                        .addField('Confirm', 'This result shall be confirmed if both players respond with ✅')
                                            sentMatchEmbed.edit({embed: summaryEmbed});

                                            sentMatchEmbed.awaitReactions((reaction, user) => (user === openUser || user === acceptingUser) && reaction.emoji.name == '✅', {max: 2, time: SUMMARY_TIMER}).then(collectedSummary => {
                                                // match result confirmed
                                                console.log('completed match, both players confirmed')
                                                sentMatchEmbed.delete()
                                            }).catch(err => {
                                                if (err) throw err;
                                                //submitGameResult(sentMatchEmbed)

                                                // submit to completed_games table

                                            })

                                            sentMatchEmbed.awaitReactions((reaction, user) => (user === openUser || user === acceptingUser) && reaction.emoji.name == '❓', {max: 1, time: SUMMARY_TIMER}).then(collectedSummary => {
                                                // match disputed
                                            }).catch(err => {
                                                if (err) throw err;
                                                // submit to completed_games table

                                            })

                                            await sentMatchEmbed.react('✅')
                                            sentMatchEmbed.react('❓')
                                            
                                            })
                                        
                                            
                                            }).catch(err => {
                                                if (err) throw err;
                                                sentMatchEmbed.delete()
                                                let sql_deleteActiveGamesFromMatchEmbed = 'DELETE FROM active_games WHERE player1=\'' + openUser + '\''
                                                connection.query(sql_deleteActiveGamesFromMatchEmbed, function (err, results) {
                                                    matchSent.channel.send('No response in time, match was deleted')
                                                    })
                                                
                                            })

                                            await sentMatchEmbed.react('✅')
                                            sentMatchEmbed.react('❌')
                                        })
                                        sentEmbedMessage.delete()

                                        // create and query sql to add to active games
                                        var player1 = openUser.tag
                                        var player2 = acceptingUser.tag
                                        var activeTime = new Date().toISOString()
                                        activeTime = activeTime.replace("Z","");
                                        activeTime = activeTime.replace("T"," ");
                                        var sql_createActiveGame = 'INSERT INTO active_games (player1, player2, time_of_challenge) VALUES (\'' + player1 + '\',\'' + player2 + '\',\'' + activeTime + '\');'
                                        connection.query(sql_createActiveGame, function (err, results) {
                                            if (err) throw err;
                                            })
                                    }).catch(err => {
                                        sentEmbedMessage.delete()
                                        var sql_deleteOpenChallenge = 'DELETE FROM open_challenges;'
                                        connection.query(sql_deleteOpenChallenge, function (err, results) {
                                            sentEmbedMessage.channel.send('No response to the open challenge, challenge was deleted')
                                            })
                                        })
                        sentEmbedMessage.react('✅')  
                    })
                } else {
                message.channel.send('You have an open challenge, please await a response to this challenge before opening another')
                //message.author.send('You have an open challenge, please await a response to this challenge before opening another')
        }
    })   
        } else {
            message.channel.send(`You have an active game currently open, please report on the result of this game to open another challenge`)
            //message.author.send(`You have an active game currently open, please report on the result of this game to open another challenge`)
        }
    })
};

function submitGameResult(embed) {

}