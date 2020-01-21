/* Debug command for deleting all database entries */

exports.run = async (client, message, args, database) => {
    database.query({sql: `DELETE FROM active_games;`})
    database.query({sql: `DELETE FROM open_challenges;`})
    message.channel.send(`all active games and open challenges have been deleted`)
}