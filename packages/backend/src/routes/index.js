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

router.use('/license', licenseRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);
router.use('/stripe', stripeRoutes);
router.use('/billing', billingRoutes);

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
      stripe: '/v1/stripe/webhook'
    }
  });
});

module.exports = router;
