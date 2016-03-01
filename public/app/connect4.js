angular.module('connect4', [])

  .controller('connect4', function ($scope, $timeout, $http) {
    var RED = 'R', BLACK = 'B', MOVES = 0, FREE = '-',
      boardWidth = 7, boardHeight = 6,
      tokenIndex = 0, IN_DROP = false;

    var game;  //Refactor into a service

    $scope.username = ""   // Current players user name
    $scope.yourColor = ""; // Current Player as "R" or "B"
    $scope.opponent = null; // Opponent players user name
    $scope.gameRegistered = false; // Game is registered on the server
    $scope.gameStatus = {
      running: false,
      opponent: 0  // 0 = none, 1 = human, 2 = server
    };

    function setGameStatus(running, op,opponent) {
      $scope.gameStatus.running = running;
      $scope.gameStatus.opponent = op;
      $scope.opponent = opponent;
      $scope.error = null;
    };


    function initPlayerDetails(game) {
      var opponent = game.player1 === $scope.username ? game.player2 : game.player1;
      $scope.yourColor = game.player1 === $scope.username ? "R" : "B";
      setGameStatus(true, 1,opponent);
    }

    function updateVariables(response) {
      $scope.error = null;
      game = response.data;
      $scope.board = game.board;
      $scope.turn = game.turn;
      $scope.winner = game.winner;
      if($scope.winner){
        $scope.gameRegistered = false;
      }
    }

    $scope.newGame = function () {
      MOVES = 0, tokenIndex = 0;
      var user = {playerName: $scope.username};
      $scope.yourColor = 'R';
      setGameStatus(false, 0,null);
      $http({method: "POST", url: "/gameapi/newgame", data: user}).then(function ok(response) {
        $scope.gameRegistered = true;
        updateVariables(response);
        if (game.player1 && game.player2) {
          initPlayerDetails(game);
        }

      }, function err(response) {
        console.log("Error: " + response.status + ", " + response.statusText);
        $scope.error = response.data.error.message;
      });
    }
    function updateBoardWithRemoteMove(gameFromServer) {
      game = gameFromServer;
      //We don't use the updated board from the server. Only the lastMove and winner status is used
      //This is done, to get the animation of the opponent piece being placed.
      $scope.winner = game.winner;
      if($scope.winner){
        $scope.gameRegistered = false;
      }
      $scope.placeToken(game.lastMove.col, true);
    }

    $scope.getOpponent = function () {
      if (!game) {
        $scope.error = "You must request a new game";
        return;
      }
      $http.get("/gameapi/opponent/" + game.gameId).then(function ok(res) {
        $scope.error = null;
        if (res.data !== null) {
          var gameFromServer = res.data;

          if (gameFromServer.gameState >= 1 && gameFromServer.moves.length !== game.moves.length) {
            updateBoardWithRemoteMove(gameFromServer);
            return;
          }
          game = res.data;
          initPlayerDetails(game);
        }
        else{
          $scope.error = "No opponent found";
        }
      },function err(res){
        $scope.error = response.data.error.message;
      })
    }

    function sendMoveToServer(col, row, player) {
      moveData = {"gameId": game.gameId, "row": row, "col": col, "player": player};
      $http({method: "PUT", url: "/gameapi/move", data: moveData}).then(function ok(response) {
        updateVariables(response);
        //Get move from server, if player2 is Server
        if (!game.winner && $scope.gameStatus.opponent === 2) {
          $timeout(function () {
            $scope.getServerMove();
          }, 500);
        }
      }, function err(response) {
        console.log("Error: " + response.status + ", " + response.statusText);
        $scope.error = response.data.error.message;
      });
    }

    $scope.initComputerGame = function () {
      $http({
        method: "POST",
        url: "/gameapi/init_computer_opponent",
        data: {id: game.gameId}
      }).then(function ok(response) {
        game = response.data;
        setGameStatus(true, 2,response.data.player2);
      }, function err(response) {
        $scope.error = response.data.error.message;
      });
    }

    $scope.getServerMove = function () {
      $http({method: "PUT", url: "/gameapi/computerMove", data: {id: game.gameId}}).then(function ok(response) {
        game = response.data;
        updateBoardWithRemoteMove(game);
      }, function err(response) {
        $scope.error = response.data.error.message;
      });
    }

    $scope.setStyling = function (value) {
      if (value === 'R') {
        return {"backgroundColor": "#FF0000"};
      }
      else if (value === 'B') {
        return {"backgroundColor": "#000000"};
      }
      return {"backgroundColor": "white"};
    }

    $scope.placeToken = function (column, remoteMove) {
      $scope.error = null;
      if ($scope.winner != null && remoteMove === undefined) {
        return;
      }
      if ((remoteMove === undefined) && (game.turn !== $scope.yourColor)) {
        $scope.error = "Not your turn to move";
        return;
      }
      if (game !== undefined && (game.player1 === null || game.player2 === null )) {
        $scope.error = "No opponent found for this game";
        return;
      }
      if (!IN_DROP && $scope.board[column][0] === FREE) {
        MOVES++;
        tokenIndex = 0;
        $scope.board[column][tokenIndex] = $scope.turn;
        IN_DROP = true;
        dropToken(column, $scope.turn, remoteMove);
        $scope.turn = $scope.turn === 'R' ? 'B' : 'R';
      }
    }

    function dropToken(column, player, remoteMove) {

      if ($scope.board[column][tokenIndex + 1] === FREE) {
        $timeout(function () {
          $scope.board[column][tokenIndex] = FREE;
          $scope.board[column][++tokenIndex] = player;
          dropToken(column, player, remoteMove);

        }, 75);
      } else {
        console.log(column + ", " + tokenIndex);
        if (remoteMove === undefined || undefined) {
          sendMoveToServer(column, tokenIndex, player);
        }
        IN_DROP = false;
      }
    }
  });