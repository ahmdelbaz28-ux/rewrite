/**
 * Extended Backend API tests.
 *
 * Complements api.test.js by covering endpoints that were previously
 * untested: telemetry batch ingestion, telemetry stats auth gate,
 * billing /status, billing /plans tier completeness, admin endpoints
 * behind JWT, and the API root discovery document.
 *
 * These tests run against an in-memory SQLite database (see env setup
 * at the top of the file) so they are isolated and fast.
 */

process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.ADMIN_DEFAULT_PASSWORD = 'testpass123';
process.env.SMARTLANGGUARD_DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/server');
const db = require('../src/db');
const { signAdminToken } = require('../src/middleware');

describe('Extended Backend API', () => {
  let adminToken;
  let licenseToken;

  beforeAll(() => {
    db.init();
    adminToken = signAdminToken(1, 'admin', 'admin');
  });

  afterAll(() => {
    db.close();
  });

  // ─── API Root ──────────────────────────────────────────────────────────────

  describe('GET /v1', () => {
    test('returns API discovery document', async () => {
      const res = await request(app).get('/v1');
      expect(res.status).toBe(200);
      expect(res.body.name).toMatch(/SmartLangGuard/i);
      expect(res.body.version).toBeTruthy();
      expect(res.body.endpoints).toBeDefined();
      expect(res.body.endpoints.license).toBeDefined();
      expect(res.body.endpoints.telemetry).toBeDefined();
    });
  });

  // ─── Telemetry Batch ───────────────────────────────────────────────────────

  describe('POST /v1/telemetry/batch', () => {
    test('accepts a valid batch of events', async () => {
      const res = await request(app)
        .post('/v1/telemetry/batch')
        .send({
          events: [
            { anonymous_id: 'a1', event: 'extension_activated', os: 'linux', app_version: '0.1.0' },
            { anonymous_id: 'a1', event: 'correction_applied', properties: { direction: 'en-to-ar' } },
            { anonymous_id: 'a2', event: 'error_occurred' }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3);
    });

    test('rejects empty events array with 400', async () => {
      const res = await request(app).post('/v1/telemetry/batch').send({ events: [] });
      expect(res.status).toBe(400);
    });

    test('rejects non-array events with 400', async () => {
      const res = await request(app).post('/v1/telemetry/batch').send({ events: 'not-an-array' });
      expect(res.status).toBe(400);
    });

    test('rejects > 100 events with 413', async () => {
      const events = Array.from({ length: 101 }, (_, i) => ({
        anonymous_id: 'a1',
        event: 'test_event',
        timestamp: Date.now() + i
      }));
      const res = await request(app).post('/v1/telemetry/batch').send({ events });
      expect(res.status).toBe(413);
    });

    test('rejects missing events body with 400', async () => {
      const res = await request(app).post('/v1/telemetry/batch').send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Telemetry Stats (auth-gated) ──────────────────────────────────────────

  describe('GET /v1/telemetry/stats', () => {
    test('rejects requests without API key with 401', async () => {
      const res = await request(app).get('/v1/telemetry/stats');
      expect(res.status).toBe(401);
    });

    test('rejects requests with invalid API key with 401', async () => {
      const res = await request(app)
        .get('/v1/telemetry/stats')
        .set('X-API-Key', 'invalid-key');
      expect(res.status).toBe(401);
    });
  });

  // ─── Billing Status ────────────────────────────────────────────────────────

  describe('GET /v1/billing/status', () => {
    beforeAll(async () => {
      const res = await request(app)
        .post('/v1/license/activate')
        .send({ email: 'billing@example.com', tier: 'pro' });
      licenseToken = res.body.token;
    });

    test('returns license status for a valid token', async () => {
      const res = await request(app)
        .get('/v1/billing/status')
        .set('Authorization', `Bearer ${licenseToken}`);
      expect(res.status).toBe(200);
      expect(res.body.tier).toBe('pro');
      expect(res.body.email).toBe('billing@example.com');
      expect(res.body).toHaveProperty('max_devices');
      expect(res.body).toHaveProperty('is_expired');
      expect(res.body).toHaveProperty('features');
    });

    test('rejects requests without Authorization header with 401', async () => {
      const res = await request(app).get('/v1/billing/status');
      expect(res.status).toBe(401);
    });

    test('returns 404 for unknown token', async () => {
      const res = await request(app)
        .get('/v1/billing/status')
        .set('Authorization', 'Bearer slg_unknown_token');
      expect(res.status).toBe(404);
    });
  });

  // ─── Billing Plans ─────────────────────────────────────────────────────────

  describe('GET /v1/billing/plans (extended)', () => {
    test('returns all four tiers in canonical order', async () => {
      const res = await request(app).get('/v1/billing/plans');
      expect(res.status).toBe(200);
      const tiers = res.body.plans.map(p => p.tier);
      expect(tiers).toEqual(['free', 'pro', 'team', 'enterprise']);
    });

    test('every plan has a price_usd, interval, and features array', async () => {
      const res = await request(app).get('/v1/billing/plans');
      for (const plan of res.body.plans) {
        expect(typeof plan.price_usd).toBe('number');
        expect(typeof plan.interval).toBe('string');
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      }
    });

    test('Pro plan is marked as popular', async () => {
      const res = await request(app).get('/v1/billing/plans');
      const pro = res.body.plans.find(p => p.tier === 'pro');
      expect(pro.popular).toBe(true);
    });

    test('free tier has price_usd = 0', async () => {
      const res = await request(app).get('/v1/billing/plans');
      const free = res.body.plans.find(p => p.tier === 'free');
      expect(free.price_usd).toBe(0);
    });
  });

  // ─── Admin endpoints (JWT-gated) ───────────────────────────────────────────

  describe('Admin endpoints', () => {
    test('rejects requests without admin JWT with 401', async () => {
      const res = await request(app).get('/v1/admin/licenses');
      expect(res.status).toBe(401);
    });

    test('rejects requests with malformed JWT with 401', async () => {
      const res = await request(app)
        .get('/v1/admin/licenses')
        .set('Authorization', 'Bearer not-a-jwt');
      expect(res.status).toBe(401);
    });

    test('accepts requests with a valid admin JWT', async () => {
      const res = await request(app)
        .get('/v1/admin/licenses')
        .set('Authorization', `Bearer ${adminToken}`);
      // We accept both 200 and 404 - the important thing is that the
      // auth gate passed, i.e. the response is NOT 401/403.
      expect([200, 404]).toContain(res.status);
    });
  });

  // ─── AI scoring endpoint ───────────────────────────────────────────────────

  describe('POST /v1/ai/score', () => {
    test('rejects requests without a token with 401 or 400', async () => {
      const res = await request(app).post('/v1/ai/score').send({
        original: 'high',
        candidates: ['اهلا']
      });
      expect([400, 401]).toContain(res.status);
    });
  });

  // ─── License Revoke ────────────────────────────────────────────────────────

  describe('POST /v1/license/revoke', () => {
    test('returns 400 without a token', async () => {
      const res = await request(app).post('/v1/license/revoke').send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Method Not Allowed / 404 ──────────────────────────────────────────────

  describe('Unknown routes', () => {
    test('returns 404 for /v1/nonexistent', async () => {
      const res = await request(app).get('/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });
});
