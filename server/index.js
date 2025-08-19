const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// Enable CORS
app.use(cors({
  origin: ["https://codesync-hmt6.onrender.com", "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Add a root route handler to fix "Cannot GET /" error
app.get("/", (req, res) => {
  res.json({ message: "CodeSync Server is running!" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

const io = new Server(server, {
  cors: {
    origin: ["https://codesync-hmt6.onrender.com", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  
  return Array.from(room).map((socketId) => {
    return {
      socketId,
      username: userSocketMap[socketId],
    };
  });
};

io.on("connection", (socket) => {
  console.log('Socket connected', socket.id);
  
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    
    // notify that new user joined
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // sync the code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  
  // when new user joins the room, sync the existing code
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // handle disconnection
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
  });

  socket.on("disconnect", () => {
    console.log('Socket disconnected', socket.id);
  });
});

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  // Validate request
  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }

  if (!languageConfig[language]) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Compilation error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to compile code",
      details: error.response?.data || error.message
    });
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
