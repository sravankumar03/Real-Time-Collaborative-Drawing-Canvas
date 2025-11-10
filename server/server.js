// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Rooms = require("./rooms");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "..", "client")));

const PORT = process.env.PORT || 3000;
const rooms = new Rooms();

const DARK_COLORS = [
  "#1f77b4", "#2ca02c", "#d62728", "#9467bd", "#8c564b",
  "#7f7f7f", "#17becf", "#e377c2", "#bcbd22", "#393b79",
  "#637939", "#8c6d31", "#843c39", "#7b4173"
];

io.on("connection", (socket) => {
  console.log("🟢 Connected:", socket.id);

  socket.on("join", ({ roomId = "main", name = "Anon" }) => {
    // Validate inputs
    if (!roomId || typeof roomId !== "string") roomId = "main";
    if (!name || typeof name !== "string") name = "Anonymous";
    
    roomId = roomId.slice(0, 50); // Limit room ID length
    name = name.slice(0, 50);     // Limit name length

    socket.join(roomId);
    const color = DARK_COLORS[Math.floor(Math.random() * DARK_COLORS.length)];
    rooms.addUser(roomId, socket.id, { name, color });

    const state = rooms.getState(roomId);
    const userList = rooms.listUsers(roomId);
    const history = state.getHistory();

    // Send joined event to this client
    socket.emit("joined", {
      roomId,
      users: userList,
      history: history || [],
    });

    // Notify all users in room of presence
    io.to(roomId).emit("presence", { users: userList });
    console.log(`✅ ${name} joined room: ${roomId}`);

    // Drawing events
    socket.on("op:begin", (op) => {
      try {
        if (!op || !op.localId) return;
        op.author = socket.id;
        state.receiveBegin(op, (applied) => {
          io.to(roomId).emit("op:apply", applied);
        });
      } catch (err) {
        console.error("❌ Error in op:begin:", err);
      }
    });

    socket.on("op:points", (pt) => {
      try {
        if (!pt || !pt.localId || !Array.isArray(pt.points)) return;
        pt.author = socket.id;
        state.receivePoints(pt, (applied) => {
          io.to(roomId).emit("op:apply", applied);
        });
      } catch (err) {
        console.error("❌ Error in op:points:", err);
      }
    });

    socket.on("op:end", (end) => {
      try {
        if (!end || !end.localId) {
          console.warn("❌ Invalid op:end data:", end);
          return;
        }
        end.author = socket.id;
        const result = state.receiveEnd(end, (applied) => {
          if (applied) {
            io.to(roomId).emit("op:apply", applied);
            console.log(`✅ Op finalized: ${applied.opId.slice(0, 8)} with ${applied.points.length} points`);
          }
        });
      } catch (err) {
        console.error("❌ Error in op:end:", err);
      }
    });

    // Cursor tracking
    socket.on("cursor", (pos) => {
      try {
        if (!pos || pos.x === undefined || pos.y === undefined) return;
        const user = rooms.listUsers(roomId).find((u) => u.id === socket.id);
        socket.to(roomId).emit("cursor", {
          x: pos.x,
          y: pos.y,
          userId: socket.id,
          color: user?.color || "#000",
          name: user?.name || "Anonymous",
        });
      } catch (err) {
        console.error("❌ Error in cursor:", err);
      }
    });

    // Undo / Redo with callbacks
    socket.on("undo", (data, callback) => {
      try {
        const toggled = state.undo();
        if (toggled) {
          // Broadcast to ALL clients in room (including sender)
          io.to(roomId).emit("op:toggle", toggled);
          console.log(`↶ Undo in ${roomId}`);
          if (typeof callback === "function") callback(true);
        } else {
          console.log(`⚠️ Nothing to undo in ${roomId}`);
          if (typeof callback === "function") callback(false);
        }
      } catch (err) {
        console.error("❌ Error in undo:", err);
        if (typeof callback === "function") callback(false);
      }
    });

    socket.on("redo", (data, callback) => {
      try {
        const toggled = state.redo();
        if (toggled) {
          // Broadcast to ALL clients in room (including sender)
          io.to(roomId).emit("op:toggle", toggled);
          console.log(`↷ Redo in ${roomId}`);
          if (typeof callback === "function") callback(true);
        } else {
          console.log(`⚠️ Nothing to redo in ${roomId}`);
          if (typeof callback === "function") callback(false);
        }
      } catch (err) {
        console.error("❌ Error in redo:", err);
        if (typeof callback === "function") callback(false);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      rooms.removeUser(roomId, socket.id);
      const remainingUsers = rooms.listUsers(roomId);
      io.to(roomId).emit("presence", { users: remainingUsers });
      console.log(`📴 Disconnected: ${socket.id} (${remainingUsers.length} users left in ${roomId})`);
    });

    // Error handling
    socket.on("error", (err) => {
      console.error("❌ Socket error:", socket.id, err);
    });
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
