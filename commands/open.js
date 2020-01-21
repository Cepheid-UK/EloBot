// command for starting an open challenge

exports.run = async (client, message, args, database) => {
    if (message.channel.name != 'elobot') return;
    
    const CHALLENGE_TIMER = 10 * 60 * 1000; // length of time an open challenge is kept open - set to 10 mins for testing
    const GAME_TIMER = 60 * 60 * 1000; // length of time an active game is kept open - set to 1 hour for testing
    const SUMMARY_TIMER = 15 * 60 * 1000; // length of time to keep the match summary up, in case match dispute resolution
    
    const {authorIsPlayer} = await database.query({sql: `SELECT * FROM players WHERE discord_id='${message.author.tag}'`})
    
    if (authorIsPlayer.length === 0) {
        message.channel.send(`Please use the \`\`!signup\`\` command to join the EloBot Ladder`)
        return
    } 

    
}