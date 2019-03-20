import nipplejs from 'nipplejs';
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const manager = createControls();
var position = {x:0, y:0};

manager.on('added', function (evt, nipple) {
    nipple.on('start move end dir plain', function (evt, data) {
        position = {x:0, y:0};
        if(evt.type == 'move'){
            if(data.direction){
                var x = data.direction.x;
                if(x == "left" ){
                    position.x = -1;
                }
                else if(x == "right" ){
                    position.x = 1;
                }

                var y = data.direction.y;
                if(y == "up" ){
                    position.y = -1;
                }
                else if(y == "down" ){
                    position.y = 1;
                }
            }
        }
        socket.emit('playerMove', position);
    });
}).on('removed', function (evt, nipple) {
    nipple.off('start move end dir plain');
});


socket.emit('newPlayer');

socket.on('state', function(gameState){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let player in gameState.players) {
        drawPlayer(gameState.players[player])
    }
})


// drawing the new player
const drawPlayer = (player) => {
    ctx.beginPath();
    ctx.rect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#0095DD';
    ctx.fill();
    ctx.closePath();
};


// creating the joystick
function createControls(){
    return nipplejs.create({
        zone: document.getElementById('joystick-wrapper'),
        multitouch: false,
        maxNumberOfNipples: 1,
        mode: 'dynamic',
        restOpacity: 1,
        color: 'black'
        
    });
}


