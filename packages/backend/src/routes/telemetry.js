/**
 * Telemetry routes: batch ingestion and analytics aggregation
 */

'use strict';

const express = require('express');
const router = express.Router();

const db = require('../db').getDb;
const { asyncHandler, requireApiKey } = require('../middleware');

// ─── POST /v1/telemetry/batch ─────────────────────────────────────────────────

router.post('/batch', asyncHandler(async (req, res) => {
  const { events } = req.body;
  
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Events array required' });
  }

  if (events.length > 100) {
    return res.status(413).json({ error: 'Max 100 events per batch' });
  }

  const stmt = db().prepare(
    `INSERT INTO telemetry_events (anonymous_id, event, properties, os, app_version, session_id, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db().transaction((events) => {
    for (const e of events) {
      stmt.run(
        e.anonymous_id || 'unknown',
        e.event || 'unknown',
        JSON.stringify(e.properties || {}),
        e.os || 'unknown',
        e.app_version || '0.0.0',
        e.session_id || 0,
        e.timestamp || Date.now()
      );
    }
  });

  insertMany(events);

  res.json({ success: true, count: events.length });
}));

// ─── GET /v1/telemetry/stats ──────────────────────────────────────────────────

router.get('/stats', requireApiKey('analytics'), asyncHandler(async (req, res) => {
  const since = parseInt(req.query.since) || (Date.now() - 30 * 24 * 60 * 60 * 1000);

  const totalEvents = db().prepare(
    'SELECT COUNT(*) as count FROM telemetry_events WHERE timestamp >= ?'
  ).get(since);

  const byEvent = db().prepare(
    `SELECT event, COUNT(*) as count 
     FROM telemetry_events WHERE timestamp >= ?
     GROUP BY event ORDER BY count DESC`
  ).all(since);

  const uniqueUsers = db().prepare(
    'SELECT COUNT(DISTINCT anonymous_id) as count FROM telemetry_events WHERE timestamp >= ?'
  ).get(since);

  const daily = db().prepare(
    `SELECT date(timestamp/1000, 'unixepoch') as day, COUNT(*) as count
     FROM telemetry_events WHERE timestamp >= ?
     GROUP BY day ORDER BY day DESC LIMIT 30`
  ).all(since);

  res.json({
    since,
    total_events: totalEvents.count,
    unique_users: uniqueUsers.count,
    by_event: byEvent,
    daily
  });
}));

module.exports = router;
