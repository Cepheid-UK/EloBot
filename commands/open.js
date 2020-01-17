// command for starting an open challenge

// DB has tables that are used here:
// players, mappool, open_challenges, active_games, completed_games

const Discord = require('discord.js')
const Elo = require('../util/calculate_elo')

exports.run = (client, message, args, connection) => {

    if (message.channel.name != 'elobot') {
        return;
    }

    let CHALLENGE_TIMER = 10 * 60 * 1000; // length of time an open challenge is kept open - set to 10 mins for testing
    let GAME_TIMER = 60 * 60 * 1000; // length of time an active game is kept open - set to 1 hour for testing
    let SUMMARY_TIMER = 15 * 60 * 1000; // length of time to keep the match summary up, in case match dispute resolution

    let timeOfChallenge = getTheTime()

    // check if player is part of the elobot ladder
    connection.query('SELECT * FROM players WHERE discord_id=?', [message.author.tag], function (err, results) {
        if (err) throw err;

        if (results.length === 0) {
            // player doesn't exist
            message.channel.send('Please sign up to the EloBot Ladder by using the ``!signup`` command')
        } else{
            // here we go!
            // check there is no active game open
            connection.query('SELECT * FROM active_games WHERE player1=? OR player2=?', [message.author.tag, message.author.tag], function (err, results2) {
                if (err) throw err;

                if (results2.length === 0) {
                    // no games found, proceed
                    connection.query('SELECT * FROM open_challenges WHERE discord_id=?', [message.author.tag], function(err, results3) {
                        if (err) throw err;

                        if (results3.length === 0) {
                            // no open challenges
                            connection.query('INSERT INTO open_challenges (discord_id,time_of_challenge) VALUES (? , ?)', [message.author.tag, timeOfChallenge], function(err, results4) {
                                if (err) throw err;
                                // open challenge added to DB

                                connection.query('SELECT discord_id FROM players', async function (err, results5) {
                                    if (err) throw err;

                                    // get all the members of the elo ladder
                                    let players = []

                                    for (i in results5) {
                                        players.push(results5[i].discord_id)
                                    }

                                    var challengeEmbed = new Discord.RichEmbed()
                                    .setColor('#0099ff')
                                    .setTitle('Open Challenge')
                                    .setDescription('An open challenge has been issued by **' + message.author.username + '** please react with :white_check_mark: if you wish to accept this open challenge')
                                    .setFooter('This message brought to you by EloBot - Created by Cepheid#6411')

                                    let challengeMessage = await message.channel.send({embed: challengeEmbed})
                                    
                                    challengeMessage.awaitReactions((reaction, user) => 
                                        
                                        // Filter checks for:
                                        user.id != challengeMessage.author.id && // 1. reacting user is not the bot
                                        user.id != message.author.id && // 2. reacting user is not the person who issued the challenge
                                        reaction.emoji.name === '✅' && // 3. reaction is ✅
                                        players.includes(user.tag), // 4. reacting user is in the DB as a player who has signed up for the ladder

                                        {max: 1, time: CHALLENGE_TIMER}).then(collected => {
                                            // valid challenge accepted

                                            let challengeUser = message.author
                                            let acceptingUser = collected.last().users.last()
                                            
                                            

                                            connection.query('SELECT * FROM mappool WHERE id=?',[Math.floor(Math.random()*7+1)], async function(err,results6) {
                                                if (err) throw err;

                                                let map = [results6[0].name, results6[0].abbreviation]
                                                
                                                challengeBecomesMatch(challengeUser.tag, acceptingUser.tag, map[1])
                                                
                                                challengeMessage.delete()
                                                let matchEmbed = new Discord.RichEmbed()
                                                .setColor('#0099ff')
                                                .setTitle('Match')
                                                .setDescription(challengeUser + ' vs ' + acceptingUser)
                                                .setFooter('This message brought to you by EloBot - Created by Cepheid')
                                                .addField('Map:', map[0] + ' (' + map[1] + ')')
                                                .addField('Report:','To report on the result of this match, please indicate whether you won (✅) or lost (❌) the match by reacting to this message. '
                                                    + 'If there is an issue with this game, react with ❓ to have this match flagged for review by an admin')

                                                let matchMessage = await message.channel.send({embed: matchEmbed})

                                                matchMessage.awaitReactions((reaction,user) =>

                                                    (user.id === challengeUser.id || user.id === acceptingUser.id) && // 1. not the bot
                                                    ['✅','❌','❓'].includes(reaction.emoji.name), // 2. reaction is valid

                                                    {max: 1, time:GAME_TIMER}).then(collected => {
                                                        // one of the players in the active game reported on the result


                                                        // close active game
                                                        let response = collected.last().emoji.name
                                                        let reactingUser = collected.last().users.last()

                                                        let eloInput = []

                                                        if (response === '❓') {
                                                            createDisputedGame(challengeUser.tag, connection)
                                                            // add game to disputed list
                                                        } else {
                                                            // get existing elos
                                                            connection.query('SELECT * FROM players WHERE discord_id=? OR discord_id=?',[challengeUser.tag,acceptingUser.tag], async function(err,results7) {
                                                                if (err) throw err;

                                                                let challengerElo;
                                                                let acceptingElo;

                                                                // checks and assigns the results of the query so that the ordering is correct
                                                                if (results7[0].discord_id === challengeUser.tag) {
                                                                    challengerElo = results7[0].elo
                                                                    acceptingElo = results7[1].elo
                                                                } else {
                                                                    challengerElo = results7[1].elo
                                                                    acceptingElo = results7[0].elo
                                                                }

                                                                // organises the data to be easily passed to the elo calculation
                                                                let winningIndicator = workOutResult(reactingUser, response, challengeUser)
                                                                eloInput.push(challengerElo) // first users elo
                                                                eloInput.push(acceptingElo) // second users elo
                                                                eloInput.push(winningIndicator) // 1 if first user won, 0 if second user won
                                                                
                                                                let eloResult = Elo.calculateElo(eloInput[0],eloInput[1],eloInput[2])

                                                                // the absolute elo change so that it can be used in the embed
                                                                let eloChange = Math.abs(eloInput[0] - eloResult[0])

                                                                // each user's elo change for the embed
                                                                let challengerEloChange = eloResult[0] - eloInput[0]
                                                                let acceptingEloChange = eloResult[1] - eloInput[1]

                                                                // construct the '(+XX)' or '(-XX)' string for showing an elo change, example:
                                                                // 'fooUser: 1510 (+10)'
                                                                if (challengerEloChange > 0) {
                                                                    challengerEloChange = '+' + challengerEloChange.toString()
                                                                    acceptingEloChange = acceptingEloChange.toString()
                                                                } else if (acceptingEloChange > 0) {
                                                                    challengerEloChange = challengerEloChange.toString()
                                                                    acceptingEloChange = '+' + acceptingEloChange.toString()
                                                                }
                                                                
                                                                let winningUser

                                                                if (winningIndicator === 1) {
                                                                    winningUser = challengeUser
                                                                } else {
                                                                    winningUser = acceptingUser
                                                                }

                                                                // really should use template literals for this
                                                                let summaryEmbed = new Discord.RichEmbed()
                                                                    .setColor('#0099ff')
                                                                    .setTitle('Match Summary')
                                                                    .setDescription(challengeUser + ' vs ' + acceptingUser)
                                                                    .addField('Winner: ',winningUser)
                                                                    .addField('ELO Change :',
                                                                        challengeUser.username + ': ' + eloResult[0] + ' (' + challengerEloChange + ')\n' +
                                                                        acceptingUser.username + ': ' + eloResult[1] + ' (' + acceptingEloChange + ')')
                                                                    .setFooter('This message brought to you by EloBot - Created by Cepheid')
                                                                    .addField('Map:', map[0] + ' (' + map[1] + ')')
                                                                    .addField('Error?', 'If this result is correct, please react with ✅, if this result is not correct, please click ❌')

                                                                matchMessage.delete()
                                                                let summaryMessage = await message.channel.send({embed: summaryEmbed})

                                                                const summaryFilter = (reaction, user) => (user.id === challengeUser.id || user.id === acceptingUser.id) && ['✅','❌'].includes(reaction.emoji.name)
                                                                
                                                                summaryMessage.awaitReactions(summaryFilter, {max: 1, time: SUMMARY_TIMER}).then(collected => {
                                                                    // if any of the reactions contains ❌ then the match is disputed 
                                                                    // else it's confirmed

                                                                    if (collected.keyArray().includes('❌')) { // disputed match by first reacter
                                                                        disputeMatch(challengeUser, acceptingUser, connection, collected.get('❌').users.last().tag, winningUser.tag)
                                                                        console.log('disputed by first reacter')
                                                                        return;
                                                                    } 
                                                                     // first reaction did not dispute
                                                                    summaryMessage.awaitReactions(summaryFilter, {max: 1, time: SUMMARY_TIMER}).then(collected => {
                                                                        if (err) throw err;

                                                                        if (collected.keyArray().includes('❌')) { // disputed match by second reacter
                                                                            disputeMatch(challengeUser, acceptingUser, connection, collected.get('❌').users.last().tag, winningUser.tag)
                                                                            console.log('disputed by second reacter')
                                                                            return;
                                                                        }
                                                                        // second reaction did not dispute
                                                                        

                                                                        updateElos(eloResult, connection, challengeUser, acceptingUser)

                                                                        recordGame(eloChange, eloResult, eloInput[2], map, connection, challengeUser, acceptingUser, timeOfChallenge)
                                                                        
                                                                        summaryMessage.clearReactions()
                                                                        summaryEmbed.fields = []
                                                                        summaryEmbed
                                                                            .addField('Winner: ',winningUser)
                                                                            .addField('ELO Change :',
                                                                                challengeUser.username + ': ' + eloResult[0] + ' (' + challengerEloChange + ')\n' +
                                                                                acceptingUser.username + ': ' + eloResult[1] + ' (' + acceptingEloChange + ')')
                                                                            .addField('Map:', map[0] + ' (' + map[1] + ')')
                                                                            .addField('Confirmed','The result of this match has been confirmed and recorded.')
                                                                        summaryMessage.edit({embed: summaryEmbed})
                                                                        
                                                                    })
                                                                    

                                                                    // console.log(collected.keyArray())
                                                                    
                                                                    // if (collected.keyArray().includes('❌')) {
                                                                    //     // match is disputed
                                                                    //     console.log('match disputed')

                                                                    //     console.log(collected.get('❌').users.last().tag)

                                                                    //     disputingUser = collected.get('❌').users.last(2)

                                                                    //     console.log(disputingUser[0] + ' ' + disputingUser[1])

                                                                    //     createDisputedGame(challengeUser.tag, connection, disputingUser.tag)

                                                                    //     summaryMessage.clearReactions()
                                                                    //     summaryEmbed.fields = []
                                                                    //     summaryEmbed
                                                                    //         .addField('Proposed Winner: ',winningUser)
                                                                    //         .addField('Disputed','The result of this match is currently in dispute, contact an admin ' +
                                                                    //             '(!admins will give you a list of the current admins) to get a ruling on this match')
                                                                    //     summaryMessage.edit({embed: summaryEmbed})
                                                                    // } else {
                                                                        
                                                                    //     updateElos(eloResult, connection, challengeUser, acceptingUser)

                                                                    //     recordGame(eloChange, eloResult, eloInput[2], map, connection, challengeUser, acceptingUser, timeOfChallenge)
                                                                        
                                                                    //     summaryMessage.clearReactions()
                                                                    //     summaryEmbed.fields = []
                                                                    //     summaryEmbed
                                                                    //         .addField('Winner: ',winningUser)
                                                                    //         .addField('ELO Change :',
                                                                    //             challengeUser.username + ': ' + eloResult[0] + ' (' + challengerEloChange + ')\n' +
                                                                    //             acceptingUser.username + ': ' + eloResult[1] + ' (' + acceptingEloChange + ')')
                                                                    //         .addField('Map:', map[0] + ' (' + map[1] + ')')
                                                                    //         .addField('Confirmed','The result of this match has been confirmed and recorded.')
                                                                    //     summaryMessage.edit({embed: summaryEmbed})
                                                                    // }
                                                                }).catch(function (err) {
                                                                    if (err) throw err;

                                                                    updateElos(eloResult, connection, challengeUser, acceptingUser)

                                                                    recordGame(eloChange, eloResult, eloInput[2], map, connection, challengeUser, acceptingUser, timeOfChallenge)
                                                                    
                                                                    summaryMessage.clearReactions()
                                                                    summaryEmbed.fields = []
                                                                    summaryEmbed
                                                                        .addField('Winner: ',winningUser)
                                                                        .addField('ELO Change :',
                                                                            challengeUser.username + ': ' + eloResult[0] + ' (' + challengerEloChange + ')\n' +
                                                                            acceptingUser.username + ': ' + eloResult[1] + ' (' + acceptingEloChange + ')')
                                                                        .addField('Map:', map[0] + ' (' + map[1] + ')')
                                                                        .addField('Confirmed','The result of this match has been confirmed and recorded.')
                                                                    summaryMessage.edit({embed: summaryEmbed})
                                                                })

                                                            // create match summary embed
                                                            // await reactions to confirm accepting or not
                                                            // add reactions as options
                                                            // update embed when match is confirmed result
                                                            // catch embed after timeout
                                                            
                                                            await summaryMessage.react('✅')
                                                            summaryMessage.react('❌')
                                                            })
                                                        }
                                                        
                                                    }).catch(function(err) {
                                                        if (err) throw err;
                                                        // timeout
                                                        connection.query('DELETE FROM active_games WHERE player1=?',[message.author.tag], function(err) {
                                                            if (err) throw err;
                                                            matchMessage.delete()
                                                        })
                                                    })
                                            
                                                await matchMessage.react('✅')
                                                matchMessage.react('❌') // await
                                                //matchMessage.react('❓') // enable this once disputed games are completed
                                            })

                                            
                                        }).catch(function(err) {
                                            // timeout
                                            connection.query('DELETE FROM open_challenges WHERE discord_id=?',[message.author.tag], function(err) {
                                                console.log('timeout - open challenge deleted')
                                                challengeMessage.delete()
                                            })
                                        }) 

                                    challengeMessage.react('✅')
                                    })
                            })
                        } else {
                            message.channel.send('You have an open challenge, please await a response to this challenge before opening another')
                        }
                    })
                } else {
                    message.channel.send('Please report on the result of your active game to open a new challenge')
                }
            })
        }
    })

    function disputeMatch(challengeUser, acceptingUser, connection, disputingUser, disputedWinner) {
        // incomplete function that will create a disputed game for admin review
        console.log('disputed game submitted by ' + disputingUser)

        connection.query('SELECT * FROM active_games WHERE player1=?',[challengeUser.tag], function(err,results) {
            console.log(results)
            let timeOfDispute = getTheTime()
            let player1=results[0].player1
            let player2=results[0].player2
            let proposedWinner = disputedWinner
            let map = results[0].map

            connection.query('INSERT INTO disputed_games ' +
                '(player1,' +
                'player2,' +
                'proposed_winner,' +
                'disputing_user,' +
                'map,' +
                'time_of_dispute)' + 
                
                ' VALUES ' +
                '(?,?,?,?,?,?)',
                
                [player1,
                player2,
                proposedWinner,
                disputingUser,
                map,
                timeOfDispute],
                
                function (err) {
                    if (err) throw err;
                    deleteFromActiveGames(challengeUser.tag, connection)
                })
        })
    }
    
    function deleteFromActiveGames(challengeUser, connection) {
        connection.query('DELETE FROM active_games WHERE player1=?',[challengeUser],function (err) {
            if (err) throw err;
        })
    }

    function recordGame(eloChange, eloResult, winner, map, connection, challengeUser, acceptingUser, timeOfChallenge) {
        // this function arranges all the data and adds it to the completed_game table, and removes the same game from the active_games table

        let dbWinner = winner
        if (dbWinner === 0) {
            dbWinner = 2
        }
        //     SCHEMA:
        //     id bigint
        //     gametype int(2)
        //     player1 char(128)
        //     player1_newelo int(5)
        //     player2 char(128)
        //     player2_newelo int(5)
        //     winner char(128)
        //     elo_change int(4)
        //     map char(2)
        //     time_of_challenge
        //     time_of_completion

        connection.query('INSERT INTO completed_games '+
        
        '(player1, '+
        'player1_newelo, '+
        'player2, '+
        'player2_newelo, '+
        'winner, '+
        'elo_change, '+
        'map, '+
        'time_of_challenge, '+
        'time_of_completion) '+
        
        'VALUES ' +
        '(?,?,?,?,?,?,?,?,?)',
        
        [challengeUser.tag,
        eloResult[0],
        acceptingUser.tag,
        eloResult[1],
        dbWinner,
        eloChange,
        map[1],
        timeOfChallenge,
        getTheTime()], 
        
        function (err) {
            if (err) throw err;
        })

        deleteFromActiveGames(challengeUser.tag, connection)
    }

    function updateElos(eloResult, connection, challengeUser, acceptingUser) {
        // uses the result of an elo calculation to update the players table
        connection.query('UPDATE players SET Elo=? WHERE discord_id=?',[eloResult[0],challengeUser.tag],function (err){
            if (err) throw err;
        })
        connection.query('UPDATE players SET Elo=? WHERE discord_id=?',[eloResult[1],acceptingUser.tag], function(err){
            if (err) throw err;
        })
    }
    
    function challengeBecomesMatch(challengingUserTag, acceptingUserTag,map) {
        // deletes the challenge in the db and adds an active game with the accepting user        
        connection.query('DELETE FROM open_challenges WHERE discord_id=?',[challengingUserTag], function(err){
            if(err) throw err;
            connection.query('INSERT INTO active_games (player1,player2,map,time_of_challenge) VALUES (?,?,?,?)', [challengingUserTag,acceptingUserTag,map,getTheTime()], function(err) {
                if(err) throw err;
            })
        })
    }

    function workOutResult(reactingUser, reaction, challengerUser) {
        // elo calculation requires a 1 or 0 to indicate whether the first player won (1) or not (0).
        
        // The user who starts the command with !open will always be considered player 1

        let winner

        if (reaction === '✅') {
            if (reactingUser.id === challengerUser.id) {
                winner = 1
            } else {
                winner = 0
            } 
        } else { // reaction === '❌'
            if (reactingUser.id === challengerUser.id) {
                winner = 0
            } else {
                winner = 1
            }
        }

        return winner
    }

        
};

function getTheTime() {
    // formats for MySQL 'DATETIME' type 
    let theTime = new Date().toISOString()
    .replace("Z","")
    .replace("T"," ");
    return theTime
}