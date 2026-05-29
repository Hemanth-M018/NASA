const express = require('express');
const mongoose = require('mongoose');
let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (e) {
  MongoMemoryServer = null;
}
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? (process.env.CLIENT_URL || "http://localhost:3000") : '*',
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
const corsOrigin = process.env.NODE_ENV === 'production' ? (process.env.CLIENT_URL || 'http://localhost:3000') : '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api/', limiter);

// MongoDB connection – non-fatal, app works in memory-mode if DB is unavailable
let dbConnected = false;
async function connectDatabase() {
  const serverSelectionTimeoutMS = 5000; // fail fast so server still boots
  const uriFromEnv = process.env.MONGODB_URI;
  if (uriFromEnv) {
    try {
      await mongoose.connect(uriFromEnv, { serverSelectionTimeoutMS });
      console.log('MongoDB connected successfully (env URI)');
      dbConnected = true;
      return;
    } catch (err) {
      console.warn('MongoDB (env) unavailable –', err.message);
    }
  }

  // Try local MongoDB first
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/nasa-explorer', { serverSelectionTimeoutMS });
    console.log('MongoDB connected successfully (local)');
    dbConnected = true;
    return;
  } catch (err) {
    console.warn('Local MongoDB unavailable –', err.message);
  }

  // Optionally fall back to in-memory MongoDB if explicitly enabled
  if (process.env.ENABLE_INMEMORY === 'true' && MongoMemoryServer) {
    try {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { serverSelectionTimeoutMS });
      console.log('MongoDB running in-memory (mongodb-memory-server)');
      dbConnected = true;
      return;
    } catch (err) {
      console.warn('In-memory MongoDB failed to start –', err.message);
    }
  }

  console.warn('MongoDB unavailable – running in memory mode without persistence');
}

// Attach db status to every request
app.use((req, res, next) => {
  req.dbConnected = dbConnected;
  next();
});

// Routes
app.use('/api/images', require('./routes/images'));
app.use('/api/annotations', require('./routes/annotations'));
app.use('/api/search', require('./routes/search'));
app.use('/api/datasets', require('./routes/datasets'));
app.use('/api/markers', require('./routes/markers'));
app.use('/api/geocode', require('./routes/geocode'));
app.use('/api/automap', require('./routes/automap'));

// Root route - helpful index when visiting the backend in a browser
app.get('/', (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  res.send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>NASA Image Explorer API</title>
        <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:20px}</style>
      </head>
      <body>
        <h1>NASA Image Explorer API</h1>
        <p>API is running. Open the client at <a href="${clientUrl}" target="_blank">${clientUrl}</a></p>
        <ul>
          <li><a href="/api/health">/api/health</a></li>
          <li><a href="/api/images">/api/images</a></li>
          <li><a href="/api/annotations">/api/annotations</a></li>
          <li><a href="/api/search">/api/search</a></li>
          <li><a href="/api/datasets">/api/datasets</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: dbConnected ? 'connected' : 'memory-mode', uptime: process.uptime() });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Socket.io for real-time collaboration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });
  socket.on('annotation-update', (data) => {
    socket.to(data.roomId).emit('annotation-updated', data);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
(async () => {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('Error connecting to database (continuing without DB):', err && err.message ? err.message : err);
  }
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
