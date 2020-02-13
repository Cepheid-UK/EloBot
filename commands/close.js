// signup for the ELO system

exports.run = async (client, message, args, database) => {

    if (message.channel.name != 'elobot') return;
    
    let isOpenResults = await database.query({sql: `SELECT * FROM open_challenges WHERE discord_id='${message.author.tag}'`})

    if (isOpenResults.results[0] === undefined) {
        message.reply(`You do not have any open challenges`)
    } else {
        await database.query({sql: `DELETE FROM open_challenges WHERE discord_id='${message.author.tag}'`})
        message.channel.send(`The open challenge has been withdrawn`)
    }
}