const Discord = require('discord.js')

exports.returnPlayer = function(connection, user) {

    connection.query('SELECT * FROM players WHERE discord_id = ?', [user], function (err, results) {
        if (err) throw err;

        if (results.length === 0) {
            // no player with that discord tag found
            console.log('false')
            return false
        } else {
            // player found
            console.log('true')
            return results[0].discord_id
        }
    })
}
