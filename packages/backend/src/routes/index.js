/**
 * API Routes - v1
 */

'use strict';

const express = require('express');
const router = express.Router();

const licenseRoutes = require('./license');
const telemetryRoutes = require('./telemetry');
const aiRoutes = require('./ai');
const adminRoutes = require('./admin');
const stripeRoutes = require('./stripe');
const billingRoutes = require('./billing');
const analyticsRoutes = require('./analytics');

router.use('/license', licenseRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);
router.use('/stripe', stripeRoutes);
router.use('/billing', billingRoutes);
router.use('/analytics', analyticsRoutes);

// API root
router.get('/', (req, res) => {
  res.json({
    name: 'SmartLangGuard SaaS API',
    version: require('../../package.json').version,
    docs: '/docs',
    endpoints: {
      license: '/v1/license/validate, /v1/license/activate, /v1/license/revoke',
      telemetry: '/v1/telemetry/batch',
      ai: '/v1/ai/score',
      admin: '/v1/admin/*',
      stripe: '/v1/stripe/webhook',
      analytics: '/v1/analytics/overview, /v1/analytics/corrections, /v1/analytics/top-corrections'
    }
  });
});

module.exports = router;
