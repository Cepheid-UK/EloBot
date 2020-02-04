/* displays the current map pool */

const Discord = require('discord.js')

exports.run = async (client, message, args, database) => {

    let mapQuery = await database.query({sql: `SELECT * FROM mappool;`})

    let maps = []

    for (i in mapQuery.results) {
        maps.push([mapQuery.results[i].name, mapQuery.results[i].abbreviation])
    }

    var mapEmbed = new Discord.RichEmbed()
        .setTitle('EloBot Ladder Map pool')
        .setFooter('This message brought to you by EloBot - Created by Cepheid')

    let mapstring = ``
    
    for (i in maps) {
        mapstring += `${maps[i][0]} (${maps[i][1]})\n`
    }

    mapEmbed.setDescription(mapstring)
    
    message.channel.send({embed: mapEmbed})
}