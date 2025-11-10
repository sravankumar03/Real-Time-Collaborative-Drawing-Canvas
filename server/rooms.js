// server/rooms.js
const DrawingState = require("./drawing-state");

class Rooms {
  constructor() {
    this._rooms = new Map();
  }

  _ensure(roomId) {
    if (!this._rooms.has(roomId)) {
      this._rooms.set(roomId, {
        users: new Map(),
        state: new DrawingState(),
      });
    }
    return this._rooms.get(roomId);
  }

  addUser(roomId, socketId, user) {
    const r = this._ensure(roomId);
    // store user object directly { id, name, color }
    r.users.set(socketId, { id: socketId, ...user });
  }

  removeUser(roomId, socketId) {
    const r = this._ensure(roomId);
    r.users.delete(socketId);
  }

  listUsers(roomId) {
    const r = this._ensure(roomId);
    return Array.from(r.users.values());
  }

  getState(roomId) {
    const r = this._ensure(roomId);
    return r.state;
  }
}

module.exports = Rooms;