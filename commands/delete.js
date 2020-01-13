/* Debug command for deleting all database entries */

exports.run = async (client, message, args, connection) => {
    connection.query('DELETE FROM active_games', function (err, results) {
        if (err) throw err;
        connection.query('DELETE FROM open_challenges;', function (err, results) {
            if (err) throw err;
            console.log('tables: active_games and open_challenges have been wiped')
            message.channel.send('active games and open challenges have been wiped')
        })
        
    })
}