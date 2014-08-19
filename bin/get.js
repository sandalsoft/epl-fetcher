request = require('request');
PLAYER_DATA_URL = 'http://fantasy.premierleague.com/web/api/elements/';

var id = 576;
var tits = 0;

getMaxPlayerId(id, function(err, maxId) {
  if (err) { 
    console.log(err);
    process.exit();
  }
  else {
    console.log('max id: ' + maxId);
    tits = maxId
  }
});

console.log('tits: ' + tits);


function getMaxPlayerId(id, callback) {
  var playerUrl = PLAYER_DATA_URL + id + '/';
  request(playerUrl, function(error, res, body) {
    console.log('trying: ' + id);
    if (res.statusCode === 200) {
      console.log('got a 200 for : ' + id);
      getMaxPlayerId(id + 1, callback);
    }
    if (res.statusCode === 404) {
      console.log('got a 404 for : ' + id);
      callback(null, id);
    }
    if (res.statusCode > 300 && res.statusCode < 303)  {
      console.log('got a 300 for : ' + id);

      var error = new Error('Got 300.  Site is updateding. ');
      callback(error, null);
    }
  });
}
