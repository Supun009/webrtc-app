const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Store connected clients
const clients = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle join room
    socket.on('join', (roomId) => {
        socket.join(roomId);
        clients.set(socket.id, roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Notify other users in the room
        socket.to(roomId).emit('user-connected', socket.id);
    });

    // Handle offer
    socket.on('offer', (offer, targetId) => {
        io.to(targetId).emit('offer', offer, socket.id);
    });

    // Handle answer
    socket.on('answer', (answer, targetId) => {
        io.to(targetId).emit('answer', answer, socket.id);
    });

    // Handle ICE candidate
    socket.on('ice-candidate', (candidate, targetId) => {
        io.to(targetId).emit('ice-candidate', candidate, socket.id);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const roomId = clients.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('user-disconnected', socket.id);
            clients.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});