const jwt = require('jsonwebtoken');
const users = require('../services/users');

// The JWT only carries the user id; role/status/surgeon link are re-read on
// every request so disabling or re-linking a user takes effect immediately.
function resolveUser(token) {
  if (!token) return { error: 'Not authenticated' };
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return { error: 'Invalid or expired token' };
  }
  const user = users.findById(payload.sub);
  if (!user) return { error: 'Account no longer exists' };
  if (user.status !== 'active') return { error: 'Account is not active' };
  if (user.role === 'surgeon' && !user.surgeonId) return { error: 'Account is not linked to a surgeon profile' };
  return { user: users.publicUser(user) };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const { user, error } = resolveUser(token);
  if (error) return res.status(401).json({ message: error });
  req.user = user;
  next();
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'You do not have access to this resource' });

function socketAuth(socket, next) {
  const { user, error } = resolveUser(socket.handshake.auth?.token);
  if (error) return next(new Error(error));
  socket.user = user;
  next();
}

module.exports = { requireAuth, requireRole, socketAuth, resolveUser };
