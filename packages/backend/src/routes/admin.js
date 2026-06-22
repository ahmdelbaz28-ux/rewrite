/**
 * Admin routes: dashboard, license management, analytics
 * All routes require admin JWT.
 */

'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const db = require('../db').getDb;
const { asyncHandler, requireAdmin, signAdminToken, bcrypt } = require('../middleware');
const { signLicenseToken, TIER_FEATURES } = require('@smartlangguard/core');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

// ─── POST /v1/admin/login ─────────────────────────────────────────────────────

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const admin = db().prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAdminToken(admin.id, admin.username, admin.role);
  res.json({ token, username: admin.username, role: admin.role });
}));

// ─── All routes below require admin auth ──────────────────────────────────────

router.use(requireAdmin);

// ─── GET /v1/admin/licenses ───────────────────────────────────────────────────

router.get('/licenses', asyncHandler(async (req, res) => {
  const { tier, status, limit = 50, offset = 0 } = req.query;
  
  let query = 'SELECT id, token, tier, email, max_devices, expires_at, created_at, revoked FROM licenses WHERE 1=1';
  const params = [];
  
  if (tier) {
    query += ' AND tier = ?';
    params.push(tier);
  }
  if (status === 'active') {
    query += ' AND revoked = 0 AND (expires_at = 0 OR expires_at > ?)';
    params.push(Date.now());
  } else if (status === 'revoked') {
    query += ' AND revoked = 1';
  } else if (status === 'expired') {
    query += ' AND expires_at < ? AND revoked = 0';
    params.push(Date.now());
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const licenses = db().prepare(query).all(...params);
  const total = db().prepare('SELECT COUNT(*) as count FROM licenses').get().count;
  
  res.json({ licenses, total, limit: parseInt(limit), offset: parseInt(offset) });
}));

// ─── POST /v1/admin/licenses ──────────────────────────────────────────────────

router.post('/licenses', asyncHandler(async (req, res) => {
  const { tier = 'pro', email, max_devices, expires_in_days = 30 } = req.body;
  
  if (!TIER_FEATURES[tier]) {
    return res.status(400).json({ error: `Invalid tier: ${tier}` });
  }
  
  const token = 'slg_' + crypto.randomBytes(16).toString('hex');
  const features = JSON.stringify(TIER_FEATURES[tier]);
  const maxDev = max_devices || (tier === 'free' ? 1 : tier === 'pro' ? 3 : tier === 'team' ? 10 : 100);
  const expiresAt = Date.now() + (expires_in_days * 24 * 60 * 60 * 1000);
  
  db().prepare(
    `INSERT INTO licenses (token, tier, email, features, max_devices, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(token, tier, email || null, features, maxDev, expiresAt, Date.now(), Date.now());
  
  res.status(201).json({
    token,
    tier,
    email,
    features: TIER_FEATURES[tier],
    max_devices: maxDev,
    expires_at: expiresAt
  });
}));

// ─── DELETE /v1/admin/licenses/:token ─────────────────────────────────────────

router.delete('/licenses/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = db().prepare('UPDATE licenses SET revoked = 1, updated_at = ? WHERE token = ?')
    .run(Date.now(), token);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'License not found' });
  }
  
  res.json({ success: true });
}));

// ─── GET /v1/admin/dashboard ──────────────────────────────────────────────────

router.get('/dashboard', asyncHandler(async (req, res) => {
  const totalLicenses = db().prepare('SELECT COUNT(*) as count FROM licenses').get().count;
  const activeLicenses = db().prepare(
    'SELECT COUNT(*) as count FROM licenses WHERE revoked = 0 AND (expires_at = 0 OR expires_at > ?)'
  ).get(Date.now()).count;
  
  const byTier = db().prepare(
    'SELECT tier, COUNT(*) as count FROM licenses GROUP BY tier'
  ).all();
  
  const totalDevices = db().prepare('SELECT COUNT(*) as count FROM devices').get().count;
  const activeDevices7d = db().prepare(
    'SELECT COUNT(DISTINCT fingerprint) as count FROM devices WHERE last_seen > ?'
  ).get(Date.now() - 7 * 24 * 60 * 60 * 1000).count;
  
  const totalEvents = db().prepare('SELECT COUNT(*) as count FROM telemetry_events').get().count;
  const events24h = db().prepare(
    'SELECT COUNT(*) as count FROM telemetry_events WHERE timestamp > ?'
  ).get(Date.now() - 24 * 60 * 60 * 1000).count;
  
  const topEvents = db().prepare(
    `SELECT event, COUNT(*) as count FROM telemetry_events 
     WHERE timestamp > ? GROUP BY event ORDER BY count DESC LIMIT 10`
  ).all(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  res.json({
    licenses: { total: totalLicenses, active: activeLicenses, by_tier: byTier },
    devices: { total: totalDevices, active_7d: activeDevices7d },
    events: { total: totalEvents, last_24h: events24h, top_events: topEvents }
  });
}));

// ─── POST /v1/admin/api-keys ──────────────────────────────────────────────────

router.post('/api-keys', asyncHandler(async (req, res) => {
  const { name, scopes = ['*'] } = req.body;
  const key = 'sk_' + crypto.randomBytes(20).toString('hex');
  
  db().prepare(
    'INSERT INTO api_keys (key, name, scopes, created_at) VALUES (?, ?, ?, ?)'
  ).run(key, name || 'unnamed', JSON.stringify(scopes), Date.now());
  
  res.status(201).json({ key, name, scopes });
}));

module.exports = router;
