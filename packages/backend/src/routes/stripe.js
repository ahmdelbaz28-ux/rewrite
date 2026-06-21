/**
 * Stripe Checkout routes.
 * 
 * Creates Stripe Checkout Sessions for subscription upgrades.
 * Handles success/cancel redirects and webhook signature verification.
 * 
 * Required env vars:
 *   STRIPE_SECRET_KEY     - sk_test_... or sk_live_...
 *   STRIPE_PUBLISHABLE_KEY - pk_test_... or pk_live_...
 *   STRIPE_WEBHOOK_SECRET  - whsec_... (from Stripe Dashboard webhook settings)
 *   STRIPE_PRICE_PRO       - price_xxx (Pro tier monthly)
 *   STRIPE_PRICE_TEAM      - price_xxx (Team tier monthly)
 *   STRIPE_PRICE_ENTERPRISE - price_xxx (Enterprise tier monthly)
 *   FRONTEND_URL           - e.g. https://app.smartlangguard.com (for redirects)
 */

'use strict';

const express = require('express');

const router = express.Router();

const crypto = require('crypto');

const db = require('../db').prepare;

const { asyncHandler, requireApiKey } = require('../middleware');

const { TIER_FEATURES } = require('../../../core/src/license');

// ─── Stripe Client (lazy init) ────────────────────────────────────────────────

let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  // Use Stripe REST API directly (no SDK dependency)
  stripeClient = {
    secret: process.env.STRIPE_SECRET_KEY,
    async request(method, path, body = null) {
      const opts = {
        method,
        headers: {
          'Authorization': `Bearer ${this.secret}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };
      if (body) {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(body)) {
          if (Array.isArray(v)) {
            v.forEach(item => params.append(k + '[]', item));
          } else if (typeof v === 'object') {
            for (const [kk, vv] of Object.entries(v)) {
              params.append(`${k}[${kk}]`, vv);
            }
          } else {
            params.append(k, v);
          }
        }
        opts.body = params.toString();
      }
      const res = await fetch(`https://api.stripe.com/v1${path}`, opts);
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error?.message || `Stripe API ${res.status}`);
        err.type = data.error?.type;
        err.code = data.error?.code;
        err.status = res.status;
        throw err;
      }
      return data;
    }
  };
  return stripeClient;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const TIER_PRICES = {
  pro: { amount: 500, currency: 'usd', name: 'SmartLangGuard Pro - Monthly', priceId: process.env.STRIPE_PRICE_PRO },
  team: { amount: 4900, currency: 'usd', name: 'SmartLangGuard Team - Monthly', priceId: process.env.STRIPE_PRICE_TEAM },
  enterprise: { amount: 49900, currency: 'usd', name: 'SmartLangGuard Enterprise - Monthly', priceId: process.env.STRIPE_PRICE_ENTERPRISE }
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── POST /v1/stripe/checkout ─────────────────────────────────────────────────

router.post('/checkout', asyncHandler(async (req, res) => {
  const { tier, email, license_token } = req.body;
  
  if (!tier || !TIER_PRICES[tier]) {
    return res.status(400).json({ 
      error: 'Invalid tier',
      valid_tiers: Object.keys(TIER_PRICES)
    });
  }
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.'
    });
  }

  const priceInfo = TIER_PRICES[tier];
  
  // Build checkout session params
  const sessionParams = {
    'mode': 'subscription',
    'customer_email': email,
    'line_items[0][quantity]': '1',
    'success_url': `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${FRONTEND_URL}/billing/cancel`,
    'metadata[tier]': tier,
    'metadata[email]': email,
    'subscription_data[metadata][tier]': tier,
    'subscription_data[metadata][email]': email
  };
  
  if (priceInfo.priceId) {
    sessionParams['line_items[0][price]'] = priceInfo.priceId;
  } else {
    // Fallback: inline price (for testing without pre-configured price IDs)
    sessionParams['line_items[0][price_data][currency]'] = priceInfo.currency;
    sessionParams['line_items[0][price_data][unit_amount]'] = String(priceInfo.amount);
    sessionParams['line_items[0][price_data][product_data][name]'] = priceInfo.name;
    sessionParams['line_items[0][price_data][recurring][interval]'] = 'month';
  }
  
  // If license_token provided, add as metadata
  if (license_token) {
    sessionParams['metadata[license_token]'] = license_token;
  }

  try {
    const session = await stripe.request('POST', '/checkout/sessions', sessionParams);
    res.json({
      checkout_url: session.url,
      session_id: session.id,
      tier,
      amount: priceInfo.amount,
      currency: priceInfo.currency
    });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: err.message 
    });
  }
}));

// ─── POST /v1/stripe/portal ───────────────────────────────────────────────────

router.post('/portal', asyncHandler(async (req, res) => {
  const { email, license_token } = req.body;
  
  if (!email && !license_token) {
    return res.status(400).json({ error: 'Email or license_token required' });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

      // Find customer by email

      let customerId = null;

      // Try license first

      if (license_token) {

        const license = await db(

          'SELECT stripe_customer_id FROM licenses WHERE token = ?'

        ).get(license_token);

        if (license?.stripe_customer_id) {

          customerId = license.stripe_customer_id;

        }

      }
  
  if (!customerId && email) {
    // Look up via Stripe API
    try {
      const customers = await stripe.request('GET', `/customers?email=${encodeURIComponent(email)}`);
      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    } catch (err) {
      // Customer doesn't exist yet
    }
  }
  
  if (!customerId) {
    return res.status(404).json({ error: 'No Stripe customer found for this email' });
  }

  try {
    const session = await stripe.request('POST', '/billing_portal/sessions', {
      'customer': customerId,
      'return_url': `${FRONTEND_URL}/billing`
    });
    res.json({ portal_url: session.url });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to create portal session',
      details: err.message 
    });
  }
}));

