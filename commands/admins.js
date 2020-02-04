/* Test admin command */

const Discord = require('discord.js')

exports.run = async (client, message, args, database) => {

    let admins = []

    let adminResults = await database.query({sql: `SELECT * FROM admins`})

    for (i in adminResults.results) {
        admins.push(adminResults.results[i].discord_id)
    }

    let adminsString = admins[0]
        
    for (i in admins) {
        if (i>0) {
            adminsString = adminsString + '\n' + admins[i]
        }
    }

    adminsEmbed = new Discord.RichEmbed()
        .setTitle('EloBot Ladder Admins:')
        .setDescription(adminsString)
        
    message.channel.send({embed: adminsEmbed})
}