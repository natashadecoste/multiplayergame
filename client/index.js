import "./../styles/styles.scss";
import nipplejs from "nipplejs";

const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const socket = io();
const manager = createControls();
var position = { x: 0, y: 0 };

init();

function init() {
  // resizing to a full sized canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // binding the keyboard controls to the document
  bindControls();

  // let the server know we have another player
  socket.emit("newPlayer");
}

manager
  .on("added", function(evt, nipple) {
    // we send ALL nipple events here (probably should not do that lol)
    nipple.on("dir dir:left dir:right dir:up dir:down", function(evt, data) {
      position = { x: 0, y: 0 };
      if (evt.type == "dir:up") {
        position.y = -1;
      }
      if (evt.type == "dir:left") {
        position.x = -1;
      }
      if (evt.type == "dir:down") {
        position.y = 1;
      }
      if (evt.type == "dir:right") {
        position.x = 1;
      }
    });

    nipple.on("end", function(evt, data) {
        // tell the server there has been a movement
        position = { x: 0, y: 0 };
      });

  })
  .on("removed", function(evt, nipple) {
    nipple.off("start move end dir plain"); // removing listener from all events
  });

// socket response to a state emit from the server
socket.on("state", function(gameState) {
  // need to clear the canvas otherwise it gets drawn ON TOP
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // if we have enemies/coins/anything else we need to all draw them
  // (or possible have a collection of all game items and iterate through that?)
  for (let player in gameState.players) {
    drawPlayer(gameState.players[player]);
  }
});

// drawing a player/redrawing after movements
const drawPlayer = player => {
  ctx.beginPath();
  ctx.rect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
};

// creating the joystick
// can change the options here for the joystick nipplejs library
function createControls() {
  return nipplejs.create({
    zone: document.getElementById("joystick-wrapper"),
    multitouch: false,
    maxNumberOfNipples: 1,
    mode: "semi",
    restOpacity: 1,
    color: "black"
  });
}

// how to handle moving the player along the canvas
function keyDownHandler(e) {
  position = { x: 0, y: 0 };
  if (e.keyCode == 39) {
    position.x = 3;
  } else if (e.keyCode == 37) {
    position.x = -3;
  } else if (e.keyCode == 38) {
    position.y = -3;
  } else if (e.keyCode == 40) {
    position.y = 3;
  }
  socket.emit("playerMove", position);
}

// binds all document keydown (from keyboard) to the handler for player movement
function bindControls() {
  document.addEventListener("keydown", keyDownHandler, false);
}


// will continuously check if we need to resend the playermove
setInterval(() => {
    socket.emit("playerMove", position);
  }, 1000 / 60);
  