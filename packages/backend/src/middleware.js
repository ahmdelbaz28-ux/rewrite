/**
 * Express middleware: error handler and auth helpers.
 */

'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT_SECRET is read lazily to ensure dotenv has been loaded first
let _jwtSecret = null;
function getJwtSecret() {
  if (!_jwtSecret) {
    _jwtSecret = process.env.JWT_SECRET;
  }
  if (!_jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set. Please configure it in .env');
  }
  return _jwtSecret;
}
const JWT_EXPIRY = '24h';

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  const status = err.status || 500;
  const response = {
    error: err.message || 'Internal server error'
  };
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  res.status(status).json(response);
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

function signAdminToken(adminId, username, role) {
  return jwt.sign({ adminId, username, role }, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── API Key Auth ─────────────────────────────────────────────────────────────

function requireApiKey(scope) {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }
    const db = require('./db').getDb();
    const key = db.prepare('SELECT * FROM api_keys WHERE key = ? AND revoked = 0').get(apiKey);
    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    const scopes = JSON.parse(key.scopes || '[]');
    if (scope && !scopes.includes(scope) && !scopes.includes('*')) {
      return res.status(403).json({ error: `Insufficient scope. Required: ${scope}` });
    }
    db.prepare('UPDATE api_keys SET last_used = ? WHERE key = ?').run(Date.now(), apiKey);
    req.apiKey = key;
    next();
  };
}

// ─── Async Handler Wrapper ────────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  signAdminToken,
  requireAdmin,
  requireApiKey,
  asyncHandler,
  getJwtSecret,
  bcrypt
};
