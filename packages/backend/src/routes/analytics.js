/**
 * SmartLangGuard Analytics Dashboard API
 * 
 * Provides aggregated metrics for the admin dashboard:
 *   - Active users over time
 *   - Correction statistics by direction (EN→AR, AR→EN)
 *   - Top corrections (most frequently fixed mistakes)
 *   - License distribution
 *   - Error rates
 * 
 * @module backend/routes/analytics
 */

'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /v1/analytics/overview
 * Get high-level metrics
 */
router.get('/overview', async (req, res) => {
  try {
    const db = require('../db-abstraction').getDatabase();
    
    // Total telemetry events
    const totalEvents = db.get('SELECT COUNT(*) as count FROM telemetry_events')?.count || 0;
    
    // Active users (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeUsers = db.get(
      'SELECT COUNT(DISTINCT anonymous_id) as count FROM telemetry_events WHERE timestamp > ?',
      sevenDaysAgo
    )?.count || 0;
    
    // Total licenses
    const totalLicenses = db.get('SELECT COUNT(*) as count FROM licenses WHERE revoked = 0')?.count || 0;
    
    // Licenses by tier
    const licensesByTier = db.all(
      'SELECT tier, COUNT(*) as count FROM licenses WHERE revoked = 0 GROUP BY tier'
    ) || [];
    
    // Corrections today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const correctionsToday = db.get(
      'SELECT COUNT(*) as count FROM telemetry_events WHERE event = ? AND timestamp > ?',
      'correction_applied',
      todayStart.getTime()
    )?.count || 0;
    
    // Average score
    const avgScoreResult = db.get(
      'SELECT AVG(CAST(properties->>"$.score" AS REAL)) as avg FROM telemetry_events WHERE event = ? AND properties->>"$.score" IS NOT NULL',
      'correction_applied'
    );
    
    res.json({
      overview: {
        totalEvents,
        activeUsers7d: activeUsers,
        totalLicenses,
        correctionsToday,
        avgCorrectionScore: avgScoreResult?.avg ? Math.round(avgScoreResult.avg) : null,
        licensesByTier: Object.fromEntries(licensesByTier.map(r => [r.tier, r.count]))
      },
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /v1/analytics/corrections
 * Get correction statistics over time
 */
router.get('/corrections', async (req, res) => {
  try {
    const db = require('../db-abstraction').getDatabase();
    const { period = '7d', direction } = req.query;
    
    let days;
    switch (period) {
      case '24h': days = 1; break;
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 7;
    }
    
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    let query = `
      SELECT 
        DATE(timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as count,
        AVG(CAST(properties->>"$.score" AS REAL)) as avg_score
      FROM telemetry_events
      WHERE event = 'correction_applied' AND timestamp > ?
    `;
    const params = [cutoff];
    
    if (direction) {
      query += ' AND properties->>"$.direction" = ?';
      params.push(direction);
    }
    
    query += ' GROUP BY DATE(timestamp / 1000, \'unixepoch\') ORDER BY date';
    
    const dailyStats = db.all(query, ...params) || [];
    
    // Direction breakdown
    const directionStats = db.all(`
      SELECT 
        properties->>"$.direction" as direction,
        COUNT(*) as count
      FROM telemetry_events
      WHERE event = 'correction_applied' AND timestamp > ?
      GROUP BY properties->>"$.direction"
    `, cutoff) || [];
    
    res.json({
      period,
      days,
      dailyCorrections: dailyStats,
      byDirection: Object.fromEntries(directionStats.map(r => [r.direction || 'unknown', r.count])),
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics corrections error:', err);
    res.status(500).json({ error: 'Failed to fetch correction analytics' });
  }
});

/**
 * GET /v1/analytics/top-corrections
 * Get most frequent corrections
 */
router.get('/top-corrections', async (req, res) => {
  try {
    const db = require('../db-abstraction').getDatabase();
    const { limit = 20 } = req.query;
    
    const topCorrections = db.all(`
      SELECT 
        properties->>"$.original" as original,
        properties->>"$.corrected" as corrected,
        properties->>"$.direction" as direction,
        COUNT(*) as frequency
      FROM telemetry_events
      WHERE event = 'correction_applied' 
        AND properties->>"$.original" IS NOT NULL
        AND properties->>"$.corrected" IS NOT NULL
      GROUP BY 
        properties->>"$.original",
        properties->>"$.corrected"
      ORDER BY frequency DESC
      LIMIT ?
    `, parseInt(limit)) || [];
    
    res.json({
      topCorrections,
      count: topCorrections.length,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics top-corrections error:', err);
    res.status(500).json({ error: 'Failed to fetch top corrections' });
  }
});

/**
 * GET /v1/analytics/error-rate
 * Get error rates over time
 */
router.get('/error-rate', async (req, res) => {
  try {
    const db = require('../db-abstraction').getDatabase();
    const { period = '7d' } = req.query;
    
    let days;
    switch (period) {
      case '24h': days = 1; break;
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      default: days = 7;
    }
    
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    // Total events vs error events
    const stats = db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN event LIKE 'error%' THEN 1 ELSE 0 END) as errors
      FROM telemetry_events
      WHERE timestamp > ?
    `, cutoff);
    
    const errorRate = stats?.total > 0 
      ? ((stats.errors || 0) / stats.total * 100).toFixed(2)
      : 0;
    
    // Daily error breakdown
    const dailyErrors = db.all(`
      SELECT 
        DATE(timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as total,
        SUM(CASE WHEN event LIKE 'error%' THEN 1 ELSE 0 END) as errors
      FROM telemetry_events
      WHERE timestamp > ?
      GROUP BY DATE(timestamp / 1000, 'unixepoch')
      ORDER BY date
    `, cutoff) || [];
    
    res.json({
      period,
      days,
      summary: {
        total: stats?.total || 0,
        errors: stats?.errors || 0,
        errorRate: parseFloat(errorRate)
      },
      dailyErrors,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics error-rate error:', err);
    res.status(500).json({ error: 'Failed to fetch error rate analytics' });
  }
});

/**
 * GET /v1/analytics/usage
 * Get usage patterns
 */
router.get('/usage', async (req, res) => {
  try {
    const db = require('../db-abstraction').getDatabase();
    const { period = '7d' } = req.query;
    
    let days;
    switch (period) {
      case '24h': days = 1; break;
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      default: days = 7;
    }
    
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    // Hourly usage patterns
    const hourlyUsage = db.all(`
      SELECT 
        strftime('%H', timestamp / 1000, 'unixepoch') as hour,
        COUNT(*) as count
      FROM telemetry_events
      WHERE timestamp > ?
      GROUP BY strftime('%H', timestamp / 1000, 'unixepoch')
      ORDER BY hour
    `, cutoff) || [];
    
    // Platform breakdown
    const platformStats = db.all(`
      SELECT 
        os,
        COUNT(*) as count,
        COUNT(DISTINCT anonymous_id) as users
      FROM telemetry_events
      WHERE timestamp > ? AND os IS NOT NULL
      GROUP BY os
    `, cutoff) || [];
    
    // App version breakdown
    const versionStats = db.all(`
      SELECT 
        app_version,
        COUNT(*) as count
      FROM telemetry_events
      WHERE timestamp > ? AND app_version IS NOT NULL
      GROUP BY app_version
      ORDER BY count DESC
      LIMIT 10
    `, cutoff) || [];
    
    res.json({
      period,
      days,
      hourlyUsage: hourlyUsage.map(h => ({ hour: parseInt(h.hour), count: h.count })),
      byPlatform: platformStats,
      byVersion: versionStats,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Analytics usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

module.exports = router;
