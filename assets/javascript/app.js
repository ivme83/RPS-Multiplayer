// Pseudo Code
// wait for new connection 
// first connection assign player1 
// second connection assign player2 
// stop listening for connections 

// user makes choice (rock, paper, scissor) 
// saves choice to appropriate database player variable (player1-choice, player2-choice)

// Put player choices through game logic to decide win, lose, or draw state for each player
// Draw appropriate game state to each player

// Initialize Firebase
var config = {
  apiKey: "AIzaSyAfQxyxV-KRsofKTKYrYHBllxhakdN0bIU",
  authDomain: "bootcamp-working.firebaseapp.com",
  databaseURL: "https://bootcamp-working.firebaseio.com",
  projectId: "bootcamp-working",
  storageBucket: "bootcamp-working.appspot.com",
  messagingSenderId: "448040618134"
};

firebase.initializeApp(config);

var database = firebase.database();

var gameRef = database.ref("/game");

// ---------------------------------------
function go() {
  var userId = prompt('Username?', 'Guest');
  // Consider adding '/<unique id>' if you have multiple games.
  assignPlayerNumberAndPlayGame(userId, gameRef);
};

// The maximum number of players.  If there are already 
// NUM_PLAYERS assigned, users won't be able to join the game.
var NUM_PLAYERS = 2;

// A location under GAME_LOCATION that will store the list of 
// players who have joined the game (up to MAX_PLAYERS).
var PLAYERS_LOCATION = 'player_list';

// A location under GAME_LOCATION that you will use to store data 
// for each player (their game state, etc.)
var PLAYER_DATA_LOCATION = 'player_data';

var playerDataRef;
var opDataRef;
var allPlayersRef;
var playerListRef;

// Called after player assignment completes.
function playGame(myPlayerNumber, userId, justJoinedGame, gameRef) {
  playerDataRef = gameRef.child(PLAYER_DATA_LOCATION).child(myPlayerNumber);
  
  allPlayersRef = gameRef.child(PLAYER_DATA_LOCATION);
  //alert('You are player number ' + myPlayerNumber + 
  //    '.  Your data will be located at ' + playerDataRef.toString());

  if (justJoinedGame) {
    //alert('Doing first-time initialization of data.');
    playerDataRef.set({userId: userId, state: 'start', rps: 'none'});
  }

  var opponent = myPlayerNumber === 0 ? 1 : 0;
  opDataRef = gameRef.child(PLAYER_DATA_LOCATION).child(opponent);
  console.log(opDataRef);
  
  
  allPlayersRef.on("value", function(snapshot){
    var playerID = snapshot.val()[myPlayerNumber].userId;
    var opID = snapshot.val()[opponent].userID;
    var state1 = snapshot.val()[myPlayerNumber].state;
    var state2 = snapshot.val()[opponent].state;
    var myRPS = snapshot.val()[myPlayerNumber].rps;
    var opRPS = snapshot.val()[opponent].rps;
    
    $("#player-body").text(myRPS);   
    $("#op-body").text(opRPS);
    
    if (snapshot.val().length === 2 && state1 === "start" && state2 === "start"){
      $("#rock-btn").on("click", function(){
        playerDataRef.set({userId: playerID, state:"done", rps:"rock"})

      });

      $("#paper-btn").on("click", function(){
        playerDataRef.set({userId: playerID, state:"done", rps:"paper"})
        $("#player-body").text("paper");     
      });

      $("#scissor-btn").on("click", function(){
        playerDataRef.set({userId: playerID, state:"done", rps:"scissor"})
        $("#player-body").text("scissor");  
           
      });
    }

    if (snapshot.val().length === 2 && state1 === "done" && state2 === "done"){
      switch(myRPS) {
        case "rock":
          switch(opRPS) {
            case "rock":
              playerDataRef.set({userId: playerID, state:"draw", rps: myRPS});
              break;
            case "paper":
              playerDataRef.set({userId: playerID, state:"lose", rps: myRPS});
              break;
            case "scissor":
              playerDataRef.set({userId: playerID, state:"win", rps: myRPS});
              break;
          }
          break;
        case "paper":
          switch(opRPS) {
            case "rock":
              playerDataRef.set({userId: playerID, state:"win", rps: myRPS});
              break;
            case "paper":
              playerDataRef.set({userId: playerID, state:"draw", rps: myRPS});
              break;
            case "scissor":
              playerDataRef.set({userId: playerID, state:"lose", rps: myRPS});
              break;
          }
          break;
        case "scissor":
          switch(opRPS) {
            case "rock":
              playerDataRef.set({userId: playerID, state:"lose", rps: myRPS});
              break;
            case "paper":
              playerDataRef.set({userId: playerID, state:"win", rps: myRPS});
              break;
            case "scissor":
              playerDataRef.set({userId: playerID, state:"draw", rps: myRPS});
              break;
          }
          break;
      }
    }

    if (state1 === "win" || state1 === "lose" || state1 === "draw") {
      $("#results-body").html("<p>" + state1 + "</p>");
      var btn = $("<button>");
      btn.addClass("btn btn-primary");
      btn.attr("id", "reset-btn");
      btn.text("Reset");
      $("#results-body").append(btn);
    }

    $("#reset-btn").on("click", function() {
      playerDataRef.set({userId: playerID, state: "start", rps: "none"});
      $("#player-body").empty();
      $("#results-body").empty();
      $("#op-body").empty();

    });


 
  });


  playerDataRef.onDisconnect().remove();
  playerListRef.onDisconnect().remove();
}

// Use transaction() to assign a player number, then call playGame().
function assignPlayerNumberAndPlayGame(userId, gameRef) {
  playerListRef = gameRef.child(PLAYERS_LOCATION);
  var myPlayerNumber, alreadyInGame = false;

  playerListRef.transaction(function(playerList) {
    // Attempt to (re)join the given game. Notes:
    //
    // 1. Upon very first call, playerList will likely appear null (even if the
    // list isn't empty), since Firebase runs the update function optimistically
    // before it receives any data.
    // 2. The list is assumed not to have any gaps (once a player joins, they 
    // don't leave).
    // 3. Our update function sets some external variables but doesn't act on
    // them until the completion callback, since the update function may be
    // called multiple times with different data.
    if (playerList === null) {
      playerList = [];
    }

    for (var i = 0; i < playerList.length; i++) {
      if (playerList[i] === userId) {
        // Already seated so abort transaction to not unnecessarily update playerList.
        alreadyInGame = true;
        myPlayerNumber = i; // Tell completion callback which seat we have.
        return;
      }
    }

    if (i < NUM_PLAYERS) {
      // Empty seat is available so grab it and attempt to commit modified playerList.
      playerList[i] = userId;  // Reserve our seat.
      myPlayerNumber = i; // Tell completion callback which seat we reserved.
      return playerList;
    }

    // Abort transaction and tell completion callback we failed to join.
    myPlayerNumber = null;
  }, function (error, committed) {
    // Transaction has completed.  Check if it succeeded or we were already in
    // the game and so it was aborted.
    if (committed || alreadyInGame) {
      playGame(myPlayerNumber, userId, !alreadyInGame, gameRef);
    } else {
      alert('Game is full.  Can\'t join. :-(');
    }
  });
}

go();