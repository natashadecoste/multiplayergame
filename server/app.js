const express = require("express");
const path = require("path");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);

// game logic
const gameState = {
  players: {}
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
    gameState.players[socket.id] = {
      x: 200,
      y: 200,
      width: 20,
      height: 20
    };
  });

  socket.on("playerMove", function(position) {
    var oldx = gameState.players[socket.id]
      ? gameState.players[socket.id].x
      : 0;
    var oldy = gameState.players[socket.id]
      ? gameState.players[socket.id].y
      : 0;
    gameState.players[socket.id] = {
      x: oldx + position.x,
      y: oldy + position.y,
      width: 20,
      height: 20
    };
  });
});

// will continuously broadcast the state to the players
setInterval(() => {
  io.sockets.emit("state", gameState);
}, 1000 / 60);
