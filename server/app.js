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

// game logic
const gameState = {
  players: {},
  coins: {}
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
  

  socket.on("disconnect", function() {
    console.log("user disconnected");
    delete gameState.players[socket.id];
  });

  socket.on("newPlayer", function() {
    // adding new player to players array and setting their spawn location
    gameState.players[socket.id] = {
      x: 200,
      y: 200,
      width: 20,
      height: 20
    };
    gameState.coins[socket.id] = {
      // randomizing spawn point and color
      x : Math.floor(Math.random()*600),
      y : Math.floor(Math.random()*600),
      radius : 10,
      r : Math.floor(Math.random()*255),
      g : Math.floor(Math.random()*255),
      b : Math.floor(Math.random()*255)
    };
    console.log(gameState.coins[socket.id]);
    console.log("hello player");

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
      height: 20
    };
  });
});


// will continuously broadcast the state to the players
setInterval(() => {
      io.sockets.emit("state", gameState);
}, 1000 / 60);
