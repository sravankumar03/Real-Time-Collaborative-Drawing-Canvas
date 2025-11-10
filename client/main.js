// client/main.js
import { socket, joinRoom } from "./websocket.js";
import { setTool, setColor, setSize } from "./canvas.js";

// Get user name
const name = prompt("Enter your name:") || "Anonymous";

// Get room ID from URL or use default
const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") || "main";

joinRoom(roomId, name);
console.log(`📍 Joining room: ${roomId} as ${name}`);

// Color picker
const colorInput = document.getElementById("color");
if (colorInput) {
  colorInput.addEventListener("input", (e) => {
    setColor(e.target.value);
  });
}

// Size slider with value display
const sizeInput = document.getElementById("size");
const sizeDisplay = document.getElementById("size-display");
if (sizeInput) {
  sizeInput.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    setSize(val);
    if (sizeDisplay) {
      sizeDisplay.textContent = val;
    }
  });
  // Set initial display
  if (sizeDisplay) {
    sizeDisplay.textContent = sizeInput.value;
  }
}

// Tool buttons
const brushBtn = document.getElementById("brush");
const eraserBtn = document.getElementById("eraser");

if (brushBtn) {
  brushBtn.addEventListener("click", () => {
    setTool("brush");
    updateToolButtons("brush");
  });
}

if (eraserBtn) {
  eraserBtn.addEventListener("click", () => {
    setTool("eraser");
    updateToolButtons("eraser");
  });
}

// Undo / Redo with error handling
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");

if (undoBtn) {
  undoBtn.addEventListener("click", () => {
    socket.emit("undo", {}, (ack) => {
      if (!ack) console.warn("⚠️ Undo failed or no history");
    });
  });
}

if (redoBtn) {
  redoBtn.addEventListener("click", () => {
    socket.emit("redo", {}, (ack) => {
      if (!ack) console.warn("⚠️ Redo failed or nothing to redo");
    });
  });
}

// Helper: Update button active states
function updateToolButtons(active) {
  if (brushBtn) {
    brushBtn.style.fontWeight = active === "brush" ? "bold" : "normal";
    brushBtn.style.background = active === "brush" ? "#ddd" : "";
  }
  if (eraserBtn) {
    eraserBtn.style.fontWeight = active === "eraser" ? "bold" : "normal";
    eraserBtn.style.background = active === "eraser" ? "#ddd" : "";
  }
}

// Initialize button states
updateToolButtons("brush");

// Connection feedback
socket.on("connect", () => {
  console.log("✅ Connected to server");
});

socket.on("disconnect", () => {
  console.warn("❌ Disconnected from server - attempting to reconnect...");
});