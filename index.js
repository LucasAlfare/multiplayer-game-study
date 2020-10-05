import express from 'express';
import socketIO from 'socket.io';

const PORT = process.env.PORT || 3000;

const io = socketIO(express().listen(PORT, () => console.log(`listenning on port ${PORT}...`)), { pingInterval: 1500 });

const gameWidth = 10;
const gameHeight = 10;

let players = [];
let fruits = [];

io.on('connection', client => {
    const currentPlayer = { id: client.id, x: 0, y: 0, points: 0 };
    players.push(currentPlayer);

    client.emit('game-state', {
        gameDimension: { width: gameWidth, height: gameHeight },
        players: players,
        fruits: fruits
    });

    client.broadcast.emit('player-in', currentPlayer);

    client.on('player-move', data => {
        handlePlayerMove(data, currentPlayer);
        client.emit('player-move', currentPlayer);
        client.broadcast.emit('player-move', currentPlayer);

        const collisionInfo = FruitCollisionInfo(currentPlayer);
        if (collisionInfo) {
            currentPlayer.points++;
            client.emit('player-point', { id: currentPlayer.id, points: currentPlayer.points });
            client.broadcast.emit('player-point', { id: currentPlayer.id, points: currentPlayer.points });

            client.emit('fruit-out', collisionInfo.id);
            client.broadcast.emit('fruit-out', collisionInfo.id);

            fruits = fruits.filter(f => f.id !== collisionInfo.id);
        }
    });

    client.on('disconnect', () => {
        players = players.filter(function (curr) {
            return curr.id !== currentPlayer.id;
        });

        client.broadcast.emit('player-out', currentPlayer.id);
    });
});

setInterval(() => {
    if (players.length > 0) {
        const f = {
            id: Date.now().toString(36),
            x: Math.floor(Math.random() * gameWidth),
            y: Math.floor(Math.random() * gameHeight)
        };
        fruits.push(f);
        io.emit('fruit-in', f);
    } else {
        fruits.length = 0;
    }
}, 2500);

function handlePlayerMove(key, targetPlayer) {
    if (key.includes('Up')) move(0, -1, targetPlayer);
    if (key.includes('Right')) move(1, 0, targetPlayer);
    if (key.includes('Down')) move(0, 1, targetPlayer);
    if (key.includes('Left')) move(-1, 0, targetPlayer);
}

function move(nx, ny, player) {
    player.x = player.x + nx >= gameWidth ? 0 : player.x + nx < 0 ? gameWidth - 1 : player.x + nx;
    player.y = player.y + ny >= gameHeight ? 0 : player.y + ny < 0 ? gameHeight - 1 : player.y + ny;

    //sem teleporte
    // player.x = nx > 0 ? Math.min(gameWidth - 1, player.x + 1) : nx < 0 ? Math.max(0, player.x - 1) : player.x;
    // player.y = ny > 0 ? Math.min(gameHeight - 1, player.y + 1) : ny < 0 ? Math.max(0, player.y - 1) : player.y;
}

function FruitCollisionInfo(checkingPlayer) {
    for (const f of fruits) {
        if (f.x === checkingPlayer.x && f.y === checkingPlayer.y) {
            return f;
        }
    }
}
