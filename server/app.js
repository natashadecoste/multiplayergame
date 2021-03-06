const express = require("express");
const path = require("path");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const app = express();
const PORT = 8080;
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);

const worldWidth = 1000;
const worldHeight = 1000;
const totalPos = worldHeight * worldHeight;
const map = [
  { x: 856, y: 800, width: 190, height: 180, png: 0, type: "island" , radius: 40},
  { x: 566, y: 480, width: 190, height: 200, png: 0, type: "island" , radius: 40},
  { x: 45, y: 880, width: 200 , height: 200, png: 2, type: "island" , radius:40}
]; // for the islands


var coinCount = 0;
var enemyCount = 0;

// A hashmap to keep track of all the objects on canvas 
// the key:value pair for this object will be 'x,y':type
// Add a new entity: coors.set('300,600' , 'player') or
//                   coors.set(test.str , 'player')
// Get type: coors.get('300,600')
var coors = new Map();

var scores = [0,0,0,0];
var scoresSort = new Array();
var scount = 0;
function popScores(){
  //Populate score list with all scores
  scount = 0;
  for (let player in gameState.players) {
    scores[scount] = gameState.players[player].score;
    scount += 1;
  }
  //Sort this list in a new list
  scoresSort = scores.slice(0);
  scoresSort = scoresSort.sort();
  scoresSort = scoresSort.reverse();
}

function printAll() {
  // Print out everything in gameState
  // Currently, only player coordinates
  for (let player in gameState.players) {
    console.log("player.x " + gameState.players[player].x);
    console.log("player.y " + gameState.players[player].y);
  }
}

function printMap(myMap){
  myMap.forEach(function(value, key) {
  console.log(key + ' : ' + value);
});
}


function onLand(x,y){
  for (var i = 0; i< map.length; i++){
    if(map[x].x <= x && (map[x].x +map[x].width) >= x){
      if(map[x].y <= y && (map[x].y +map[x].height) >= y){
        return true;
      }
    }
  }
  return false;

}

function randGenxy() {
  // How to access:
  // var randxy = randGenxy();
  // var x = randxy.x;
  // var y = randxy.y;
  var x = Math.floor(Math.random() * worldWidth);
  var y = Math.floor(Math.random() * worldHeight);
  var str = x + "," + y;
  return {
    x: x,
    y: y,
    str: str
  };
}
function checkCollision(interactable, player, newx, newy){
  //console.log(interactable[0].type);
    //collision detection
    for(let i = 0; i < Object.keys(interactable).length; i++){
      if(!(interactable[i] == undefined)){
        if (!(interactable[i] === player ||
          interactable[i].x + interactable[i].radius < newx - 30 ||
          interactable[i].y + interactable[i].radius < newy - 45||
          interactable[i].x - interactable[i].radius > newx + player.width/2 ||
          interactable[i].y - interactable[i].radius > newy + player.height/2)) {
            if (interactable[i].type == "coin") {
              console.log('deleting coin');
              console.log(interactable)
              delete gameState.coins[i];
              player.score++;
              player.getCoin = true;
              coinCount = coinCount - 1;
            }
            else if (interactable[i].type == "kraken") {
              console.log('kraken hit');
              var newXY = genValidCoors('player');
              player.x = newXY.x;
              player.y = newXY.y;
              player.score = player.score - 1;
              player.getCoin = true;
              //coinCount = coinCount - 1;
              }
              else if (interactable[i].type == "island") {
                console.log('island hit');
                var newXY = genValidCoors('player');
                player.x = newXY.x;
                player.y = newXY.y;
                player.score = player.score - 1;
                player.getCoin = true;
                //coinCount = coinCount - 1;
                }
            }
        }
      }
    }
      
function genValidCoors(type){
  if (coors.size >= totalPos){
    return {
      str: "MAXED OUT"
    }
  }
  else {
    var ret = randGenxy()
    // While the coors already exist in the coors
    // gen another pair
    
    while (coors.get(ret.str) && onLand(ret.x, ret.y)){
      ret = randGenxy();
    }
    coors.set(ret.str, type)
    return ret;
  }
}
// game logic
const gameState = {
  players: {},
  coins: {},
  enemies: {}
};

