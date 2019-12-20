///// ----- StockBot Command Handler ----- /////

const prefix = ('!');
const fs = require('fs');
const Discord = require("Discord.js");
const client = new Discord.Client();
const token = require("./auth.json");

client.commands = new Discord.Collection();

// Client online
client.on("ready", () => {
    console.log("EloBot Online");
  });

// Auto-reconnect
client.on('disconnect', function(erMsg, code) {
    console.log('----- client disconnected from Discord with code', code, 'for reason:', erMsg, '-----');
    client.connect();
  });

// Initializing incoming commands
client.on("message", message => {
    if (message.author.bot) return;
    if (message.content.indexOf(prefix) !== 0) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift();

  try {
    let commandFile = require(`./commands/${command}.js`);
    commandFile.run(client, message, args);
  } catch (err) {
    console.error(err);
  }
});

// Login token
client.login(token.token);