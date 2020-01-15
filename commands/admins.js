/* Test admin command */

const Discord = require('discord.js')

exports.run = async (client, message, args, connection, admins) => {

    adminsEmbed = new Discord.RichEmbed()
        .setTitle('EloBot Ladder Admins:')
    
    let adminsString = admins[0]
        
    for (i in admins) {
        if (i>0) {
            adminsString = adminsString + '\n' + admins[i]
        }
    }

    adminsEmbed.setDescription(adminsString)
    
    message.channel.send({embed: adminsEmbed})
}