// command for starting an open challenge

// DB has 4 columns:
//    - id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,
//    - gametype int NOT NULL DEFAULT "1",
//    - discord_id char(128) NOT NULL,
//    - time_of_challenge datetime NOT NULL);

const Discord = require('discord.js')

exports.run = (client, message, args, connection) => {
    
    var TIMER = 1 * 10 * 1000; // 30 minutes in milliseconds - set to 5 sec for testing

    var gametype = 1;
    var discord_id = message.author.tag;
    var datetime = new Date();
    var time_of_challenge = datetime.toISOString();
    
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
            connection.query(sql_challenge, function (err, result) {
                if (err) throw err;
                var queryResult2 = result;
                
                // then check if the player has any open challenges
                if (queryResult2.length === 0) {
                    // no active games and no open challenges - create a new one
                    var sql_createOpenChallenge = 'INSERT INTO open_challenges (discord_id,time_of_challenge) VALUES (\'' + discord_id + '\',\'' + time_of_challenge + '\');'
                    // submit the query
                    connection.query(sql_createOpenChallenge, function (err, result) {
                        if (err) throw err;
                        console.log('Open challenge created by ' + discord_id)

                        var embed = new Discord.RichEmbed()
                            .setColor('#0099ff')
                            .setTitle('Open Challenge')
                            .setDescription('An open challenge has been issued by **' + discord_id + '** please react with :white_check_mark: if you wish to accept this open challenge')
                            .setFooter('This message brought to you by EloBot - Created by Cepheid#6411')
                        
                        message.channel.send({embed}).then(sent => {                            
                            sent.react('✅')
                                .then(sent.awaitReactions((reaction, user) => user.id != sent.author.id && reaction.emoji.name == '✅' && user.tag != discord_id,
                                    {max : 1, time: TIMER}).then(collected => {                               

                                        var acceptingUser = collected.last().users.last()
                                        var openUser = message.author

                                        var map;

                                        // select a number between 1-8 for the map
                                        sql_mapSelection = 'SELECT * FROM mappool WHERE id=' + Math.floor(Math.random()*8+1)
                                        console.log(sql_mapSelection)

                                        connection.query(sql_mapSelection, async function (err, result) {
                                            if (err) throw err;
                                            map = [result[0].name,result[0].abbreviation]
                                            console.log(map)

                                            var activeGameEmbed = new Discord.RichEmbed()
                                            .setColor('#0099ff')
                                            .setTitle('Match')
                                            .setDescription(' **' + openUser + '** Vs **' + acceptingUser +'**')
                                            .setFooter('This message brought to you by EloBot - Created by Cepheid')
                                            .addField('Map:', map[0] + ' (' + map[1] + ')')

                                            sent.channel.send({embed: activeGameEmbed}).then(matchSent => {
                                                matchSent.react('✅').then(matchSent.react('❌'))
                                                    .then(matchSent.awaitReactions((reaction, user) => user.id != matchSent.author.id && (reaction.emoji.name == '✅' || reaction.emoji.name == '❌'),
                                                    {max: 1, time: TIMER}).then(collectedMatch => {
                                                        
                                                        // the player who has reacted
                                                        var reportingUser = collectedMatch.last().users.last().tag

                                                        // create an array of the participating players 
                                                        var participatingPlayers = [openUser.tag, acceptingUser.tag]
                                                 
                                                        console.log(participatingPlayers[0].toString())
                                                        console.log(reportingUser)

                                                        // check to see if the person reacting is one of those players
                                                        
                                                        if (reportingUser == openUser.tag || reportingUser == acceptingUser.tag) {
                                                            // If you get here, it means one of the participating players has pressed ✅ or ❌ on the match embed. (Hopefully!)
                                                            var sql_deleteActiveGamesFromMatchEmbed = 'DELETE FROM active_games WHERE player1=\'' + openUser + '\''
                                                            connection.query(sql_deleteActiveGamesFromMatchEmbed, function (err, results) {
                                                                if (err) throw err;
                                                                console.log('Match concluded');
                                                                matchSent.channel.send('Match concluded');
                                                                })
                                                            }
                                                        
                                                        

                                                        // Build SQL query to delete the record from the active_games table
                                                        // push the query.

                                                        // call Elo calculation function here
                                                        // Build SQL query here to update player table
                                                        // push the query.

                                                        // build SQL query to update completed_games table, including elo change and winner/loser
                                                        matchSent.delete()
                                                    }))
                                                })
                                            sent.delete()
                                            })

                                        // create sql to add to active games
                                        var player1 = openUser.tag
                                        var player2 = acceptingUser.tag
                                        var activeTime = new Date().toISOString()
                                        activeTime = activeTime.replace("Z","");
                                        activeTime = activeTime.replace("T"," ");
                                        var sql_createActiveGame = 'INSERT INTO active_games (player1, player2, time_of_challenge) VALUES (\'' + player1 + '\',\'' + player2 + '\',\'' + activeTime + '\');'
                                        console.log(sql_createActiveGame)
                                        connection.query(sql_createActiveGame, function (err, results) {
                                            console.log('active game created')
                                        })
                                        
                                        // ---------------------- debugging ----------------------
                                        var sql_deleteActiveGames = 'DELETE FROM active_games;'
                                        var sql_deleteOpenChallenge = 'DELETE FROM open_challenges;'
                                        connection.query(sql_deleteOpenChallenge, function (err, results) {
                                            console.log('open_challenge table data deleted')
                                            })                                        
                                        // ---------------------- debugging end ------------------
                                        } 
                                    )              
                                )
                            })
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
