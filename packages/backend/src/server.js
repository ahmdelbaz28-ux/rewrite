/**
 * SmartLangGuard SaaS Backend
 * 
 * Express server providing:
 *   - License validation & management
 *   - Telemetry ingestion
 *   - AI scoring proxy (Pro+ feature)
 *   - Admin endpoints
 *   - Stripe webhook handler (subscription lifecycle)
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

const db = require('./db');
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/v1/', limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: require('../package.json').version,
    timestamp: new Date().toISOString()
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/v1', routes);

// ─── Stripe Webhook (raw body, registered before json middleware) ─────────────

const stripeRoutes = require('./routes/stripe');
app.post('/v1/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes.handleWebhook);

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

function start() {
  db.init();

  app.listen(PORT, () => {
    console.log(`╔════════════════════════════════════════════╗`);
    console.log(`║  SmartLangGuard SaaS Backend v${require('../package.json').version}      ║`);
    console.log(`║  Listening on http://localhost:${PORT}        ║`);
    console.log(`║  Environment: ${process.env.NODE_ENV || 'development'.padEnd(22)}║`);
    console.log(`╚════════════════════════════════════════════╝`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  db.close();
  process.exit(0);
});

if (require.main === module) {
  start();
}

module.exports = app;
