require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const routes = require('./routes');
const store = require('./store/store');
const notify = require('./sockets/notify');
const { socketAuth } = require('./middleware/auth');
const { initChangeStreams } = require('./sockets/changeStreams');

const PORT = process.env.PORT || 5000;
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function main() {
  store.load(); // fail fast if the app store file is unreadable
  await connectDB();

  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.use(express.json({ limit: '50kb' }));
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api', routes);

  // express 5: async route errors propagate here automatically
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
    console.error('API error:', err);
    res.status(500).json({ message: 'Internal server error' });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: ORIGIN } });
  notify.attach(io);
  io.use(socketAuth);
  io.on('connection', (socket) => {
    const u = socket.user;
    socket.join(`user:${u.id}`);
    if (u.role === 'admin') socket.join('admins');
    if (u.role === 'surgeon') socket.join(`surgeon:${u.surgeonId}`);
    console.log(`socket connected: ${u.email} (${u.role})`);
  });

  initChangeStreams();

  server.listen(PORT, () => console.log(`API + Socket.IO on http://localhost:${PORT} (app store: ${store.FILE})`));
}

main().catch((err) => {
  console.error('startup failed:', err);
  process.exit(1);
});
