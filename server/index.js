import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import ACTIONS from './Actions.js'; // 👈 must include .js extension

dotenv.config();

const app = express();
const server = http.createServer(app);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ✅ JDoodle supported languages
const languageConfig = {
  python3: { versionIndex: '3' },
  java: { versionIndex: '4' },
  cpp: { versionIndex: '0' },
  nodejs: { versionIndex: '3' },
  c: { versionIndex: '4' },
  ruby: { versionIndex: '0' },
  go: { versionIndex: '0' },
  php: { versionIndex: '3' },
  scala: { versionIndex: '3' },
  bash: { versionIndex: '3' },
  sql: { versionIndex: '3' },
  pascal: { versionIndex: '2' },
  csharp: { versionIndex: '3' },
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

app.post('/compile', async (req, res) => {
  const { code, language, roomId } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  if (!languageConfig[language]) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  try {
    console.log("🔹 Compiling with JDoodle:", {
      language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.JDOODLE_CLIENT_ID ? "SET" : "MISSING"
    });

    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    if (roomId) {
      io.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, {
        output: response.data
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('❌ Compilation error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to compile code',
      details: error.response?.data || error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ✅ Serve React build files
const buildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(buildPath));

app.get('*', (_, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});
