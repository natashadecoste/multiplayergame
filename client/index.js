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

const islands = document.getElementsByClassName("islands");
const map = [
  { x: 856, y: 800, width: 190, height: 180, png: 0 },
  { x: 566, y: 480, width: 190, height: 200, png: 0 },
  { x: 45, y: 880, width: 200 , height: 200, png: 2 }
];

// for updating the server on the new positios
var positionDiff = { x: 0, y: 0 };
var dir = "up";
var cam = { x: 0, y: 0 };

// PLAYER STUFF
// gets the html element for player boat
var sprite = document.getElementById("sprite");
var enemySprite = document.getElementById("sprite-enemy");
var mainplayer;

var TO_RADIANS = Math.PI / 180; // to rotate the sprite

// enemy stuff
var spriteKraken = document.getElementById("sprite-kraken");

// coin stuff
var spriteCoin = document.getElementById("sprite-coin");

// calling init
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
        dir = "up";
      }
      if (evt.type == "dir:left") {
        positionDiff.x = -2;
        dir = "left";
      }
      if (evt.type == "dir:down") {
        positionDiff.y = 2;
        dir = "down";
      }
      if (evt.type == "dir:right") {
        positionDiff.x = 2;
        dir = "right";
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

// so we know we are the player
socket.on("initsuccess", function(){
  console.log(socket.id);
  mainplayer = socket.id;
});


// socket response to a state emit from the server
socket.on("state", function(gameState) {
  try {
    // clamping the camera
    getCameraPosition(gameState.players, socket.id);
    drawThings(gameState);

    drawui(gameState); // minimap needs to be last
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

  drawIslands(map);

  // need to draw the kraken under the player
  if (gameState.enemies) {
    for (var i = 0; i < Object.keys(gameState.enemies).length; i++) {
      drawKraken(gameState.enemies[i]);
    }
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
          drawPlayer(gameState.players[player], player);
        }
      }
    }
  }
  //draw all the coins
  if (gameState.coins) {
    for (let i = 0; i < Object.keys(gameState.coins).length; i++) {
      drawCoin(gameState.coins[i]);
    }
  }
}

const drawKraken = position => {
  if (position.x + 95 >= cam.x && position.x < cam.x + window.innerWidth) {
    if (position.y + 95 >= cam.y && position.y < cam.y + window.innerHeight) {
      ctx.drawImage(
        spriteKraken,
        position.x - cam.x,
        position.y - cam.y,
        95,
        95
      );
    }
  }
};

// drawing a player/redrawing after movements
const drawPlayer = (player, playerSocket) => {
  if (!player.dir) {
    player.dir = "up";
  }
  try {
    var rotate;
    switch (player.dir) {
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
    if(playerSocket == mainplayer){
      ctx.drawImage(sprite, 0, 0, player.width, player.height);
    }
    else {
      ctx.drawImage(enemySprite, 0, 0, player.width, player.height);
    }
    
    ctx.restore();
  } catch (error) {
    console.log("the error is " + error);
  }
};

const drawCoin = coin => {
  //console.log(coin)
  if (coin.x >= cam.x && coin.x < cam.x + window.innerWidth) {
    if (coin.y >= cam.y && coin.y < cam.y + window.innerHeight) {
      ctx.drawImage(spriteCoin, coin.x - cam.x, coin.y - cam.y, 30, 30);
    }
  }
};

// drawing a coin
// const drawCoin = coin => {
//   ctx.beginPath();
//   ctx.arc(coin.x - cam.x, coin.y - cam.y, coin.radius, Math.PI * 2, 0, false);
//   ctx.fillStyle = "rgba(" + coin.r + "," + coin.g + "," + coin.b + ",1)";
//   ctx.fill();
//   ctx.closePath();
// };

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
    dir = "right";
  } else if (e.keyCode == 37 || e.keyCode == 65) {
    positionDiff.x = -2;
    dir = "left";
  } else if (e.keyCode == 38 || e.keyCode == 87) {
    positionDiff.y = -2;
    dir = "up";
  } else if (e.keyCode == 40 || e.keyCode == 83) {
    positionDiff.y = 2;
    dir = "down";
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

function drawIslands(map) {
  for (var x = 0; x < map.length; x++) {
    if (
      map[x].x + map[x].width >= cam.x &&
      map[x].x < cam.x + window.innerWidth
    ) {
      if (
        map[x].y + map[x].height >= cam.y &&
        map[x].y < cam.y + window.innerHeight
      ) {
        ctx.drawImage(
          islands[map[x].png],
          map[x].x - cam.x,
          map[x].y - cam.y,
          map[x].width,
          map[x].height
        );
      }
    }
  }
}

function drawui(gameState) {
  drawMiniMap(gameState);
  updateScore(gameState.players[socket.id].score);
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

function updateScore(newscore) {
  document.getElementById("score").innerHTML = newscore;
}

// will continuously check if we need to resend the playermove
setInterval(() => {
  socket.emit("playerMove", positionDiff, dir);
}, 1000 / 60);
