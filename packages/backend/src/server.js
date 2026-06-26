/**
 * SmartLangGuard SaaS Backend
 * 
 * Express server providing:
 *   - License validation & management
 *   - Telemetry ingestion
 *   - AI scoring proxy (Pro+ feature)
 *   - Admin endpoints
 *   - Stripe webhook handler (subscription lifecycle)
 *   - PostgreSQL + Redis support for production scaling
 * 
 * @module backend
 */

'use strict';

const path = require('path');

// Load .env from backend package directory (not cwd)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Database abstraction layer (supports SQLite, PostgreSQL)
const { initDatabase, initCache, closeAll, getDatabase, getCache } = require('./db-abstraction');
const { errorHandler } = require('./middleware');
const routes = require('./routes');

const PORT = process.env.PORT || 4000;
const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Rate limiting with Redis support
app.use('/v1/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

// Body parsing
// Stripe webhook needs raw body - mount BEFORE json parser
const stripeRoutes = require('./routes/stripe');
app.post('/v1/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes.handleWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  let cacheStatus = 'disabled';
  
  try {
    const db = getDatabase();
    if (db) {
      dbStatus = db.type || 'unknown';
    }
  } catch {
    dbStatus = 'not initialized';
  }
  
  try {
    const cache = getCache();
    if (cache && cache.isEnabled()) {
      cacheStatus = 'connected';
    }
  } catch {
    cacheStatus = 'not initialized';
  }
  
  res.json({
    status: 'ok',
    version: require('../package.json').version,
    database: dbStatus,
    cache: cacheStatus,
    timestamp: new Date().toISOString()
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/v1', routes);

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Initialize database (SQLite or PostgreSQL based on DATABASE_URL)
    const db = await initDatabase();
    
    // Initialize Redis cache (optional, based on REDIS_URL)
    await initCache();
    
    app.listen(PORT, () => {
      console.log(`╔════════════════════════════════════════════════════════════════════╗`);
      console.log(`║  SmartLangGuard SaaS Backend v${require('../package.json').version}                      ║`);
      console.log(`║  Listening on http://localhost:${PORT}                           ║`);
      console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(38)}║`);
      console.log(`║  Database:   ${(db.type || 'unknown').padEnd(38)}║`);
      const cache = getCache();
      console.log(`║  Cache:      ${(cache && cache.isEnabled() ? 'Redis' : 'Disabled').padEnd(38)}║`);
      console.log(`╚════════════════════════════════════════════════════════════════════╝`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await closeAll();
  process.exit(0);
});

if (require.main === module) {
  start();
}

module.exports = app;
