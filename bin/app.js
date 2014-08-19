#!/app/bin/node

httpsync = require('httpsync');
mongoose = require('mongoose');
request = require('request');
async = require('async');
_ = require('underscore');


STARTING_PLAYER_ID = 578;
DBUSER = 'footiedb';
DBPASSWORD = process.env.FOOTIEVIZ_MONGO_PASSWORD
DBDATABASE = 'fantasiefootie';
PLAYER_DATA_URL = 'http://fantasy.premierleague.com/web/api/elements/';
FOOTIEVIZ_MONGO = 'mongodb://' + DBUSER + ':' + DBPASSWORD + '@ds053438.mongolab.com:53438/' + DBDATABASE;


//
//
// Wrapper function needed for Heroku
// 
function runEPLFetcher() {

  // Setup and connect to Mongolab DB
  console.log('Setting up Mongolab connection');
  mongoose.connect(FOOTIEVIZ_MONGO);
  var db = mongoose.connection;
  db.on('error', function(err) { 
    console.error('DB Connection Error: ' + err); 
    process.exit();    
  });
  db.once('open', function callback() {});


  // Define the Player mongoose schema
  var playerSchema = mongoose.Schema({
      _id: String,
      player_id: Number,
      photo: String,
      fixture_history: mongoose.Schema.Types.Mixed,
      fixtures: mongoose.Schema.Types.Mixed,
      season_history: Array,
      event_total: Number,
      type_name: String,
      team_name: String,
      selected_by: Number,
      total_points: Number,
      current_fixture: String,
      next_fixture: String,
      team_code: Number,
      team_id: Number,
      status: String,
      code: Number,
      first_name: String,
      second_name: String,
      web_name: String,
      now_cost: Number,
      chance_of_playing_this_round: String,
      chance_of_playing_next_round: String,
      value_form: Number,
      value_season: Number,
      cost_change_start: Number,
      cost_change_event: Number,
      cost_change_start_fall: Number,
      cost_change_event_fall: Number,
      in_dreamteam: Boolean,
      dreamteam_count: Number,
      selected_by_percent: Number,
      form: Number,
      transfers_out: Number,
      transfers_in: Number,
      transfers_out_event: Number,
      transfers_in_event: Number,
      event_points: Number,
      points_per_game: Number,
      ep_this: Number,
      ep_next: Number,
      special: Boolean,
      minutes: Number,
      goals_scored: Number,
      assists: Number,
      clean_sheets: Number,
      goals_conceded: Number,
      own_goals: Number,
      penalties_saved: Number,
      penalties_missed: Number,
      yellow_cards: Number,
      red_cards: Number,
      saves: Number,
      bonus: Number,
      ea_index: Number,
      bps: Number,
      element_type: Number,
      team: Number,
      current_fixture_is_home: Boolean,
      current_fixture_team_id: Number,
      last_updated: Date
  }, {collection: 'Player'});
  var Player = mongoose.model('Player', playerSchema);


  var totalPlayers = 0;
  // Get max num of players by iterating GETs until 404.  See fpl.js for details
  getMaxPlayerId(function(id) {
      totalPlayers = id;
  });

  // Create array of player IDs to loop through and grab data
  var playerIdsArray = _.range(1, totalPlayers);

  // Dispatch async workers to fetch data for each playerID in array
  async.each(playerIdsArray, function(player_id, callback) {
    var playerUrl = PLAYER_DATA_URL + player_id + '/';

    // GET player JSON from premierleague.com API
    request(playerUrl, function(error, response, body) {
      console.log('Requesting data for: ' + player_id);
      if (!error && response.statusCode == 200) {
        
        // Parse json into object
        var playerJson = JSON.parse(body);
        console.log('Received data for: ' + playerJson.id + '-' + playerJson.web_name);

        // create Player model from schema
        var Player = mongoose.model('Player', playerSchema);

        // Instantiace concrete player with data from API
        var player = new Player(playerJson);

        // create embedded data in player record
        player.fixtures.summary = playerJson.fixtures.summary;
        player.fixtures.all = playerJson.fixtures.all;
        player.fixture_history.summary = playerJson.fixture_history.summary;
        player.fixture_history.all = playerJson.fixture_history.all;
        player.player_id = player_id;
        player.last_updated = Date.now();

        // Query to find player by player_id so we can update it
        var query = { 'player_id': player.player_id };

        // Update Player record with data from API
        Player.update({player_id: player_id}, player.toObject(), {upsert: true}, 
          function(err, doc) {
            if (err)
              // log error if can't write data to database
              console.log('ERROR UPDATING : ' + player._id + ' err: ' + err);
            else {
              console.log('Updated record for: ' + player.web_name);
              callback();
            }
        }); //Player.update()
      } // if 200 && no error
    }); //request
  }, //async.each()
  function(err) {
    if(err) { 
      // One of the iterations produced an error.  
      // All processing will now stop.
      console.log('A player failed to process');
    } 
    else { 
      // No errors.  Processing done.  Close db and end process
      console.log('All players have been processed successfully');
      db.close();
      process.exit();
    } // else
  }); // function(err) end of async.each
} // runEPLFetcher()

function getMaxPlayerId(callbackFunc) {
  for (var id = STARTING_PLAYER_ID; id <= 999; id++) {
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
        process.exit();
      }
  }
}

runEPLFetcher();
// process.exit();
