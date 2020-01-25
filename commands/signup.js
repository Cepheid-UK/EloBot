// signup for the ELO system

exports.run = async (client, message, args, database) => {

  // get row from db using the persons discord tag
  let playerExists = await database.query({sql:`SELECT * FROM players WHERE discord_id='${message.author.tag}';`})

  // if there is a row returned, player already has signed up
  if (playerExists.results.length != 0) {
    message.channel.send(`User ${message.author.tag} is already signed up to the EloBot Ladder`)
    return;
  }

  // otherwise, add them to the DB with elo = 1500
  database.query({sql: `INSERT INTO players (Elo, discord_id) VALUES (:first,:second);`, params: {first: 1500, second:message.author.tag}})
  
  // 👋
  message.reply(`Welcome to the EloBot Ladder`)
}