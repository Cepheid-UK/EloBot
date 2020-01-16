/* INFO COMMAND */

exports.run = async (client, message, args, connection) => {

    if (message.channel.name != 'elobot-admin') return;

    let admins = []

    connection.query('SELECT * FROM admins',function(err,results){
        if (err) throw err;

        for (i in results) {
            admins.push(results[i].discord_id)
        }

        if (!admins.includes(message.author.tag)) return;
        
        if (message.mentions.members.array()[0] === undefined) {
            message.channel.send('Invalid input')
        } else {
            let user = message.mentions.users.first().tag
            connection.query('SELECT * FROM admins WHERE discord_id=?',[user], function(err,results) {
        
                if (results.length === 0) {
                    // not in the list of admins
                    connection.query('INSERT INTO admins (discord_id) VALUES (?)',[user], function(err) {
                        message.channel.send(`User: ${user} added to the list of admins`)
                    })
                } else {
                    // already an admin
                    message.channel.send('this user is already an admin')
                }
            })
        }
    })
}