const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const ACTIONS = require('./Actions');
require('dotenv').config();
const path = require('path');
const app = express();
const server = http.createServer(app);
const _dirname = path.resolve();
// Language configuration
const languageConfig = {
  python3: { versionIndex: '3' },
  java: { versionIndex: '3' },
  cpp: { versionIndex: '4' },
  nodejs: { versionIndex: '3' },
  c: { versionIndex: '4' },
  ruby: { versionIndex: '3' },
  go: { versionIndex: '3' },
  scala: { versionIndex: '3' },
  bash: { versionIndex: '3' },
  sql: { versionIndex: '3' },
  pascal: { versionIndex: '2' },
  csharp: { versionIndex: '3' },
  php: { versionIndex: '3' },
  swift: { versionIndex: '3' },
  rust: { versionIndex: '3' },
  r: { versionIndex: '3' },
};

app.use(cors());
app.use(express.json());
const io = new Server(server, {
  cors: {
    origin: 'https://codesync-hmt6.onrender.com',
    methods: ['GET', 'POST'],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

const userSocketMap = {};
const roomSocketMap = {};

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
    })
  );
};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    if (!roomId || !username) {
      socket.disconnect();
      return;
    }

    userSocketMap[socket.id] = username;
    roomSocketMap[socket.id] = roomId;
    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  socket.on(ACTIONS.LEAVE, () => {
    const roomId = roomSocketMap[socket.id];
    const username = userSocketMap[socket.id];
    
    if (roomId && username) {
      socket.leave(roomId);
      const remainingClients = getAllConnectedClients(roomId);
      
      io.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
        remainingClients
      });
      
      delete userSocketMap[socket.id];
      delete roomSocketMap[socket.id];
      socket.emit(ACTIONS.LEFT);
    }
  });

  socket.on('disconnect', () => {
    const roomId = roomSocketMap[socket.id];
    const username = userSocketMap[socket.id];
    
    if (roomId && username) {
      socket.leave(roomId);
      const remainingClients = getAllConnectedClients(roomId);
      
      io.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
        remainingClients
      });
      
      delete userSocketMap[socket.id];
      delete roomSocketMap[socket.id];
    }
  });
});

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.kDoodle_clientSecret,
    });

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const buildPath = path.join(__dirname, '..', 'client', 'build');

app.use(express.static(buildPath));

app.get('*', (_, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});
