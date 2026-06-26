/**
 * SmartLangGuard Database Abstraction Layer
 * 
 * Supports multiple database backends:
 *   - SQLite: development, simple deployments
 *   - PostgreSQL: production, horizontal scaling
 * 
 * Also provides Redis caching for:
 *   - Session management
 *   - Rate limiting
 *   - License caching
 *   - Telemetry buffering
 * 
 * Usage:
 *   - Set DATABASE_URL environment variable to switch to PostgreSQL
 *     (e.g., postgresql://user:pass@host:5432/smartlangguard)
 *   - Set REDIS_URL environment variable to enable Redis caching
 *     (e.g., redis://localhost:6379)
 * 
 * @module backend/db-abstraction
 */

'use strict';

const path = require('path');
const os = require('os');

// ─── Database Factory ───────────────────────────────────────────────────────────

/**
 * Create database instance based on DATABASE_URL
 */
function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && databaseUrl.startsWith('postgresql')) {
    console.log('→ Using PostgreSQL backend');
    return new PostgreSQLDatabase(databaseUrl);
  }
  
  console.log('→ Using SQLite backend (set DATABASE_URL for PostgreSQL)');
  return new SQLiteDatabase();
}

// ─── SQLite Implementation ─────────────────────────────────────────────────────

class SQLiteDatabase {
  constructor() {
    this.db = null;
    this.type = 'sqlite';
  }

