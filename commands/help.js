// Help command to show users how it works.

exports.run = async (client, message, args, database) => {

    if (message.channel.name != 'elobot') return;

    const embed = {
        "title": "EloBot Ladder",
        "description": "Hello and welcome to the EloBot ladder, hosted by me, EloBot.",
        "color": 15204219,
        "timestamp": "2020-02-12T15:54:32.736Z",
        "footer": {
          "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
          "text": "EloBot - Created by Cepheid"
        },
        "fields": [
          {
            "name": "What is this?",
            "value": "This is an ELO Ranking system, much like the type used in chess. Most MMR systems are based on ELO."
          },
          {
            "name": "What does it do?",
            "value": "It allows you to challenge other players who are signed up to the ladder, and when you report on the result of the match, will update your ELO value."
          },
          {
            "name": "How does it work?",
            "value": "You can use the following commands:```!signup``` to join the ladder.```!elo``` to see your current ELO rating. ```!open``` to start a challenge."
          },
          {
            "name": "How do challenges work?",
            "value": "When a player opens a challenge, there is a limited window where anyone who is signed up to the ladder can react with :white_check_mark: to accept the game.\n\nThis will create a match. When the players have concluded their match, they can report whether they won or lost their game. The result will be recorded and the player's ELO ratings updated."
          },
          {
            "name": "How does ELO rating work?",
            "value": "In the simplest terms, if you win, you gain points, if you lose, you lose points. If you beat someone much higher rating than you, you win much more points than if you beat someone lower than you.\n\nFor more details, see the wikipedia entry:\nhttps://en.wikipedia.org/wiki/Elo_rating_system",
          },
          {
            "name": "Who is in charge around here?",
            "value": "If you need some assistance, try the \`\`!admins\`\` command to find someone who can help.",
          }
        ]
      };
      message.channel.send({embed: embed});


}