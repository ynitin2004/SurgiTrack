const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../services/users');
const notify = require('../sockets/notify');

// Simple in-memory brute-force guard: 5 failed attempts per email+IP per 15 min.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

function tooManyAttempts(key) {
  const f = failures.get(key);
  if (!f) return false;
  if (Date.now() - f.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return f.count >= MAX_FAILS;
}

function recordFailure(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
  else f.count++;
}

const signToken = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const key = `${users.normEmail(email)}|${req.ip}`;
  if (tooManyAttempts(key)) {
    return res.status(429).json({ message: 'Too many failed attempts. Try again in 15 minutes.' });
  }

  const user = users.findByEmail(email);
  const ok = user && (await bcrypt.compare(String(password), user.passwordHash));
  if (!ok) {
    recordFailure(key);
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  failures.delete(key);

  if (user.status === 'pending') {
    return res.status(403).json({ code: 'PENDING', message: 'Your account is awaiting admin approval.' });
  }
  if (user.status === 'disabled') {
    return res.status(403).json({ code: 'DISABLED', message: 'Your account has been disabled. Contact an administrator.' });
  }
  if (user.role === 'surgeon' && !user.surgeonId) {
    return res.status(403).json({ code: 'UNLINKED', message: 'Your account is not linked to a surgeon profile yet.' });
  }

  res.json({ token: signToken(user), user: users.publicUser(user) });
}

// Public self-registration: always creates a *pending surgeon* account. An admin
// must approve it and link it to the matching surgeon_info profile.
async function register(req, res) {
  const { name, email, password, hospital } = req.body || {};
  const errors = users.validateNewUser({ name, email, password });
  if (errors) return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
  await users.createUser({ name, email, password, hospital, role: 'surgeon', status: 'pending' });
  notify.admins('user:registered', { name: String(name).trim() });
  res.status(201).json({ message: 'Registration received. An administrator will review your account.' });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, register, me };
