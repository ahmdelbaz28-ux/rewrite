/**
 * Stripe webhook handler for subscription lifecycle events.
 * 
 * Updates license tier and status based on Stripe events.
 * Configure webhook URL: https://your-backend.com/v1/stripe/webhook
 */

'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const db = require('../db').getDb;
const { asyncHandler } = require('../middleware');
const { TIER_FEATURES } = require('../../../core/src/license');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe webhook signature verification
function verifyStripeSignature(payload, sigHeader, secret) {
  if (!secret) return false;
  const elements = sigHeader.split(',');
  const signature = elements.find(e => e.startsWith('t='));
  const sig = elements.find(e => e.startsWith('v1='));
  if (!signature || !sig) return false;
  
  const timestamp = signature.split('=')[1];
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  // Tolerance: 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
  
  return expectedSig === sig.split('=')[1];
}

// ─── POST /v1/stripe/webhook ──────────────────────────────────────────────────

router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (STRIPE_WEBHOOK_SECRET && !verifyStripeSignature(req.body, sig, STRIPE_WEBHOOK_SECRET)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(req.body);
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = session.customer_email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      
      // Determine tier from price
      const tier = mapPriceToTier(session.amount_total);
      
      // Find license by email, or create new
      let license = db().prepare('SELECT * FROM licenses WHERE email = ?').get(email);
      if (!license) {
        const token = 'slg_' + crypto.randomBytes(16).toString('hex');
        db().prepare(
          `INSERT INTO licenses (token, tier, email, stripe_customer_id, stripe_subscription_id, features, max_devices, expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          token, tier, email, customerId, subscriptionId,
          JSON.stringify(TIER_FEATURES[tier]),
          tier === 'pro' ? 3 : tier === 'team' ? 10 : 100,
          Date.now() + (30 * 24 * 60 * 60 * 1000),
          Date.now(), Date.now()
        );
      } else {
        db().prepare(
          `UPDATE licenses SET tier = ?, stripe_customer_id = ?, stripe_subscription_id = ?,
           features = ?, max_devices = ?, expires_at = ?, revoked = 0, updated_at = ? WHERE id = ?`
        ).run(
          tier, customerId, subscriptionId,
          JSON.stringify(TIER_FEATURES[tier]),
          tier === 'pro' ? 3 : tier === 'team' ? 10 : 100,
          Date.now() + (30 * 24 * 60 * 60 * 1000),
          Date.now(), license.id
        );
      }
      break;
    }
    
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      
      const license = db().prepare('SELECT * FROM licenses WHERE stripe_customer_id = ?').get(customerId);
      if (!license) break;
      
      if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled') {
        db().prepare('UPDATE licenses SET revoked = 1, tier = ?, updated_at = ? WHERE id = ?')
          .run('free', Date.now(), license.id);
      } else if (subscription.status === 'past_due') {
        // Grace period - keep active but flag
        db().prepare('UPDATE licenses SET updated_at = ? WHERE id = ?')
          .run(Date.now(), license.id);
      }
      break;
    }
    
    case 'invoice.paid': {
      // Extend license expiry
      const invoice = event.data.object;
      const customerId = invoice.customer;
      db().prepare(
        'UPDATE licenses SET expires_at = ?, revoked = 0, updated_at = ? WHERE stripe_customer_id = ?'
      ).run(
        Date.now() + (30 * 24 * 60 * 60 * 1000),
        Date.now(),
        customerId
      );
      break;
    }
    
    default:
      // Unhandled event - log but don't fail
      console.log(`Unhandled Stripe event: ${event.type}`);
  }
  
  res.json({ received: true });
}));

function mapPriceToTier(amount) {
  // Pricing: $5/mo = pro, $49/mo = team, $499/mo = enterprise
  if (amount >= 49900) return 'enterprise';
  if (amount >= 4900) return 'team';
  return 'pro';
}

module.exports = router;
