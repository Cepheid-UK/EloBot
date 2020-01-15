/* INFO COMMAND */

exports.run = async (client, message, args, connection, admins) => {
    if (!admins.includes(message.author.tag)) return;
    let user

    if (!message.mentions.users.first()){
        message.channel.send('Invalid input')
        return;
    } 
    
    user = message.mentions.users.first().tag
    
    connection.query('SELECT * FROM admins WHERE discord_id=?',[user], function(err,results) {
        if (err) throw err;

        if (results.length === 0) {
            // not in the list of admins
            connection.query('INSERT INTO admins (discord_id) VALUES (?)',[user], function(err) {
                message.channel.send(`User: ${user} added to the list of admins`)
                updateAdmins()
            })
        } else {
            message.channel.send('this user is already an admin')
        }
    })

    function updateAdmins() {
        admins = []
        connection.query('SELECT discord_id FROM admins', function(err, results) {
            if (err) throw err;
            for (i in results) {
                admins.push(results[i].discord_id)
            }
          })
    }
}