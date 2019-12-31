/* displays the current map pool */

const Discord = require('discord.js')

exports.run = async (client, message, args, level) => {
    var embed = new Discord.RichEmbed()
        .setTitle('EloBot Ladder Map pool')
        .setDescription('Amazonia (AZ)\n'
                    +   'Concealed Hill (CH)\n'
                    +   'Echo Isles (EI)\n'
                    +   'Last Refuge (LR)\n'
                    +   'Northern Isles (NI)\n'
                    +   'Terenas Stand LV (TSLV)\n'
                    +   'Twisted Meadows (TM)')                    
        .setFooter('This message brought to you by EloBot - Created by Cepheid')
    message.author.send({embed: embed})
}