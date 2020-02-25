/* MOD COMMAND */

// syntax: "!mod @Cepheid"
// will take the tag of a mentioned user and add them to the database if they are not already a member. Only executable in 'elobot-admin'

exports.run = async (client, message, args, database, channels) => {

    if (!channels.admins.includes(message.channel.name)) return;

    let admins = []

    let adminResults = await database.query({sql: `SELECT * FROM admins`})

    for (i in adminResults.results) {
        admins.push(adminResults.results[i].discord_id)
    }

    if (!admins.includes(message.author.tag)) return // not an admin

    if (message.mentions.members.array()[0] === undefined) {
        message.channel.send('Invalid input, please tag a valid user to mod')
    } else {
        let user = message.mentions.users.first()
        if (admins.includes(user.tag)) {
            message.channel.send('This user is already an admin')
        } else {
            database.query({sql: `INSERT INTO admins (discord_id) VALUES ('${user.tag}')`})
            message.channel.send(`User: ${user} added to the list of admins`)
        }
    }
}