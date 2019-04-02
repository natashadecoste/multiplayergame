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

var coinCount = 0;
var enemyCount = 0;

// A hashmap to keep track of all the objects on canvas 
// the key:value pair for this object will be 'x,y':type
// Add a new entity: coors.set('300,600' , 'player') or
//                   coors.set(test.str , 'player')
// Get type: coors.get('300,600')
var coors = new Map();

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
    while (coors.get(ret.str)){
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
  });

  socket.on("newPlayer", function () {
    // adding new player to players array and setting their spawn location
    var newXY = genValidCoors('player');

    gameState.players[socket.id] = {
      x: newXY.x,
      y: newXY.y,
      width: 50,
      height: 80,
      score: 0,
      type: "player"
    };

    newXY = genValidCoors('coin')
    gameState.coins[coinCount] = {
      // randomizing spawn point, color is red for visibility right now
      //x : Math.floor(Math.random()*worldWidth),
      //y : Math.floor(Math.random()*worldHeight),
      x: newXY.x,
      y: newXY.y,
      radius: 10,
      r: 255,
      g: 0,
      b: 0,
      type: "coin"
    };
    coinCount++;

    var newXY = genValidCoors('kraken');
    gameState.enemies[enemyCount] = {
      x : newXY.x,
      y : newXY.y,
      radius : 40,
      type : "kraken"
    };
    enemyCount++;

    // Check all the objects have been added into coors
    printMap(coors);

    // will continuously broadcast the state to the players
    setInterval(() => {
      io.sockets.emit("state", gameState);
    }, 1000 / 60);
  });

  socket.on("printAll", function () {
    printAll();
  });

  socket.on("playerMove", function (position) {
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
      width: 50,
      height: 80,
      score: score,
      type : "player"
    };

    //updating movement within our coordinates table
    //getting the oldXY string, deleting that key-value pair from the coordinates object, and adding in the newXY string in there
    var oldXY = oldx + "," + oldy;
    var newXY = newx + "," + newy;
    var objType = gameState.players[socket.id].type;
    coors.delete(oldXY);
    coors.set(newXY, objType);
    
    //if coins exist
    if(Object.keys(gameState.coins).length != 0){
      //collision detection
      for(let i = 0; i < Object.keys(gameState.coins).length; i++){
        if (!(gameState.coins[i] === gameState.players[socket.id] ||
          gameState.coins[i].x + gameState.coins[i].radius < newx ||
          gameState.coins[i].y + gameState.coins[i].radius < newy ||
          gameState.coins[i].x - gameState.coins[i].radius > newx + gameState.players[socket.id].width ||
          gameState.coins[i].y - gameState.coins[i].radius > newy + gameState.players[socket.id].height)) {
            delete gameState.coins[i];
            gameState.players[socket.id].score++;
            coinCount = coinCount - 1;
          }
      }
    }
    //console.log(gameState.enemies[0]);
    //kraken collision detection
    if(Object.keys(gameState.enemies).length != 0){
      for(let i = 0; i < Object.keys(gameState.enemies).length; i++){
        if (!(gameState.enemies[i] === gameState.players[socket.id] ||
          gameState.enemies[i].x + gameState.enemies[i].radius < newx ||
          gameState.enemies[i].y + gameState.enemies[i].radius < newy ||
          gameState.enemies[i].x - gameState.enemies[i].radius > newx + gameState.players[socket.id].width ||
          gameState.enemies[i].y - gameState.enemies[i].radius > newy + gameState.players[socket.id].height)) {
            //delete gameState.players[socket.id];
            console.log('collision');
          }
        }
      }

    /*for(var ele of coors.entries()){
      console.log(gameState.enemies)
      console.log(gameState.players)
      console.log(ele)
    };*/
  }
});


/*function spawnKraken(){
  var newXY = genValidCoors('kraken');
  gameState.enemies.push({type: "kraken", x: newXY.x, y:newXY.y, radius: 40});
}*/
//spawn one coin every 5 seconds
var coinSpawner = setInterval(() => {
  console.log("Spawn coin");
}, 1000 * 5)});
