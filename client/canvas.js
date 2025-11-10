// client/canvas.js
import { socket } from "./websocket.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const cursorCanvas = document.getElementById("cursor-layer");
const cursorCtx = cursorCanvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight - 48);
cursorCanvas.width = window.innerWidth;
cursorCanvas.height = window.innerHeight - 48;

let drawing = false;
let tool = "brush";
let color = "#000000";
let size = 4;

let localId = null;
let localPoints = [];
let lastEmit = 0;
const EMIT_INTERVAL = 16; // ~60fps
const TOOLBAR_HEIGHT = 48;

const cursors = {}; // userId -> {x, y, color, name}
let history = []; // all operations

// Resize handler
window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight - TOOLBAR_HEIGHT;
  redrawAll();
});

//
// 🟢 Draw a smooth stroke using quadratic Bézier curves
//
function drawOp(op) {
  const pts = op.points;
  if (!pts || pts.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = op.width;
  ctx.strokeStyle = op.color;
  ctx.fillStyle = op.color;
  ctx.globalCompositeOperation =
    op.tool === "eraser" ? "destination-out" : "source-over";

  if (pts.length === 1) {
    // draw a dot
    const [x, y] = pts[0];
    ctx.beginPath();
    ctx.arc(x, y, op.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // smooth line
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i][0] + pts[i + 1][0]) / 2;
    const midY = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], midX, midY);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.stroke();
  ctx.restore();
}

//
// 🟢 Redraw entire canvas (used after undo/redo/clear)
//
function redrawAll() {
  ctx.clearRect(0, 0, width, height);
  for (const op of history) {
    // Fallback: treat missing active as true (active by default)
    if (op.active !== false) drawOp(op);
  }
}

//
// 🟢 Draw other users' cursors (with simple layer management)
//
function renderCursors() {
  // Clear only the cursor area by redrawing everything, then cursors
  // For better performance with many users, consider a separate canvas layer
  for (const id in cursors) {
    const c = cursors[id];
    if (!c) continue;
    
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = c.color || "#000";
    ctx.fill();
    
    ctx.font = "12px Arial";
    ctx.fillStyle = c.color || "#000";
    ctx.fillText(c.name || "User", c.x + 8, c.y - 8);
  }
}

// 📐 Smooth render loop for cursors only (don't clear entire canvas)
function renderLoop() {
  renderCursors();
  requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);

//
// 🟢 Drawing controls
//
function startDraw(x, y) {
  drawing = true;
  localId = crypto.randomUUID();
  localPoints = [[x, y]];
  socket.emit("op:begin", { localId, tool, color, width: size });
  lastEmit = Date.now();

  // Draw dot immediately
  drawOp({ tool, color, width: size, points: [[x, y]] });
}

function moveDraw(x, y) {
  if (!drawing) return;

  const pt = [x, y];
  localPoints.push(pt);

  // ✅ Immediately render local segment (smooth)
  if (localPoints.length > 1) {
    const last2 = localPoints.slice(-2);
    drawOp({
      tool,
      color,
      width: size,
      points: last2,
    });
  }

  // ✅ Throttle send to server
  const now = Date.now();
  if (now - lastEmit > EMIT_INTERVAL) {
    socket.emit("op:points", { localId, points: localPoints.slice() });
    localPoints = localPoints.slice(-2); // keep last 2 points
    lastEmit = now;
  }
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  socket.emit("op:end", { localId });
  localId = null;
  localPoints = [];
}

//
// 🟢 Pointer event listeners
//
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  startDraw(e.clientX, e.clientY - TOOLBAR_HEIGHT);
});

canvas.addEventListener("pointermove", (e) => {
  socket.emit("cursor", { x: e.clientX, y: e.clientY - TOOLBAR_HEIGHT });
  if (drawing) moveDraw(e.clientX, e.clientY - TOOLBAR_HEIGHT);
});

canvas.addEventListener("pointerup", (e) => {
  canvas.releasePointerCapture(e.pointerId);
  endDraw();
});

canvas.addEventListener("pointercancel", endDraw);

//
// 🟢 WebSocket event handlers
//
socket.on("joined", ({ history: h, users }) => {
  history = h;
  redrawAll();
  renderUserList(users);
  console.log("✅ Joined room with", users.length, "users");
});

socket.on("presence", ({ users }) => {
  renderUserList(users);
  const currentIds = users.map((u) => u.id);
  for (const id in cursors) {
    if (!currentIds.includes(id)) delete cursors[id];
  }
});

socket.on("op:apply", (op) => {
  // Skip echo of your own live points (no opId means in-progress)
  if (op.author === socket.id && op.opId === null) return;

  if (op.opId) history.push(op);
  drawOp(op);
});

socket.on("op:toggle", (toggled) => {
  if (!toggled || !toggled.opId) {
    console.warn("⚠️ Invalid toggle data:", toggled);
    return;
  }
  
  const target = history.find((o) => o && o.opId === toggled.opId);
  if (target) {
    const prevState = target.active;
    target.active = toggled.active;
    console.log(`📐 Toggle op ${toggled.opId.slice(0, 8)}: ${prevState} → ${toggled.active}`);
    redrawAll();
  } else {
    console.warn("⚠️ Toggle target not found:", toggled.opId);
  }
});

socket.on("cursor", ({ x, y, userId, color, name }) => {
  cursors[userId] = { x, y, color, name };
});

socket.on("disconnect", () => {
  console.warn("⚠️ Disconnected from server");
  cursors = {};
});

socket.on("error", (err) => {
  console.error("❌ Socket error:", err);
});

//
// 🟢 Render user list (color-coded names)
//
function renderUserList(users) {
  const container = document.getElementById("users");
  if (!container) return;
  
  container.innerHTML = "";

  users.forEach((u) => {
    const wrapper = document.createElement("span");
    wrapper.style.marginRight = "12px";
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";

    const dot = document.createElement("span");
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.borderRadius = "50%";
    dot.style.background = u.color || "#ccc";
    dot.style.display = "inline-block";
    dot.style.marginRight = "5px";

    const nameEl = document.createElement("span");
    nameEl.textContent = u.name || "Anonymous";
    nameEl.style.color = u.color || "#000";
    nameEl.style.fontWeight = "bold";
    nameEl.style.fontSize = "13px";

    wrapper.appendChild(dot);
    wrapper.appendChild(nameEl);
    container.appendChild(wrapper);
  });
}

//
// 🟢 Tool setters
//
export function setTool(t) {
  tool = t;
}
export function setColor(c) {
  color = c;
}
export function setSize(s) {
  size = s;
}

console.log("✅ canvas.js loaded with instant drawing feedback & smooth strokes");
