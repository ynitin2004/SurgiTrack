require('dotenv').config();
const fs = require('fs');
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
// comma-separated list, e.g. "https://surgitrack.vercel.app,http://localhost:5173"
const ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Hosting dashboards often keep the quotes that .env needs around the bcrypt
// hash ('$2a$...'); strip them so the admin login still works.
if (/^(['"]).*\1$/.test(process.env.ADMIN_PASSWORD_HASH || '')) {
  process.env.ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH.slice(1, -1);
}

// Name every missing setting up front instead of failing somewhere deeper.
function checkEnv() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]?.trim());
  if (missing.length) throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
    console.warn('warning: ADMIN_EMAIL / ADMIN_PASSWORD_HASH not set — the built-in admin login is disabled');
  } else if (!/^\$2[aby]\$\d{2}\$/.test(process.env.ADMIN_PASSWORD_HASH)) {
    console.warn('warning: ADMIN_PASSWORD_HASH does not look like a bcrypt hash ($2a$/$2b$…) — admin login will fail');
  }
}

async function main() {
  checkEnv();
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
  const hint = /ECONNREFUSED|ENOTFOUND|querySrv|Server selection timed out|IP.*whitelist|not authorized|bad auth|Authentication failed/i.test(
    `${err.message} ${err.reason?.message || ''}`
  )
    ? ' — check MONGODB_URI and that MongoDB Atlas Network Access allows this server (e.g. 0.0.0.0/0)'
    : '';
  // synchronous writes to stdout AND stderr: async console output to a pipe
  // can be lost when the process exits (this is what hid errors on Render)
  const text = `startup failed: ${err.message}${hint}\n${err.stack || ''}\n`;
  for (const fd of [1, 2]) {
    try {
      fs.writeSync(fd, text);
    } catch {
      /* stream closed */
    }
  }
  process.exit(1);
});
