/* TOP - Returns the Top X number of players depending on the argument */

const Discord = require('discord.js')

let max = 50

exports.run = async (client, message, args, database, channels) => {

    if (!channels.users.includes(message.channel.name)) return;

    let queriedNumber

    if (args.length === 0) {
        queriedNumber = 10
    } else if (args[0] <= 50 && args[0] > 0) {
        queriedNumber = args[0]
    } else {
        message.channel.send(`Please provide a number between 1 and 50, e.g. \`\`!top 10\`\``)
    }

    let topElosQuery = await database.query({sql: `SELECT * FROM players ORDER BY elo DESC`})

    let idString = ``
    let eloString = ``

    let iterations

    if (queriedNumber > topElosQuery.results.length) {
        queriedNumber = topElosQuery.results.length
    }


    for (i=0; i<queriedNumber; i++) {
        idString = idString + `\n${topElosQuery.results[i].discord_id}`
        eloString = eloString + `\n${topElosQuery.results[i].elo}`
        
    }

    let topElosEmbed = new Discord.RichEmbed()
        .setTitle(`Top ${queriedNumber} Elos`)
        .addField(`Discord ID:`, idString, true)
        .addField(`Elo:`, eloString, true)
    
    message.channel.send({embed: topElosEmbed})
}