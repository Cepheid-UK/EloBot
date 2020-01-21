// signup for the ELO system

exports.run = async (client, message, args, database) => {

  let playerExists = await database.query({sql:`SELECT * FROM players WHERE discord_id='${message.author.tag}';`})

  if (playerExists.results.length != 0) {
    message.channel.send(`User ${message.author.tag} is already signed up to the EloBot Ladder`)
    return;
  }

  database.query({sql: `INSERT INTO players (Elo, discord_id) VALUES (:first,:second);`, params: {first: 1500, second:message.author.tag}})
  
  message.reply(`Welcome to the EloBot Ladder`)
}