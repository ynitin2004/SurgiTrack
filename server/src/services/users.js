const bcrypt = require('bcryptjs');
const store = require('../store/store');

// The bootstrap admin from .env always exists and cannot be edited or disabled
// from the UI, so the portal can never lock every admin out.
const ENV_ADMIN_ID = 'env-admin';

function envAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (!email || !process.env.ADMIN_PASSWORD_HASH) return null;
  return {
    id: ENV_ADMIN_ID,
    name: process.env.ADMIN_NAME || 'Admin',
    email,
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    role: 'admin',
    status: 'active',
    surgeonId: null,
    builtIn: true,
  };
}

const normEmail = (e) => String(e || '').trim().toLowerCase();

function findById(id) {
  if (id === ENV_ADMIN_ID) return envAdmin();
  return store.load().users.find((u) => u.id === id) || null;
}

function findByEmail(email) {
  const e = normEmail(email);
  const admin = envAdmin();
  if (admin && admin.email === e) return admin;
  return store.load().users.find((u) => u.email === e) || null;
}

// Another non-disabled account already linked to this surgeon profile?
function findSurgeonOwner(surgeonId, exceptUserId) {
  return (
    store
      .load()
      .users.find((u) => u.surgeonId === surgeonId && u.status !== 'disabled' && u.id !== exceptUserId) || null
  );
}

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateNewUser({ name, email, password }) {
  const errors = {};
  if (!String(name || '').trim() || String(name).trim().length < 2) errors.name = 'Name is required';
  if (!EMAIL_RX.test(normEmail(email))) errors.email = 'Enter a valid email address';
  else if (findByEmail(email)) errors.email = 'An account with this email already exists';
  if (typeof password !== 'string' || password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = 'Password must contain letters and numbers';
  return Object.keys(errors).length ? errors : null;
}

async function createUser({ name, email, password, role, status, surgeonId = null, hospital = '', createdBy }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const db = store.load();
  // re-check after the await: another request may have taken the email meanwhile
  if (findByEmail(email)) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }
  const user = {
    id: store.newId(),
    name: String(name).trim(),
    email: normEmail(email),
    passwordHash,
    role,
    status,
    surgeonId,
    hospital: String(hospital || '').trim(),
    createdAt: store.now(),
    createdBy: createdBy || 'self-registration',
    approvedAt: status === 'active' ? store.now() : null,
    approvedBy: status === 'active' ? createdBy || null : null,
  };
  db.users.push(user);
  await store.persist();
  return user;
}

module.exports = {
  ENV_ADMIN_ID,
  findById,
  findByEmail,
  findSurgeonOwner,
  publicUser,
  validateNewUser,
  createUser,
  normEmail,
};
