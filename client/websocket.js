// client/websocket.js
const socket = io("https://real-time-collaborative-drawing-canvas-t8dg.onrender.com", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});


function joinRoom(roomId = 'main', name = 'Anon') {
  if (!socket.connected) {
    console.warn("⚠️ Socket not connected yet, waiting...");
    socket.once('connect', () => {
      console.log("✅ Now connected, joining room");
      socket.emit('join', { roomId, name });
    });
  } else {
    socket.emit('join', { roomId, name });
  }
}

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.warn('❌ Disconnected:', reason);
});

export { socket, joinRoom };
