// server/drawing-state.js
const { v4: uuidv4 } = require("uuid");

class DrawingState {
  constructor() {
    this._ops = [];               // All drawing operations
    this._seq = 0;
    this._pending = new Map();    // localId -> partial op
    this._undoStack = [];         // IDs of active ops (for undo)
    this._redoStack = [];         // IDs of undone ops (for redo)
  }

  _nextSeq() {
    return ++this._seq;
  }

  getHistory() {
    return this._ops;
  }

  receiveBegin(op, cb) {
    const partial = {
      localId: op.localId,
      tool: op.tool,
      color: op.color,
      width: op.width,
      author: op.author,
      points: [],
    };
    this._pending.set(op.localId, partial);
    cb({
      opId: null,
      localId: op.localId,
      ...partial,
      seq: this._seq + 1,
    });
  }

  receivePoints(packet, cb) {
    const partial = this._pending.get(packet.localId);
    if (!partial) return;
    partial.points.push(...packet.points);
    cb({
      opId: null,
      localId: packet.localId,
      ...partial,
      points: packet.points,
      seq: this._seq + 1,
    });
  }

  receiveEnd(end, cb) {
    const partial = this._pending.get(end.localId);
    if (!partial) return;
    const opId = uuidv4();
    const op = {
      opId,
      ...partial,
      timestamp: Date.now(),
      seq: this._nextSeq(),
      active: true,
    };
    this._ops.push(op);
    this._pending.delete(end.localId);

    // add to undo stack
    this._undoStack.push(opId);
    this._redoStack = []; // reset redo stack when new op happens

    cb(op);
  }

  // Global Undo (LIFO)
  undo() {
    if (this._undoStack.length === 0) return null;

    const opId = this._undoStack.pop();
    const op = this._ops.find((o) => o.opId === opId);
    if (!op) return null;
    op.active = false;

    this._redoStack.push(opId);

    return { opId: op.opId, active: false };
  }

  // Global Redo (LIFO)
  redo() {
    if (this._redoStack.length === 0) return null;

    const opId = this._redoStack.pop();
    const op = this._ops.find((o) => o.opId === opId);
    if (!op) return null;
    op.active = true;

    this._undoStack.push(opId);

    return { opId: op.opId, active: true };
  }
}

module.exports = DrawingState;