/**
 * SQLite database layer (using better-sqlite3 for synchronous, fast access).
 * Falls back to in-memory if file is not writable.
 */

'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

let db;

const DB_PATH = process.env.SMARTLANGGUARD_DB_PATH ||
  path.join(os.homedir(), '.smartlangguard', 'saas.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  device_fingerprints TEXT, -- JSON array
  features TEXT, -- JSON array
  max_devices INTEGER DEFAULT 1,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  license_id INTEGER REFERENCES licenses(id),
  fingerprint TEXT NOT NULL,
  hostname TEXT,
  platform TEXT,
  last_seen INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(license_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL,
  event TEXT NOT NULL,
  properties TEXT, -- JSON
  os TEXT,
  app_version TEXT,
  session_id INTEGER,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_event ON telemetry_events(event);
CREATE INDEX IF NOT EXISTS idx_telemetry_anonymous ON telemetry_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_events(timestamp);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  name TEXT,
  scopes TEXT, -- JSON array
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  revoked INTEGER DEFAULT 0
);
`;

async function init() {
  try {
    const Database = require('better-sqlite3');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    
    // Seed default admin if not exists
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
    if (adminCount.count === 0) {
      const bcrypt = require('bcryptjs');
      const defaultHash = bcrypt.hashSync(
        process.env.ADMIN_DEFAULT_PASSWORD || 'admin123',
        10
      );
      db.prepare('INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)')
        .run('admin', defaultHash, Date.now());
      console.log('  → Created default admin (username: admin, password: admin123)');
    }
    
    console.log(`  → Database ready at ${DB_PATH}`);
  } catch (err) {
    console.warn(`  → SQLite not available, using in-memory: ${err.message}`);
    const Database = require('better-sqlite3');
    db = new Database(':memory:');
    db.exec(SCHEMA);
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  return db;
}

async function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { init, getDb, close, DB_PATH };
