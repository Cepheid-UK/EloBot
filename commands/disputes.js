/* Shows disputed games for admins only */

const Discord = require('discord.js')

exports.run = async (client, message, args, database, channels) => {

    if (!channels.admins.includes(message.channel.name)) return;

    let adminList = await getAdmins(database)

    // if not an admin - ignore
    if (!adminList.includes(message.author.tag)) return

    // if not in the admin channel
    if (!message.channel.name === `elobot-admin`) return

    // collect all the disputes from the database
    let disputesQuery = await database.query({sql: `SELECT * FROM disputed_games`})
    let disputes = [];

    for (i in disputesQuery.results) {

        
        let id = disputesQuery.results[i].id
        let player1 = disputesQuery.results[i].player1
        let player2 = disputesQuery.results[i].player2
        let disputedBy = disputesQuery.results[i].disputing_user
        let map = disputesQuery.results[i].map
        let timestamp = disputesQuery.results[i].time_of_dispute
        let reportedWinner = disputesQuery.results[i].proposed_winner

        disputes.push(new Dispute(id, player1, player2, disputedBy, map, timestamp, reportedWinner))
    }

    // create an embed to show them all
    disputesEmbed = new Discord.RichEmbed()
        .setTitle(`Disputed Games`)
        .setDescription(`Listed below are all the games that have been disputed by players, use the command \`\`!resolve [id]\`\` (e.g. \`\`!resolve 5\`\`) command to be given an option for how to resolve the dispute.`)
        .setFooter(`This message brought to you by EloBot - Created by Cepheid`)
        .setTimestamp()
    
    for (i in disputes) {

        if (i === 10) {
            message.channel.send(`Resolve some of the disputes above to make space for additional disptues to be shown`)
            return
        }

        let dispute = disputes[i]

        dispute.timestamp

        disputesEmbed.addField(`**__ID:__ ${dispute.id}**`,`
            Player 1: ${dispute.player1}
            Player 2: ${dispute.player2}
            Disputer: ${dispute.disputedBy}
            Map: ${dispute.map}
            Time: ${dispute.timestamp}
            Reported Player winner: ${dispute.reportedWinner}`)
    }

    message.channel.send({embed: disputesEmbed})

}

class Dispute {
    constructor (id, player1, player2, disputedBy, map, timestamp, reportedWinner) {
        this.id = id
        this.player1 = player1
        this.player2 = player2
        this.disputedBy = disputedBy
        this.map = map
        this.timestamp = timestamp
        this.reportedWinner = reportedWinner
    }
}

async function getAdmins(database) {

    let admins = []

    let adminResults = await database.query({sql: `SELECT * FROM admins`})

    for (i in adminResults.results) {
        admins.push(adminResults.results[i].discord_id)
    }

    return admins

}