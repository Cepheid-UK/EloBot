///// ----- EloBot Command Handler ----- /////

const prefix = ('!');
const Discord = require("discord.js");
const client = new Discord.Client();
const token = require("./auth.json");
const { MySQL } = require("mysql-promisify")
const db_auth = require('./db_auth.json')


// channel handling
const activeChannels = ['elobot', 'elobot-admin']

const channels = {}

channels.admins = []
channels.admins.push('elobot-admin')
channels.users = []
channels.users.push('elobot')

const database = new MySQL(db_auth)

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
    if (!activeChannels.includes(message.channel.name)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift();

  try {
    let commandFile = require(`./commands/${command}.js`);
    commandFile.run(client, message, args, database, channels);
  } catch (err) {
    console.error(err);
  }
});

// Login token
client.login(token.token);
