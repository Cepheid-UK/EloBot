///// ----- EloBot Command Handler ----- /////

const prefix = ('!');
const Discord = require("Discord.js");
const client = new Discord.Client();
const token = require("./auth.json");
const mysql = require("mysql");

const activeChannels = ['elobot', 'elobot-admin']

// Client online
client.on("ready", () => {
    console.log("EloBot Online");
  });

// Auto-reconnect
client.on('disconnect', function(erMsg, code) {
    console.log('----- client disconnected from Discord with code', code, 'for reason:', erMsg, '-----');
    client.connect();
  });

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "sunday21",
  database: "ebdb"
});

let admins = []

connection.connect(err => {
  if(err) throw err;
  console.log("Connected to database");
  connection.query('SELECT discord_id FROM admins', function(err, results) {
    for (i in results) {
        admins.push(results[i].discord_id)
    }
  })
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
    commandFile.run(client, message, args, connection, admins);
  } catch (err) {
    console.error(err);
  }
});

// Login token
client.login(token.token);
