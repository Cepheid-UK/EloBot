/* TEST COMMAND */

exports.run = async (client, message, args, level) => {
    const msg = await message.channel.send('Test Attempt!');
    msg.edit('Test Success');
}