// ─── GET /v1/stripe/pricing ───────────────────────────────────────────────────

router.get('/pricing', (req, res) => {
  const pricing = Object.entries(TIER_PRICES).map(([tier, info]) => ({
    tier,
    name: info.name,
    price_usd: (info.amount / 100).toFixed(2),
    currency: info.currency.toUpperCase(),
    interval: 'month',
    features: TIER_FEATURES[tier] || []
  }));
  res.json({ pricing });
});

// ─── GET /v1/stripe/config ────────────────────────────────────────────────────

router.get('/config', (req, res) => {
  res.json({
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || null,
    configured: !!process.env.STRIPE_SECRET_KEY,
    frontend_url: FRONTEND_URL
  });
});

// ─── POST /v1/stripe/webhook (raw body) ───────────────────────────────────────
// Note: This route is mounted with express.raw() in server.js for signature verification

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Verify signature
  if (!verifyStripeSignature(req.body.toString('utf8'), sig, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object);
        break;
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object);
        break;
      }
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// ─── Webhook Event Handlers ───────────────────────────────────────────────────

async function handleCheckoutCompleted(session) {

    const tier = session.metadata?.tier || mapPriceToTier(session.amount_total);

    const email = session.metadata?.email || session.customer_email;

    const customerId = session.customer;

    const subscriptionId = session.subscription;

    const existingLicenseToken = session.metadata?.license_token;

    // Find existing license by token or email

    let license;

    if (existingLicenseToken) {

      license = await db('SELECT * FROM licenses WHERE token = ?').get(existingLicenseToken);

    }

    if (!license && email) {

      license = await db('SELECT * FROM licenses WHERE email = ?').get(email);

    }

    const maxDevices = tier === 'pro' ? 3 : tier === 'team' ? 10 : 100;

    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    if (license) {

      // Update existing license

      await db(

        `UPDATE licenses SET tier = ?, stripe_customer_id = ?, stripe_subscription_id = ?, features = ?, max_devices = ?, expires_at = ?, revoked = 0, updated_at = ? WHERE id = ?`

      ).run(

        tier, customerId, subscriptionId, JSON.stringify(TIER_FEATURES[tier]), maxDevices, expiresAt, Date.now(), license.id

      );

      console.log(` → Updated license ${license.id} to ${tier}`);

    } else {

      // Create new license

      const token = 'slg_' + crypto.randomBytes(16).toString('hex');

      const result = await db(

        `INSERT INTO licenses (token, tier, email, stripe_customer_id, stripe_subscription_id, features, max_devices, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

      ).run(

        token, tier, email, customerId, subscriptionId, JSON.stringify(TIER_FEATURES[tier]), maxDevices, expiresAt, Date.now(), Date.now()

      );

      console.log(` → Created new license ${result.lastInsertRowid} (${tier})`);

    }

  }

async function handleSubscriptionUpdated(subscription) {

  const customerId = subscription.customer;

  const license = await db('SELECT * FROM licenses WHERE stripe_customer_id = ?').get(customerId);

  if (!license) return;

  if (subscription.status === 'active') {

    const tier = subscription.metadata?.tier || license.tier;

    await db(

      'UPDATE licenses SET tier = ?, revoked = 0, updated_at = ? WHERE id = ?'

    ).run(tier, Date.now(), license.id);

  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {

    // Grace period - keep active but log warning

    console.warn(` → Subscription ${subscription.id} is ${subscription.status}`);

  }

}



async function handleSubscriptionDeleted(subscription) {

  const customerId = subscription.customer;

  await db(

    'UPDATE licenses SET revoked = 1, tier = ?, updated_at = ? WHERE stripe_customer_id = ?'

  ).run('free', Date.now(), customerId);

  console.log(` → Subscription deleted, downgraded to free`);

}



async function handleInvoicePaid(invoice) {

  const customerId = invoice.customer;

  // Extend license by 30 days

  await db(

    'UPDATE licenses SET expires_at = ?, revoked = 0, updated_at = ? WHERE stripe_customer_id = ?'

  ).run(

    Date.now() + (30 * 24 * 60 * 60 * 1000), Date.now(), customerId

  );

  console.log(` → Invoice paid, extended license by 30 days`);

}

function mapPriceToTier(amount) {
  if (amount >= 49900) return 'enterprise';
  if (amount >= 4900) return 'team';
  return 'pro';
}

// ─── Signature Verification ───────────────────────────────────────────────────

function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  
  const elements = sigHeader.split(',');
  const tsEl = elements.find(e => e.startsWith('t='));
  const sigEl = elements.find(e => e.startsWith('v1='));
  if (!tsEl || !sigEl) return false;
  
  const timestamp = tsEl.split('=')[1];
  const signature = sigEl.split('=')[1];
  
  // Tolerance: 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false;
  }
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

// Export both router and the raw-body webhook handler
module.exports = router;
module.exports.handleWebhook = handleWebhook;
module.exports.TIER_PRICES = TIER_PRICES;
module.exports.getStripe = getStripe;
