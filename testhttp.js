/* TEST COMMAND */

const request = require('request')
const cheerio = require('cheerio')

var realmUrls = {
    USW: 'http://classic.battle.net/war3/ladder/w3xp-player-profile.aspx?Gateway=Lordaeron&playername=',
    USE: 'http://classic.battle.net/war3/ladder/W3XP-player-profile.aspx?Gateway=Azeroth&playername=',
    EU: 'http://classic.battle.net/war3/ladder/w3xp-player-profile.aspx?Gateway=Northrend&playername=',
    ASIA: 'http://asialadders.battle.net/war3/ladder/W3XP-player-profile.aspx?Gateway=Kalimdor&playername='
};

var playerName = 'cepheid';

loopThroughUrls(realmUrls);

function loopThroughUrls(realmUrls) {
        for (var realm in realmUrls) {
            var url = realmUrls[realm] + playerName
            getUrls(url) // callback to ensure the loop doesnt skip this
        }
    }

    function getUrls(url) {
        request({
            url: url,
            json: false
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    
                    var $ = cheerio.load(body, {
                        normalizeWhitespace: true,
                        xmlMode: true
                    });
                    
                    // do all the HTML querying here

                    var rankingData = $('.rankingData').html();
                    
                    var r = /\=(.*?)\&/
                    var realmName = url.match(r)[1]

                    if (rankingData != null) {
                        // player found on this realm
                        checkSolo = $('.header4').text().match(/Solo/);
                        if (checkSolo != null) {
                            // this player has a solo record
                            console.log('This account has a solo record on ' + realmName)
                            var wins = $('.rankingData').parent().parent().parent().text().toString()
                            console.log(wins);
                        } else {
                            // this player has no solo record
                            console.log('There is an account without a solo record found on ' + realmName)
                        }
                        //console.log(context.next().html());
                    } else {
                        // player not found on this realm
                    }
                }

            }
        )
};
    