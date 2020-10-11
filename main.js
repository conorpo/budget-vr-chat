const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname + "/public"));
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')));
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')));


const playerPositions = [];
const roomIds = [1];

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        const playerData = {
            position: [0,0,0],
            quaternion: [0,0,0,1],
            userId
        }
        playerPositions.push(playerData);
        const index = playerPositions.length-1;
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-connected', userId);
        socket.on('movementData', (position, quaternion) => {
            playerData.position = position;
            playerData.quaternion = quaternion;
        })
        socket.on('disconnect', () => {
            playerPositions.splice(index,1);
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
        })
    })
});

const serverTickRate = 10;
setInterval(() => {
    roomIds.forEach(roomId => {
        io.to(roomId).emit('playerData', playerPositions);
    })
},1000/serverTickRate)

const port = process.env.port || 3003;
http.listen(port, (err) => {
    if (err) return console.log(err);
    console.log(`Listening on port ${port}`);
})