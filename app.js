var mongoose = require('mongoose');
var request = require('request');
var fpl = require('./fpl');
var async = require('async');
var _ = require('underscore');

var dbUser = 'footiedb';
var dbPassword = process.env.FOOTIEVIZ_MONGO_PASSWORD
var dbDatabase = 'fantasiefootie';

var PLAYER_DATA_URL = 'http://fantasy.premierleague.com/web/api/elements/';
var FOOTIEVIZ_MONGO = 'mongodb://' + dbUser + ':' + dbPassword + '@ds053438.mongolab.com:53438/' + dbDatabase;

console.log('Setting up Mongolab connection');

mongoose.connect(FOOTIEVIZ_MONGO);
var db = mongoose.connection;
db.on('error', function(err) { 
  console.error('DB Connection Error: ' + err); 
  process.kill();    
});


db.once('open', function callback() {});

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

fpl.getMaxPlayerId(function(id) {
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
}, function(err) {
 if( err ) {
      // One of the iterations produced an error.  All processing will now stop.
      console.log('A player failed to process');
    } else {
      // No errors.  Processing done.  Close db and end process
      console.log('All players have been processed successfully');
      db.close();
      process.kill();
    }
}); // function(err) end of async.each
 

