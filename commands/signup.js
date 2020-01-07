// signup for the ELO system

exports.run = (client, message, args, dbConnection) => {
    
  var discordUser = message.author.tag

  // build sql query string
  var sql = 'SELECT * FROM players WHERE discord_id=\'' + discordUser + '\''// WHERE discord_id LIKE' + discordUserQuery
  var queryResult;

  // query DB for discord_id matching an existing record
    dbConnection.query(sql, function (err, result) {
      if (err) throw err;
      queryResult = result
      

      if (queryResult.length === 0) { // if the result from the query contains no values
        message.reply(`Welcome to the EloBot ladder`);
        
        // build sql for inserting player into DB
        var sqlInsert = 'INSERT INTO players (Elo, Discord_Id) VALUES (1500,';
        sqlInsert += '\'' + discordUser + '\')'

        dbConnection.query(sqlInsert) // add player to DB
      } else {
        message.channel.send(`You are already signed up to the EloBot Ladder`)
      }
    })
  };