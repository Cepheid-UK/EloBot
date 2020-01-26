/* ELO - Returns the user's current Elo rating */

const Discord = require('discord.js')

exports.run = async (client, message, args, database) => {

    // get row from db
    let elo = await database.query({sql: `SELECT * FROM players WHERE discord_id='${message.author.tag}'`})

    // if there is no result, player isn't signed up
    if (!elo.results[0]) {
        message.channel.send('Please use the ``!signup`` command to register to play in the EloBot Ladder')
        return;
    }

    // else, create an embed with the info in and send it
    let eloEmbed = new Discord.RichEmbed()
        .addField(message.author.username, `ELO rating: \n ${elo.results[0].elo}`)
    message.channel.send({embed: eloEmbed})
}