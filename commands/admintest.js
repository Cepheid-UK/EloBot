/* Test admin command */

exports.run = async (client, message, args, connection, admins) => {
    if (admins.includes(message.author.tag)) {
        message.channel.send('You are an admin')
    } else {
        message.channel.send('You do not have permissions')
    }
}