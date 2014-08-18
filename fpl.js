var httpSync = require('http-sync');
var httpsync = require('httpsync');

var PLAYER_DATA_URL = 'http://fantasy.premierleague.com/web/api/elements/';
var STARTING_ID = 579;

module.exports = {
    dropPlayerRecords: function(callbackFunc) {
        var dropReq = httpSync.request({
            host: 'api.mongolab.com',
            protocol: 'https',
            path: '/api/1/databases/fantasiefootie/collections/Player?apiKey=4f843c5ae4b08a2eed5f3ac9',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            port: 443,
            body: '[]',
        });

        var response = dropReq.end();
        callbackFunc(response.statusCode);
    },

    getMaxPlayerId: function(callbackFunc) {
        for (var id = STARTING_ID; id <= 999; id++) {
          console.log('trying: ' + id);
            var playerUrl = PLAYER_DATA_URL + id + '/';
            // console.log('getting: ' + playerUrl);

            var req = httpsync.get({
                url: playerUrl
            });
            var res = req.end();
            if (res.statusCode === 404) {
              console.log('Found max id: ' + id);
                callbackFunc(id);
                break;
            }
            if (res.statusCode > 300 && res.statusCode < 303)  {
              console.log('Got 300.  Site is updateding. ');
              process.kill();
            }
        }
    }
}
