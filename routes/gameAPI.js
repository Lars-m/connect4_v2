var express = require('express');
var router = express.Router();
var gameApi = require("../gameUtils/gameFactory");

var sillyGlobalGameContainer = {
  waitingGame: null,
  game: null
}

/*
Request a new game.
Still hardcode to handle only one game at any time
 */
router.post("/newgame", function (req, res, next) {
  var playerObj = req.body;
  if(sillyGlobalGameContainer.game != null && sillyGlobalGameContainer.waitingGame === null){
    sillyGlobalGameContainer = {
      waitingGame: null,
      game: null
    }
  }
  res.json(gameApi.newGame(playerObj.playerName, sillyGlobalGameContainer));
});

/*
Get an opponent to start a multiplayer game
When an opponent is found, this is use to probe for an opponents move
 */
router.get("/opponent/:id", function (req, res, next) {
  var gameId = req.body.id;
  if (sillyGlobalGameContainer.game) {
    return res.json(sillyGlobalGameContainer.game)
  }
  res.json(null);
});

/*
Used to setup the Server as the opponent
 */
router.post("/init_computer_opponent", function (req, res, next) {
  var obj = req.body;
  res.json(gameApi.initServerPlayer(obj.id, sillyGlobalGameContainer));
});


/*
Get a move performed by the server. Used when Server is selected as the opponent
 */
router.put("/computerMove", function (req, res, next) {
  var obj = req.body;
  var gameId = obj.gameId;
  var game = sillyGlobalGameContainer.game;
  game = gameApi.randomMove(game, 'B'); //Computer is always black
  res.json(game);
});

/*
Perform a move on the current game
 */
router.put("/move", function (req, res, next) {
  var move = req.body;
  //gameId is sent with the request, but not used in this simple "one game" version
  var game = sillyGlobalGameContainer.game;
  game = gameApi.placeToken(move.col, move.row, move.player, game);
  res.json(game);
});

module.exports = router;