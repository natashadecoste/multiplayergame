const express = require("express");
const path = require("path");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);

const canvasWidth = 1280;
const canvasHeight = 800;

function printAll(){
  // Print out everything in gameState
  // Currently, only player coordinates 
  for (let player in gameState.players){
    console.log("player.x " + gameState.players[player].x);
    console.log("player.y " + gameState.players[player].y);
  }
}

function randGenxy(){
  // how to access:
  // var randxy = randGenxy();
  // var x = randxy.x;
  // var y = randxy.y;
  var x = Math.floor(Math.random()*canvasWidth);
  var y = Math.floor(Math.random()*canvasHeight);
  var str = "'" + x + "," + y + "'"
  return {
    x: x,
    y: y,
    str: str
  };
}
// game logic
const gameState = {
  players: {},
  coins: {}
};
//the key:value pair for this object will be 'x,y':type
var coors = new Map();

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
  

  socket.on("disconnect", function() {
    console.log("user disconnected");
    //if a user disconnects, removing his coordinates from the map but keeping the coin. Right now the coin is being sketchy and sometimes erasing
    //but all the coordinates are still kept in it
    var strPlayer = gameState.players[socket.id].x + "," + gameState.players[socket.id].y;
    coors.delete(strPlayer);
    var strCoin = gameState.coins[socket.id].x + "," + gameState.coins[socket.id].y;
    coors.delete(strCoin);
    coors.delete('0,0'); // sometimes a 0,0 entry finds its way into the map so this just deletes it
    delete gameState.players[socket.id];
  });

  socket.on("newPlayer", function() {
    // adding new player to players array and setting their spawn location
    gameState.players[socket.id] = {
      x: 200,
      y: 200,
      width: 20,
      height: 20,
      score: 1,
      type : "player"
    };
    
    gameState.coins[socket.id] = {
      // randomizing spawn point, color is red for visibility right now
      //x : Math.floor(Math.random()*canvasWidth),
      //y : Math.floor(Math.random()*canvasHeight),
      x : 350,
      y : 350,
      radius : 10,
      r : 255,
      g : 0,
      b : 0,
      type : "coin"
    };
    //adding the new players and coins coordinates to our coors object to keep track of where everything is on the canvas
    var strPlayer = gameState.players[socket.id].x + "," + gameState.players[socket.id].y;
    coors.set(strPlayer, gameState.players[socket.id].type);
    var strCoin = gameState.coins[socket.id].x + "," + gameState.coins[socket.id].y;
    coors.set(strCoin, gameState.coins[socket.id].type);

  });

  socket.on("printAll", function() {
    printAll();
  });

  socket.on("playerMove", function(position) {
    // updating player x and y once they move
    var oldx = gameState.players[socket.id]
      ? gameState.players[socket.id].x
      : 0;
    var oldy = gameState.players[socket.id]
      ? gameState.players[socket.id].y
      : 0;

    var newx = oldx + position.x;
    if (newx > canvasWidth) {
      newx = 0;
    } else if (newx < 0) {
      newx = canvasWidth;
    }

    var newy = oldy + position.y;
    if (newy > canvasHeight) {
      newy = 0;
    } else if (newy < 0) {
      newy = canvasHeight;
    }

    gameState.players[socket.id] = {
      x: newx,
      y: newy,
      width: 20,
      height: 20,
      score: 0,
      type : "player"
    };
    
    //function gives us back the abs value of two distances
    var diff = function (a, b) { return Math.abs(a - b); }

    //updating movement within our coordinates table
    //getting the oldXY string, deleting that key-value pair from the coordinates object, and adding in the newXY string in there
    var oldXY = oldx + "," + oldy;
    var newXY = newx + "," + newy;
    var objType = gameState.players[socket.id].type;
    coors.delete(oldXY);
    coors.set(newXY, objType);

    //if coins exist
    if(gameState.coins[socket.id]){
      var coinX = gameState.coins[ssocket.id].x;
      var coinY = gameState.coins[socket.id].y;

      //collision detection
      //squarex/y - circlex/y <= 30 (radius + the squares width&height)
      if(diff(newx, coinX) <= 30 || diff(newy, coinX) <= 30 || diff(newx, coinY) <= 30 || diff(newy, coinY) <= 30){
        console.log('collision');
      }
    }

    for(var ele of coors.entries()){
      console.log(ele)
    };

    /*if (Object.keys(gameState.players).length > 0){
      if (!(gameState.coins[socket.id] === gameState.players[socket.id] ||
        gameState.coins[socket.id].x + gameState.coins[socket.id].radius < gameState.players[socket.id].x ||
        gameState.coins[socket.id].y + gameState.coins[socket.id].radius < gameState.players[socket.id].y ||
        gameState.coins[socket.id].x - gameState.coins[socket.id].radius > gameState.players[socket.id].x + gameState.players[socket.id].width ||
        gameState.coins[socket.id].y - gameState.coins[socket.id].radius > gameState.players[socket.id].y + gameState.players[socket.id].height)) {
          console.log("collision detected");
        };
      };*/
  });
});


// will continuously broadcast the state to the players
setInterval(() => {
      io.sockets.emit("state", gameState);
}, 1000 / 60);
