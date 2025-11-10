
# 🎨 Real-Time Collaborative Drawing Canvas

A real-time, multi-user collaborative drawing application built with **Node.js**, **WebSockets (Socket.io)**, and **HTML5 Canvas** — allowing multiple users to draw simultaneously with live synchronization, user cursors, color indicators, and global undo/redo.

---

## 🚀 Setup Instructions

### 1. Clone the repository Install dependencies
```bash
git clone https://github.com/<your-username>/Real-Time Collaborative Drawing Canvas.git
cd Real-Time Collaborative Drawing Canvas
```
### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Start the server
```bash
npm start
```
The app will run at http://localhost:3000


### **How to Test with Multiple Users**

Open two or more browser tabs pointing to http://localhost:3000.

Enter different names when prompted.

Each user gets a unique color and visible cursor.

### Try the following:

Draw simultaneously in both tabs.

Use Eraser tool to remove content.

Test Undo / Redo buttons — they apply globally.

Watch how both canvases stay perfectly synchronized.



### 🧩 Features Implemented
| Feature                          | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| ✏️ **Brush & Eraser**            | Draw smooth, curved strokes with real erasing (transparent pixels)  |
| 🧍‍♂️ **User Indicators**        | Each user gets a unique color + visible name label                  |
| 🖱️ **Live Cursor Tracking**     | See all active users’ cursors in real-time                          |
| ⏪ **Global Undo/Redo**           | Shared operation history using LIFO stacks on the server            |
| 🧠 **Optimized Drawing Engine**  | Bézier curve smoothing, throttled updates, efficient redrawing      |
| ⚡ **Low Latency Real-Time Sync** | Uses Socket.io for event streaming and delta updates                |
| 🧱 **Robust Architecture**       | Clean separation between client (Canvas/UI) and server (State/Sync) |



### 🧪 Known Limitations / Bugs

Canvas state is stored in-memory (no persistence on server restart).

No user authentication (temporary names only).

If many users draw simultaneously on the same area, eraser vs brush conflicts follow “last write wins”.

Latency compensation for remote users is partial — future versions can interpolate network gaps for smoother remote playback.

Undo/Redo is global, not per-user.



### ⏰ Time Spent on Project
| Phase                         | Time Spent    |
| ----------------------------- | ------------- |
| Architecture & Setup          | ~3 hours      |
| Canvas Engine & Drawing Tools | ~6 hours      |
| Real-Time WebSocket Sync      | ~4 hours      |
| Undo/Redo Logic & Testing     | ~3 hours      |
| UI Polish & Cursor Indicators | ~2 hours      |
| Documentation & Final Cleanup | ~2 hours      |
| **Total**                     | **~20 hours** |




### **Tech Stack**

Frontend: Vanilla JavaScript + HTML5 Canvas

Backend: Node.js + Express + Socket.io

No frameworks, no drawing libraries

Design Principles: Event-driven architecture, minimal latency, modular codebase