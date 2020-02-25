// Allows an admin to resolve a disputed game.

const Admins = require('../util/getAdmins')
const Discord = require('discord.js')

exports.run = async (client, message, args, database, channels) => {

    if (!channels.admins.includes(message.channel.name)) return;

    let adminList = await Admins.getAdmins(database)

    // if not an admin - ignore
    if (!adminList.includes(message.author.tag)) return

    if (args.length === 0) {
        message.channel.send(`Please give the ID of a disputed match in order to make a ruling. e.g. \`\`!resolve 4\`\`.
            You can use the \`\`!disputes\`\` command to get a list of currently disputed games.`)
            return
    } else if (args.length > 1) {
        message.channel.send(`Only the first game ID will be shown, use \`\`!resolve\`\` again to show any other games that require a resolution.`)
    }

    let disputedGameQuery = await database.query({sql: `SELECT * FROM disputed_games WHERE id=${args[0]}`})
    let disputedGame = disputedGameQuery.results[0]


    let proposed_winner_tag

    if (disputedGame.proposed_winner === 1) {
        proposed_winner_tag = disputedGame.player1
    } else {
        proposed_winner_tag = disputedGame.player2
    }

    // give admin option
    let resolveEmbed = new Discord.RichEmbed()
        .setTitle(`Resolving Match ID: ${args[0]}`)
        .setDescription(`Review the information below, and any information that the players involved have given you in order to decide who should be recorded as winning the game.\n
        If Player 1 was the correct winner, react to this message with 1️⃣\n
        If Player 2 was the correct winner, react with 2️⃣\n
        If this game should be cancelled, react with 🚫`)
        .addField(`Players:`,`${disputedGame.player1}\n${disputedGame.player2}`)
        .addField(`Disputed by:`,`${disputedGame.disputing_user}`)
        .addField(`Map:`,`${disputedGame.map}`)
        .addField(`Timestamp:`,`${disputedGame.time_of_dispute}`)
        .addField(`Reported Player Won:`, `${proposed_winner_tag}`)
    
    let resolveMessage = await message.channel.send({embed: resolveEmbed})

    await resolveMessage.react(`1️⃣`)
    await resolveMessage.react(`2️⃣`)
    resolveMessage.react(`🚫`)

  };