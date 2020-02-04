// run this script on first install, THEN DELETE IT !!!
// if it's accidentally run after install, it will wipe the entire database back to the starting conditions.

const db_auth = require('./db_auth.json')

const { MySQL } = require("mysql-promisify")

const database = new MySQL(db_auth)

let players_drop = 
`DROP TABLE IF EXISTS players;`

let players =
`CREATE TABLE players (` +
`id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,` +
`elo int NOT NULL,` +
`discord_id char(128) NOT NULL);`

let active_games_drop =
`DROP TABLE IF EXISTS active_games;`

let active_games =
`CREATE TABLE active_games
(id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,
gametype int NOT NULL DEFAULT "1",
player1 char(128) NOT NULL,
player1_race char(128),
player2 char(128) NOT NULL,
player2_race char(128),
map char(4),
time_of_challenge datetime NOT NULL);`

let open_challenges_drop = 
`DROP TABLE IF EXISTS open_challenges;`

let open_challenges = 
`CREATE TABLE open_challenges
(id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,
gametype int NOT NULL DEFAULT "1",
discord_id char(128) NOT NULL,
time_of_challenge datetime NOT NULL);`

 let admins_drop = 
 `DROP TABLE IF EXISTS admins;`

 let admins =
 `CREATE TABLE admins
 (id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,
 discord_id char(128) NOT NULL);`

 let completed_games_drop = 
 `DROP TABLE IF EXISTS completed_games;`

 let completed_games =
 `CREATE TABLE completed_games
 (id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,
 gametype int(2) NOT NULL DEFAULT 1,
 player1 char(128) NOT NULL,
 player1_newelo int(5) NOT NULL,
 player2 char(128) NOT NULL,
 player2_newelo int(5) NOT NULL,
 winner char(128) NOT NULL,
 elo_change int(4) NOT NULL,
 map char(4) NOT NULL,
 time_of_completion DATETIME NOT NULL);`

let disputed_games_drop = 
`DROP TABLE IF EXISTS disputed_games;`

let disputed_games =
`CREATE TABLE disputed_games
(id bigint NOT NULL PRIMARY KEY AUTO_INCREMENT,
gametype int(2) NOT NULL DEFAULT 1,
player1 char(128) NOT NULL,
player2 char(128) NOT NULL,
proposed_winner char(128) NOT NULL,
disputing_user char(128) NOT NULL,
map char(4) NOT NULL,
time_of_dispute DATETIME NOT NULL);` 

buildDatabase()

async function buildDatabase() {
    await database.query({sql: `${players_drop}`})
    database.query({sql: `${players}`})

    await database.query({sql: `${active_games_drop}`})
    database.query({sql: `${active_games}`})

    await database.query({sql: `${open_challenges_drop}`})
    database.query({sql: `${open_challenges}`})

    await database.query({sql: `${admins_drop}`})
    database.query({sql: `${admins}`})

    await database.query({sql: `${completed_games_drop}`})
    database.query({sql: `${completed_games}`})

    await database.query({sql: `${disputed_games_drop}`})
    database.query({sql: `${disputed_games}`})
    return;
}