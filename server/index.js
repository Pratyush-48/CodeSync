import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import ACTIONS from './Actions.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['https://codesync-hmt6.onrender.com', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ['https://codesync-hmt6.onrender.com', 'http://localhost:3000'],
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
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  
  return Array.from(room).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
};

// Socket.io connection handling
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
    
    // Notify all clients in the room about the new user
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // Handle code changes and broadcast to room
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Sync code with a specific client (when they join)
  socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
    if (io.sockets.sockets.has(socketId)) {
      io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    }
  });

  // Handle language changes and broadcast to room
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  // Handle output changes and broadcast to room
  socket.on(ACTIONS.OUTPUT_CHANGE, ({ roomId, output }) => {
    socket.in(roomId).emit(ACTIONS.OUTPUT_CHANGE, { output });
  });

  // Handle user leaving intentionally
  socket.on(ACTIONS.LEAVE, () => {
    const roomId = roomSocketMap[socket.id];
    const username = userSocketMap[socket.id];
    
    if (roomId && username) {
      socket.leave(roomId);
      const remainingClients = getAllConnectedClients(roomId);
      
      // Notify remaining clients
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
        remainingClients
      });
      
      // Clean up
      delete userSocketMap[socket.id];
      delete roomSocketMap[socket.id];
      socket.emit(ACTIONS.LEFT);
    }
  });

  // Handle disconnection (network issues, etc.)
  socket.on('disconnect', () => {
    const roomId = roomSocketMap[socket.id];
    const username = userSocketMap[socket.id];
    
    if (roomId && username) {
      socket.leave(roomId);
      const remainingClients = getAllConnectedClients(roomId);
      
      // Notify remaining clients
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username,
        remainingClients
      });
      
      // Clean up
      delete userSocketMap[socket.id];
      delete roomSocketMap[socket.id];
    }
    
    console.log('User disconnected:', socket.id);
  });

  // Handle connection errors
  socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message);
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CodeSync Server is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/rooms', (req, res) => {
  const rooms = {};
  io.sockets.adapter.rooms.forEach((_, roomId) => {
    if (!io.sockets.adapter.sids.has(roomId)) { // Exclude individual socket rooms
      rooms[roomId] = getAllConnectedClients(roomId);
    }
  });
  res.json({ rooms });
});

app.post('/api/compile', async (req, res) => {
  const { code, language, roomId } = req.body;

  // Validate request
  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  if (!languageConfig[language]) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  try {
    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    // Broadcast output to all clients in the room if roomId is provided
    if (roomId) {
      const output = response.data.output || JSON.stringify(response.data);
      io.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, { output });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Compilation error:', error);
    
    const errorMessage = error.response?.data?.error || error.message || 'Failed to compile code';
    
    // Broadcast error to all clients in the room if roomId is provided
    if (roomId) {
      io.to(roomId).emit(ACTIONS.OUTPUT_CHANGE, { 
        output: `Error: ${errorMessage}` 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to compile code',
      details: errorMessage 
    });
  }
});

// Serve static files from React build directory (for production)
const buildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(buildPath));

// Handle React routing - return all requests to React app (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/health`);
  
  // Log environment info
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${['https://codesync-hmt6.onrender.com', 'http://localhost:3000'].join(', ')}`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
