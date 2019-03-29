import "./../styles/styles.scss";
import nipplejs from "nipplejs";

// canvas elements for the main game frame and minimap
const canvas = document.getElementById("gameCanvas");
const minimap = document.getElementById("minimap");

const world = { x: 1000, y: 1000 };
const ctx = canvas.getContext("2d");
const ctxm = minimap.getContext("2d");

const socket = io();
const manager = createControls();
var positionDiff = { x: 0, y: 0 };
var cam = { x: 0, y: 0 };

// PLAYER STUFF
// gets the html element for player boat
var sprite = document.getElementById("sprite");
var spriteDir = "up";
var TO_RADIANS = Math.PI / 180; // to rotate the sprite

// enemy stuff
var spriteKraken = document.getElementById("sprite-kraken");

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
      positionDiff = { x: 0, y: 0 };
      if (evt.type == "dir:up") {
        positionDiff.y = -2;
        spriteDir = "up";
      }
      if (evt.type == "dir:left") {
        positionDiff.x = -2;
        spriteDir = "left";
      }
      if (evt.type == "dir:down") {
        positionDiff.y = 2;
        spriteDir = "down";
      }
      if (evt.type == "dir:right") {
        positionDiff.x = 2;
        spriteDir = "right";
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
    drawThings(gameState);
    drawui(gameState);
  } catch (err) {
    console.log(err);
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

function drawThings(gameState) {
  ctx.clearRect(0, 0, canvas.width, canvas.height); //clear the viewport AFTER the matrix is reset

  //  Clamp the camera position to the world bounds while centering the camera around the player
  cam.x = clamp(cam.x - window.innerWidth / 2, 0, world.x - window.innerWidth);
  cam.y = clamp(
    cam.y - window.innerHeight / 2,
    0,
    world.y - window.innerHeight
  );

  // want to pan the background according to camera
  var p = document.getElementById("wrapper");
  p.style.backgroundPositionX = -cam.x + "px";
  p.style.backgroundPositionY = -cam.y + "px";


  // need to draw the kraken under the player 
  for(var i=0; i<gameState.enemies.length; i++){
    drawKraken({x: gameState.enemies[i].x, y: gameState.enemies[i].y});
  }


  // drawing the player(s)
  if (gameState.players) {
    for (let player in gameState.players) {
      if (
        gameState.players[player].x >= cam.x &&
        gameState.players[player].x < cam.x + window.innerWidth
      ) {
        if (
          gameState.players[player].y >= cam.y &&
          gameState.players[player].y < cam.y + window.innerHeight
        ) {
          drawPlayer(gameState.players[player]);
        }
      }
    }
  }

}


const drawKraken = position => {
  if (
    position.x >= cam.x &&
    position.x < cam.x + window.innerWidth
  ) {
    if (
      position.y >= cam.y &&
      position.y < cam.y + window.innerHeight
    ) {
      ctx.drawImage(spriteKraken, position.x -cam.x, position.y - cam.y, 95, 95);
    }
  }
  
}

// drawing a player/redrawing after movements
const drawPlayer = player => {
  try {
    var rotate;
    switch (spriteDir) {
      case "up":
        rotate = 0;
        break;
      case "left":
        rotate = 270 * TO_RADIANS;
        break;
      case "right":
        rotate = 90 * TO_RADIANS;
        break;
      case "down":
        rotate = 180 * TO_RADIANS;
        break;
    }

    ctx.save();
    ctx.translate(player.x - cam.x, player.y - cam.y);
    ctx.rotate(rotate);
    ctx.translate(-player.width/2, -player.height/2);
    ctx.drawImage(sprite, 0, 0);
    ctx.restore();

  } catch (error) {
    console.log("the error is " + error);
  }
};

// drawing a coin
const drawCoin = coin => {
  ctx.beginPath();
  ctx.arc(coin.x - cam.x, coin.y - cam.y, coin.radius, Math.PI * 2, 0, false);
  ctx.fillStyle = "rgba(" + coin.r + "," + coin.g + "," + coin.b + ",1)";
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
    spriteDir = "right";
  } else if (e.keyCode == 37 || e.keyCode == 65) {
    positionDiff.x = -2;
    spriteDir = "left";
  } else if (e.keyCode == 38 || e.keyCode == 87) {
    positionDiff.y = -2;
    spriteDir = "up";
  } else if (e.keyCode == 40 || e.keyCode == 83) {
    positionDiff.y = 2;
    spriteDir = "down";
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

function drawui(gameState) {
  drawMiniMap(gameState);
  ctx.fillStyle = "black";
  ctx.font = "30px Comic Sans MS";
  var test = 2;
  ctx.fillText(
    "Score: " + gameState.players[socket.id].score,
    canvas.width / 18,
    35
  );
}

function drawMiniMap(gameState) {
  ctxm.clearRect(0, 0, minimap.width, minimap.height);
  for (let player in gameState.players) {
    ctxm.beginPath();
    ctxm.rect(
      gameState.players[player].x,
      gameState.players[player].y,
      gameState.players[player].width,
      gameState.players[player].height
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
