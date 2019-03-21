import "./../styles/styles.scss";
import nipplejs from "nipplejs";

const canvas = document.getElementById("myCanvas");
const minimap = document.getElementById("minimap");

const world = { x: 1000, y: 1000 };
const ctx = canvas.getContext("2d");
const ctxm = minimap.getContext("2d");

const socket = io();
const manager = createControls();
var positionDiff = { x: 0, y: 0 };
var cam = { x: 0, y: 0 };

init();

function init() {
  // resizing to a full sized canvas
  // canvas.width = window.innerWidth;
  // canvas.height = window.innerHeight;
  canvas.width = 1280;
  canvas.height = 800;

  // binding the keyboard controls to the document
  bindControls();

  // let the server know we have another player
  socket.emit("newPlayer");
}

manager
  .on("added", function(evt, nipple) {
    // we send ALL nipple events here (probably should not do that lol)
    nipple.on("dir dir:left dir:right dir:up dir:down", function(evt, data) {
      positionDiff = { x: 0, y: 0 };
      if (evt.type == "dir:up") {
        positionDiff.y = -2;
      }
      if (evt.type == "dir:left") {
        positionDiff.x = -2;
      }
      if (evt.type == "dir:down") {
        positionDiff.y = 2;
      }
      if (evt.type == "dir:right") {
        positionDiff.x = 2;
      }
    });

    nipple.on("end", function(evt, data) {
      // tell the server there has been a movement
      positionDiff = { x: 0, y: 0 };
    });
  })
  .on("removed", function(evt, nipple) {
    nipple.off("start move end dir plain"); // removing listener from all events
  });

// socket response to a state emit from the server
socket.on("state", function(gameState) {
  try {
    getCameraPosition(gameState.players, socket.id);
    drawThings(gameState.players);
    drawMiniMap(gameState.players);
  } catch (err) {
    console.log("no players yet ...");
  }
});

function getCameraPosition(players, id) {
  //console.log("player position: " + players[id].x + " " + players[id].y);
  cam = { x: players[id].x, y: players[id].y };
}

function clamp(value, min, max) {
  if (value < min) return min;
  else if (value > max) return max;
  return value;
}

function drawThings(players) {
  ctx.clearRect(0, 0, canvas.width, canvas.height); //clear the viewport AFTER the matrix is reset

  //  Clamp the camera position to the world bounds while centering the camera around the player
  cam.x = clamp(cam.x - window.innerWidth / 2, 0, world.x - window.innerWidth);
  cam.y = clamp(
    cam.y - window.innerHeight / 2,
    0,
    world.y - window.innerHeight
  );

  for (let player in players) {
    if (
      players[player].x >= cam.x &&
      players[player].x < cam.x + window.innerWidth
    ) {
      if (
        players[player].y >= cam.y &&
        players[player].y < cam.y + window.innerHeight
      ) {
        drawPlayer(players[player]);
      }
    }
  }
}

// drawing a player/redrawing after movements
const drawPlayer = player => {
  ctx.beginPath();
  ctx.rect(player.x - cam.x, player.y - cam.y, player.width, player.height);
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
    mode: "dynamic",
    restOpacity: 1,
    color: "black"
  });
}

// how to handle moving the player along the canvas
function keyDownHandler(e) {
  positionDiff = { x: 0, y: 0 };
  if (e.keyCode == 39 || e.keyCode == 68) {
    positionDiff.x = 2;
  } else if (e.keyCode == 37 || e.keyCode == 65) {
    positionDiff.x = -2;
  } else if (e.keyCode == 38 || e.keyCode == 87) {
    positionDiff.y = -2;
  } else if (e.keyCode == 40 || e.keyCode == 83) {
    positionDiff.y = 2;
  }
}

function keyUpHandler() {
  positionDiff = { x: 0, y: 0 };
}

// binds all document keydown (from keyboard) to the handler for player movement
function bindControls() {
  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);
}

function drawMiniMap(players) {
  ctxm.clearRect(0, 0, minimap.width, minimap.height);
  for (let player in players) {
    ctxm.beginPath();
    ctxm.rect(
      players[player].x,
      players[player].y,
      players[player].width,
      players[player].height
    );
    ctxm.fillStyle = "green";
    ctxm.fill();
    ctxm.closePath();
  }
}

// will continuously check if we need to resend the playermove
setInterval(() => {
  socket.emit("playerMove", positionDiff);
}, 1000 / 60);
