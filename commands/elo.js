/* ELO - Returns the user's current Elo rating */

const Discord = require('discord.js')

exports.run = async (client, message, args, connection) => {
    let tag = message.author.tag

    connection.query('SELECT * FROM players WHERE discord_id = ?', [tag], function (err, results) {
        if (results.length === 0) {
            message.channel.send('Please use the !signup command to register to play in the EloBot Ladder')
        } else {
            let eloEmbed = new Discord.RichEmbed()
                .addField(message.author.username, 'ELO rating: \n' + results[0].elo)
            message.channel.send({embed: eloEmbed})
        }
    })
}