  async init() {
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const os = require('os');
    
    const dbPath = process.env.SMARTLANGGUARD_DB_PATH || 
      path.join(os.homedir(), '.smartlangguard', 'saas.db');
    
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.initSchema();
      console.log(` → SQLite ready at ${dbPath}`);
    } catch (err) {
      console.warn(` → SQLite init failed, using in-memory: ${err.message}`);
      this.db = new Database(':memory:');
      this.initSchema();
    }
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        tier TEXT NOT NULL DEFAULT 'free',
        email TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        device_fingerprints TEXT,
        features TEXT,
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
        properties TEXT,
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
        scopes TEXT,
        created_at INTEGER NOT NULL,
        last_used INTEGER,
        revoked INTEGER DEFAULT 0
      );
    `);

    // Create default admin if not exists
    const adminCount = this.db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
    if (adminCount.count === 0) {
      this.createDefaultAdmin();
    }
  }

  createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    let password;
    
    if (!defaultPassword) {
      password = crypto.randomBytes(12).toString('hex');
      console.log(``);
      console.log(`╔══════════════════════════════════════════════════════════════╗`);
      console.log(`║  ⚠  DEFAULT ADMIN CREDENTIALS (save this - shown only once) ║`);
      console.log(`║  Username: admin                                            ║`);
      console.log(`║  Password: ${password}` + ' '.repeat(Math.max(0, 46 - password.length)) + `║`);
      console.log(`╚══════════════════════════════════════════════════════════════╝`);
    } else {
      password = defaultPassword;
    }
    
    const hash = bcrypt.hashSync(password, 10);
    this.db.prepare(
      'INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)'
    ).run('admin', hash, Date.now());
    
    if (!defaultPassword) {
      console.log(`  IMPORTANT: This password will NOT be shown again.`);
      console.log(`  Set ADMIN_DEFAULT_PASSWORD env var for subsequent deployments.`);
    } else {
      console.log(' → Created default admin (username: admin)');
    }
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  get(sql, ...params) {
    return this.db.prepare(sql).get(...params);
  }

  all(sql, ...params) {
    return this.db.prepare(sql).all(...params);
  }

  run(sql, ...params) {
    return this.db.prepare(sql).run(...params);
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ─── PostgreSQL Implementation ────────────────────────────────────────────────

class PostgreSQLDatabase {
  constructor(connectionString) {
    this.connectionString = connectionString;
    this.pool = null;
    this.type = 'postgresql';
  }

  async init() {
    const { Pool } = require('pg');
    
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 20,  // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await this.pool.connect();
    console.log(' → PostgreSQL connected');
    client.release();

    await this.initSchema();
  }

  async initSchema() {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS licenses (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          tier TEXT NOT NULL DEFAULT 'free',
          email TEXT,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          device_fingerprints TEXT,
          features TEXT,
          max_devices INTEGER DEFAULT 1,
          expires_at BIGINT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          revoked INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          license_id INTEGER REFERENCES licenses(id),
          fingerprint TEXT NOT NULL,
          hostname TEXT,
          platform TEXT,
          last_seen BIGINT,
          created_at BIGINT NOT NULL,
          UNIQUE(license_id, fingerprint)
        );
        
        CREATE TABLE IF NOT EXISTS telemetry_events (
          id SERIAL PRIMARY KEY,
          anonymous_id TEXT NOT NULL,
          event TEXT NOT NULL,
          properties TEXT,
          os TEXT,
          app_version TEXT,
          session_id INTEGER,
          timestamp BIGINT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_telemetry_event ON telemetry_events(event);
        CREATE INDEX IF NOT EXISTS idx_telemetry_anonymous ON telemetry_events(anonymous_id);
        CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_events(timestamp);
        
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at BIGINT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS api_keys (
          key TEXT PRIMARY KEY,
          name TEXT,
          scopes TEXT,
          created_at BIGINT NOT NULL,
          last_used BIGINT,
          revoked INTEGER DEFAULT 0
        );
      `);

      // Create default admin if not exists
      const result = await client.query('SELECT COUNT(*) as count FROM admin_users');
      if (parseInt(result.rows[0].count) === 0) {
        await this.createDefaultAdmin();
      }
    } finally {
      client.release();
    }
  }

  async createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    let password;
    
    if (!defaultPassword) {
      password = crypto.randomBytes(12).toString('hex');
      console.log(``);
      console.log(`╔══════════════════════════════════════════════════════════════╗`);
      console.log(`║  ⚠  DEFAULT ADMIN CREDENTIALS (save this - shown only once) ║`);
      console.log(`║  Username: admin                                            ║`);
      console.log(`║  Password: ${password}` + ' '.repeat(Math.max(0, 46 - password.length)) + `║`);
      console.log(`╚══════════════════════════════════════════════════════════════╝`);
    } else {
      password = defaultPassword;
    }
    
    const hash = await bcrypt.hash(password, 10);
    const client = await this.pool.connect();
    
    try {
      await client.query(
        'INSERT INTO admin_users (username, password_hash, created_at) VALUES ($1, $2, $3)',
        ['admin', hash, Date.now()]
      );
      
      if (!defaultPassword) {
        console.log(`  IMPORTANT: This password will NOT be shown again.`);
        console.log(`  Set ADMIN_DEFAULT_PASSWORD env var for subsequent deployments.`);
      } else {
        console.log(' → Created default admin (username: admin)');
      }
    } finally {
      client.release();
    }
  }

  prepare(sql) {
    // PostgreSQL doesn't have prepared statements in the same way as SQLite
    // but we return an object with get, all, run methods for compatibility
    const pool = this.pool;
    return {
      get: async (...params) => {
        const client = await pool.connect();
        try {
          const result = await client.query(sql, params);
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      },
      all: async (...params) => {
        const client = await pool.connect();
        try {
          const result = await client.query(sql, params);
          return result.rows;
        } finally {
          client.release();
        }
      },
      run: async (...params) => {
        const client = await pool.connect();
        try {
          const result = await client.query(sql, params);
          return { changes: result.rowCount, lastInsertRowid: null };
        } finally {
          client.release();
        }
      }
    };
  }

  async get(sql, ...params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async all(sql, ...params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async run(sql, ...params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return { changes: result.rowCount, lastInsertRowid: null };
    } finally {
      client.release();
    }
  }

  async exec(sql) {
    const client = await this.pool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  }

  close() {
    if (this.pool) {
      this.pool.end();
      this.pool = null;
    }
  }
}

// ─── Redis Cache Layer ────────────────────────────────────────────────────────

class RedisCache {
  constructor(redisUrl) {
    this.url = redisUrl;
    this.client = null;
    this.type = 'redis';
  }

  async init() {
    const { createClient } = require('redis');
    
    this.client = createClient({
      url: this.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('→ Redis reconnection limit reached, disabling cache');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      console.warn('→ Redis error:', err.message);
    });

    try {
      await this.client.connect();
      console.log(' → Redis cache connected');
    } catch (err) {
      console.warn(' → Redis connection failed, caching disabled:', err.message);
      this.client = null;
    }
  }

  isEnabled() {
    return this.client !== null && this.client.isOpen;
  }

  async get(key) {
    if (!this.isEnabled()) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    if (!this.isEnabled()) return;
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Silently fail
    }
  }

  async del(key) {
    if (!this.isEnabled()) return;
    try {
      await this.client.del(key);
    } catch {
      // Silently fail
    }
  }

  async incr(key) {
    if (!this.isEnabled()) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key, ttlSeconds) {
    if (!this.isEnabled()) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch {
      // Silently fail
    }
  }

  // Rate limiting
  async checkRateLimit(key, limit, windowSeconds) {
    if (!this.isEnabled()) return { allowed: true, remaining: limit };
    
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, windowSeconds);
    }
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: await this.client.ttl(key)
    };
  }

  close() {
    if (this.client) {
      this.client.quit();
      this.client = null;
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let dbInstance = null;
let cacheInstance = null;

async function initDatabase() {
  if (!dbInstance) {
    dbInstance = createDatabase();
    await dbInstance.init();
  }
  return dbInstance;
}

async function initCache() {
  const redisUrl = process.env.REDIS_URL;
  if (!cacheInstance && redisUrl) {
    cacheInstance = new RedisCache(redisUrl);
    await cacheInstance.init();
  }
  return cacheInstance;
}

function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

function getCache() {
  return cacheInstance;
}

async function closeAll() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  if (cacheInstance) {
    cacheInstance.close();
    cacheInstance = null;
  }
}

module.exports = {
  initDatabase,
  initCache,
  getDatabase,
  getCache,
  closeAll,
  createDatabase,
  RedisCache,
  SQLiteDatabase,
  PostgreSQLDatabase
};
