var uuid = require("uuid");

var connect4 = {
  NOT_STARTED: 0,
  RUNNING: 1,
  GAME_OVER: 2,
  BOARD_COLS: 7,
  BOARD_ROWS: 6,
  EMPTY_FIELD: '-',
  RED: 'R',
  BLACK: 'B'
};

/*
 Game Factory that handles only one kind of games - Connect 4
 */
function gameFactory(playerName, gameContainer) {

  var newGame;
  if (gameContainer.waitingGame != null) {
    newGame = gameContainer.waitingGame;
    newGame.player2 = playerName;
    if(newGame.player1 === newGame.player2){
      throw new Error("This game requires unique player names");
    }
    //newGame.gameState = connect4.RUNNING;
    gameContainer.waitingGame = null;
    gameContainer.game = newGame;
    return newGame;
  }

  newGame = {
    player1: playerName,
    player2: null, //Set to null for a true multiplayer game
    player2IsServer : false,
    gameId: uuid.v1(),
    turn: connect4.RED,
    board: [],
    moves: [],
    moveCount: 0,
    lastMove: null,
    gameState: connect4.NOT_STARTED,    //0: not Started, 1: running, 2: Game Over
    winner: null  //Stalemate if no winner
  };

  for (var i = 0; i < connect4.BOARD_COLS; i++) {
    newGame.board[i] = [];
    for (var j = 0; j < connect4.BOARD_ROWS; j++) {
      newGame.board[i][j] = connect4.EMPTY_FIELD;
    }
  }
  gameContainer.waitingGame = newGame;
  return newGame;
}

function initServerPlayer(id,gameContainer){
  if (gameContainer.waitingGame === null) {
    throw new Error("No Waiting player, to play against server");
  }
  var newGame = gameContainer.waitingGame;
  newGame.player2 = "Server";
  newGame.player2IsServer = true;
  newGame.gameState = connect4.RUNNING;
  gameContainer.waitingGame = null;
  gameContainer.game = newGame;
  return newGame;
}
/*
Player names are given as "R" or "B"
 */
function placeToken(col, row, player, game) {
  if (game.gameState === connect4.GAME_OVER) {
    throw new Error("This game is over");
  }

  if (!game.player1 && !game.player2) {
    throw new Error("It take two to a tango ;-)");
  }

  if (player !== game.turn) {
    throw new Error("Not " + player + "'s turn");
  }


  if (game.board[col][row] !== connect4.EMPTY_FIELD) {
    throw new Error("Illegal Move - Place is taken");
  }

  for (var i = row + 1; i < connect4.BOARD_ROWS; i++) {
    if (game.board[col][i] === connect4.EMPTY_FIELD) {
      throw new Error("Illegal Move - There are empty field(s) below");
    }
  }
  game.board[col][row] = player;
  game.turn = game.turn === 'R' ? 'B' : 'R';
  game.gameState = connect4.RUNNING;
  game.moveCount++;
  game.lastMove = {col: col, row: row, player: player};
  game.moves.push(game.lastMove);

  return checkForWin(col, row, player, game);
}

function checkForWin(column, row, player, game) {
  //console.log("PLAYER: " + player + ", col: " + column + ", row: " + row);

  var i = row, in_a_row = 1;

  // Check Column Win
  while (i < connect4.BOARD_ROWS) {
    if (game.board[column][++i] === player) {
      if (++in_a_row === 4) {
        return gameOver(player, game);
      }
    }
    else {
      break;
    }
  }

  // Check Row Win
  var i = column, j = column,
    in_a_row = 1;
  while (--i >= 0) {
    if (game.board[i][row] === player) {
      in_a_row++;
    } else {
      break;
    }
    if (in_a_row >= 4) {
      return gameOver(player, game);
    }
  }

  while (++j < connect4.BOARD_COLS) {
    if (game.board[j][row] === player) {
      in_a_row++;
    } else {
      break;
    }
    if (in_a_row >= 4) {
      return gameOver(player, game);
    }
  }

  // Check Diaganol 1
  var i = column, j = column,
    ii = row, jj = row,
    in_a_row = 1;
  while (--i >= 0 && --ii >= 0) {
    if (game.board[i][ii] === player) {
      in_a_row++;
    } else {
      break;
    }
    if (in_a_row >= 4) {
      return gameOver(player, game);
    }
  }

  while (++j < connect4.BOARD_COLS && ++jj < connect4.BOARD_ROWS) {
    if (game.board[j][jj] === player) {
      in_a_row++;
    } else {
      break;
    }
    if (in_a_row >= 4) {
      return gameOver(player); //UPS - se other calls to gameOver
    }
  }

  // Check Diaganol 2
  var checkI = true, checkJ = true,
    i = column, j = column,
    ii = row, jj = row,
    in_a_row = 1;
  while (--i >= 0 && ++ii < connect4.BOARD_ROWS) {
    if (game.board[i][ii] === player) {
      in_a_row++;
    } else {
      break;
    }
    if (in_a_row >= 4) {
      return gameOver(player, game);
    }
    ;
  }

  while (++j < connect4.BOARD_COLS && --jj >= 0) {
    if (game.board[j][jj] === player) {
      in_a_row++;
    } else {
      break;
    }
    if (in_a_row >= 4) {
      return gameOver(player, game);
    }
  }

  if (game.moveCount === connect4.BOARD_COLS * connect4.BOARD_ROWS) {
    gameOver(null,game);
  }

  return game;
}

//Internal method
function gameOver(player, game) {
  game.gameState = connect4.GAME_OVER;
  if (player!== null) {
    game.winner = player === 'R' ? game.player1 : game.player2;
    return game;
  } else {
    return (game.winner = "Draw");
  }
}


function makeRandomMove(game, player) {
  if (game.moveCount === connect4.BOARD_COLS * connect4.BOARD_ROWS) {
    throw new Error("No moves possible. This game is over");
  }

  if (player !== game.turn) {
    throw new Error("Not " + player + "'s turn");
  }

  var tokenPlaced = false;
  var col;
  while (!tokenPlaced) {
    col = Math.floor(Math.random() * connect4.BOARD_COLS);
    var row = connect4.BOARD_ROWS - 1;
    //console.log("XXX: " + col);

    for (row; row >= 0; row--) {
      if (game.board[col][row] === connect4.EMPTY_FIELD) {
        game.board[col][row] = player;
        game.moveCount++;
        game.turn = game.turn === 'R' ? 'B' : 'R';
        game.lastMove = {col: col, row: row, player: player};
        game.moves.push(game.lastMove);
        tokenPlaced = true;
        break;
      }
    }
  }
  return checkForWin(col, row, player, game);
}

module.exports.connect4 = connect4;
module.exports.placeToken = placeToken;
module.exports.randomMove = makeRandomMove;
module.exports.newGame = gameFactory;
module.exports.initServerPlayer = initServerPlayer;