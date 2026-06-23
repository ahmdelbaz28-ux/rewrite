/**
 * Billing routes (separate from Stripe webhooks).
 * Customer-facing endpoints to check subscription status and history.
 */

'use strict';

const express = require('express');
const router = express.Router();

const db = require('../db').getDb;
const { asyncHandler } = require('../middleware');
const { TIER_FEATURES } = require('@smartlangguard/core');

// ─── GET /v1/billing/status ───────────────────────────────────────────────────

router.get('/status', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  
  const license = db().prepare(
    'SELECT * FROM licenses WHERE token = ? AND revoked = 0'
  ).get(token);
  
  if (!license) {
    return res.status(404).json({ error: 'License not found' });
  }
  
  const isExpired = license.expires_at && Date.now() > license.expires_at;
  
  res.json({
    tier: license.tier,
    email: license.email,
    features: JSON.parse(license.features || '[]'),
    max_devices: license.max_devices,
    expires_at: license.expires_at,
    is_expired: isExpired,
    stripe_customer_id: license.stripe_customer_id ? true : false,
    stripe_subscription_id: license.stripe_subscription_id ? true : false,
    days_until_expiry: license.expires_at 
      ? Math.max(0, Math.floor((license.expires_at - Date.now()) / (24 * 60 * 60 * 1000)))
      : null
  });
}));

// ─── GET /v1/billing/plans ────────────────────────────────────────────────────

router.get('/plans', (req, res) => {
  const plans = [
    {
      tier: 'free',
      name: 'Free',
      price_usd: 0,
      interval: 'forever',
      features: TIER_FEATURES.free,
      max_devices: 1,
      description: 'Perfect for personal use'
    },
    {
      tier: 'pro',
      name: 'Pro',
      price_usd: 5,
      interval: 'month',
      features: TIER_FEATURES.pro,
      max_devices: 3,
      description: 'For developers and power users',
      popular: true
    },
    {
      tier: 'team',
      name: 'Team',
      price_usd: 49,
      interval: 'month',
      features: TIER_FEATURES.team,
      max_devices: 10,
      description: 'For small teams (up to 10 members)'
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      price_usd: 499,
      interval: 'month',
      features: TIER_FEATURES.enterprise,
      max_devices: 100,
      description: 'For larger organizations with SSO needs'
    }
  ];
  res.json({ plans });
});

module.exports = router;
