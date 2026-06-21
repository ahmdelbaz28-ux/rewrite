/**
 * SQLite database layer (using sqlite3 with deasync for synchronous access).
 * Provides a prepare() method for compatibility with better-sqlite3 API.
 * Falls back to in-memory if file is not writable.
 */
'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const deasync = require('deasync');

let db;
const DB_PATH = process.env.SMARTLANGGUARD_DB_PATH || path.join(os.homedir(), '.smartlangguard', 'saas.db');
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

// Synchronous wrappers for sqlite3
function syncExec(db, sql) {
  let result, error;
  db.exec(sql, (err) => {
    if (err) error = err;
    else result = true;
  });
  deasync.loopWhile(() => !result && !error);
  if (error) throw error;
  return result;
}

function syncGet(db, sql, params) {
  let result, error;
  db.get(sql, params, (err, row) => {
    if (err) error = err;
    else result = row;
  });
  deasync.loopWhile(() => !result && !error);
  if (error) throw error;
  return result;
}

function syncRun(db, sql, params) {
  let result, error;
  db.run(sql, params, function(err) {
    if (err) error = err;
    else result = { lastInsertRowid: this.lastID, changes: this.changes };
  });
  deasync.loopWhile(() => !result && !error);
  if (error) throw error;
  return result;
}

function syncAll(db, sql, params) {
  let result, error;
  db.all(sql, params, (err, rows) => {
    if (err) error = err;
    else result = rows;
  });
  deasync.loopWhile(() => !result && !error);
  if (error) throw error;
  return result;
}

async function init() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  db = new sqlite3.Database(DB_PATH);
  
  try {
    syncExec(db, SCHEMA);
    syncExec(db, 'PRAGMA journal_mode = WAL');
    syncExec(db, 'PRAGMA foreign_keys = ON');
    
    // Seed default admin if not exists
    const adminCount = syncGet(db, 'SELECT COUNT(*) as count FROM admin_users');
    if (adminCount.count === 0) {
      const bcrypt = require('bcryptjs');
      const defaultHash = await bcrypt.hash(
        process.env.ADMIN_DEFAULT_PASSWORD || 'admin123',
        10
      );
      syncRun(
        db,
        'INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)',
        ['admin', defaultHash, Date.now()]
      );
      console.log(' → Created default admin (username: admin, password: admin123)');
    }
    console.log(` → Database ready at ${DB_PATH}`);
  } catch (err) {
    console.warn(` → SQLite not available, using in-memory: ${err.message}`);
    db = new sqlite3.Database(':memory:');
    syncExec(db, SCHEMA);
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  return db;
}

// Compatibility layer for better-sqlite3's prepare() API
function prepare(sql) {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  
  return {
    get: (params) => syncGet(db, sql, params),
    run: (params) => syncRun(db, sql, params),
    all: (params) => syncAll(db, sql, params)
  };
}

async function close() {
  if (db) {
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    db = null;
  }
}

module.exports = { init, getDb, close, DB_PATH, prepare };