app.use(morgan("dev"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static middleware
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/*", (req, res, next) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message || "Internal server error");
});

server.listen(PORT, () => {
  console.log("Server is live on PORT:", PORT);
});

// socket responds to things here
io.on("connection", socket => {
  console.log("a user connected:", socket.id);

  socket.on("disconnect", function () {
    console.log("user disconnected");
    //if a user disconnects, removing his coordinates from the map but keeping the coin. Right now the coin is being sketchy and sometimes erasing
    //but all the coordinates are still kept in it
    var strPlayer =
      gameState.players[socket.id].x + "," + gameState.players[socket.id].y;
    coors.delete(strPlayer);
    coors.delete("0,0"); // sometimes a 0,0 entry finds its way into the map so this just deletes it
    delete gameState.players[socket.id];
    var numPlayer = Object.keys(gameState.players).length
    console.log("the num of player is: ", numPlayer)
    if (numPlayer == 0){
      console.log("no user connected");
      console.log("removing all the krakens");
      gameState.enemies = {}
      for (var [key, value] of coors) {
        console.log(key + ' = ' + value);
        if (value == 'kraken'){
          coors.delete(key)
        }
      }
    }
  });

  socket.on("newPlayer", function () {
    // adding new player to players array and setting their spawn location
    var newXY = genValidCoors('player');

    gameState.players[socket.id] = {
      x: newXY.x,
      y: newXY.y,
      //x: 350,
      //y: 250,
      width: 60,
      height: 90,
      score: 0,
      scoreB: scoresSort,
      type: "player",
      dir: "up"
    };
    newXY = genValidCoors('coin')
    gameState.coins[coinCount] = {
      x: newXY.x,
      y: newXY.y,
      //x: 250,
      //y: 250,
      radius: 10,
      width: 75,
      height: 78,
      type: "coin"
    };
    coinCount++;

    var newXY = genValidCoors('kraken');
    gameState.enemies[enemyCount] = {
      x : newXY.x,
      y : newXY.y,
      radius : 20,
      width: 133,
      height: 128.25,
      type : "kraken"
    };
    enemyCount++;

    // Check all the objects have been added into coors
    printMap(coors);

    io.sockets.emit("initsuccess");
    

    // will continuously broadcast the state to the players
    setInterval(() => {
      io.sockets.emit("state", gameState);
    }, 1000 / 60);
  });

  socket.on("printAll", function () {
    printAll();
  });

  socket.on("playerMove", function (position, direction) {
    // Game logic:
    // 1) Front end index.js calls "playerMove"
    // 2) Check bounds with newX, newY
    // 3) Check collision
    //    3.1) run collision detection func
    //    3.2) if colDet reutrns a value:
    //         'coin' : score ++
    //       'player' : score /= 2
    //       'kraken' : game over?
    //    3.3) colDet returns nothing, go to step 4
    // 4) Assign newX, newY to ship
    popScores();
    if (gameState.players) {
      // updating player x and y once they move
      var oldx = gameState.players[socket.id]
        ? gameState.players[socket.id].x
        : 0;
      var oldy = gameState.players[socket.id]
        ? gameState.players[socket.id].y
        : 0;

      // If the player has reach the boder
      // His position doesn't change
      var newx = oldx + position.x;
      if (gameState.players[socket.id] && (newx > worldWidth - gameState.players[socket.id].width ||
        newx < gameState.players[socket.id].width / 2)
      ) {
        newx = oldx;
      }

      var newy = oldy + position.y;
      if (
        gameState.players[socket.id] &&
        (newy > worldHeight - gameState.players[socket.id].height / 2 ||
        newy < gameState.players[socket.id].height / 2)
      ) {
        newy = oldy;
      }

    var score = gameState.players[socket.id] ? gameState.players[socket.id].score : 0;

    gameState.players[socket.id] = {
      x: newx,
      y: newy,
      width: 60,
      height: 90,
      score: score,
      scoreB: scoresSort,
      type : "player",
      dir: direction
    };

    //updating movement within our coordinates table
    //getting the oldXY string, deleting that key-value pair from the coordinates object, and adding in the newXY string in there
    var oldXY = oldx + "," + oldy;
    var newXY = newx + "," + newy;
    var objType = gameState.players[socket.id].type;
    coors.delete(oldXY);
    coors.set(newXY, objType);
    //console.log(Object.keys(gameState.coins).length)
    if(Object.keys(gameState.coins).length != 0){
      checkCollision(gameState.coins, gameState.players[socket.id], newx, newy)
    }
    checkCollision(gameState.enemies, gameState.players[socket.id], newx, newy)
    //checkCollision(gameState.coins, gameState.players[socket.id], newx, newy)
  }
});

//spawn one coin every 5 seconds
var coinSpawner = setInterval(() => {
  //console.log("Spawn coin");
}, 1000 * 5)});
