/**
 * API Routes - v1
 */

'use strict';

const express = require('express');
const router = express.Router();

const licenseRoutes = require('./routes/license');
const telemetryRoutes = require('./routes/telemetry');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const stripeRoutes = require('./routes/stripe');

router.use('/license', licenseRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/ai', aiRoutes);
router.use('/admin', adminRoutes);
router.use('/stripe', stripeRoutes);

// API root
router.get('/', (req, res) => {
  res.json({
    name: 'SmartLangGuard SaaS API',
    version: require('../package.json').version,
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
