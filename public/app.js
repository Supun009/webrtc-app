// Connect to the signaling server
const socket = io();

// Get DOM elements
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// WebRTC variables
let localStream;
let remoteStream;
let peerConnection;
let roomId;

// STUN servers
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
};

// Start local video stream
startButton.onclick = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        startButton.disabled = true;
        callButton.disabled = false;
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
};

// Initialize peer connection and join room
callButton.onclick = async () => {
    callButton.disabled = true;
    hangupButton.disabled = false;

    roomId = prompt('Enter room ID:');
    if (!roomId) return;

    socket.emit('join', roomId);

    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
        remoteStream = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, roomId);
        }
    };
};

// Hang up the call
hangupButton.onclick = () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    localStream.getTracks().forEach(track => track.stop());
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    callButton.disabled = true;
    hangupButton.disabled = true;
    socket.emit('leave', roomId);
};

// Handle incoming connections
socket.on('user-connected', async (userId) => {
    console.log('User connected:', userId);
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer, userId);
    } catch (error) {
        console.error('Error creating offer:', error);
    }
});

// Handle incoming offers
socket.on('offer', async (offer, userId) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer, userId);
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

// Handle incoming answers
socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

// Handle incoming ICE candidates
socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

// Handle user disconnection
socket.on('user-disconnected', (userId) => {
    console.log('User disconnected:', userId);
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    remoteVideo.srcObject = null;
});