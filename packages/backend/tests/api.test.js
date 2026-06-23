process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.ADMIN_DEFAULT_PASSWORD = 'testpass123';
process.env.SMARTLANGGUARD_DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/server');
const db = require('../src/db');

describe('Backend API', () => {
  let adminToken = '';

  beforeAll(async () => {
    db.init();
    // Get admin JWT token for protected endpoints
    const adminRes = await request(app)
      .post('/v1/admin/login')
      .send({ username: 'admin', password: 'testpass123' });
    adminToken = adminRes.body.token || '';
  });

  afterAll(() => {
    db.close();
  });

  describe('GET /health', () => {
    test('returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /v1/license/activate', () => {
    test('activates a free license', async () => {
      const res = await request(app)
        .post('/v1/license/activate')
        .set('Authorization', 'Bearer ' + (adminToken))
        .send({ email: 'test@example.com', tier: 'free' });
      expect(res.status).toBe(201);
      expect(res.body.token).toMatch(/^slg_/);
      expect(res.body.tier).toBe('free');
    });

    test('activates a pro license', async () => {
      const res = await request(app)
        .post('/v1/license/activate')
        .set('Authorization', 'Bearer ' + (adminToken))
        .send({ email: 'pro@example.com', tier: 'pro' });
      expect(res.status).toBe(201);
      expect(res.body.tier).toBe('pro');
    });

    test('returns 400 without email', async () => {
      const res = await request(app)
        .post('/v1/license/activate')
        .set('Authorization', 'Bearer ' + (adminToken))
        .send({ tier: 'free' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/license/validate', () => {
    test('validates an active license', async () => {
      const activateRes = await request(app)
        .post('/v1/license/activate')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ email: 'validate@example.com', tier: 'pro' });

      const res = await request(app)
        .post('/v1/license/validate')
        .set('X-Device-Id', 'dev-test-1')
        .set('X-Device-Fingerprint', 'fp-test-1')
        .send({ token: activateRes.body.token });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.tier).toBe('pro');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .post('/v1/license/validate')
        .send({ token: 'slg_invalid_token' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
    });

    test('returns 400 without token', async () => {
      const res = await request(app)
        .post('/v1/license/validate')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/admin/login', () => {
    test('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/v1/admin/login')
        .send({ username: 'admin', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.username).toBe('admin');
    });

    test('rejects wrong password', async () => {
      const res = await request(app)
        .post('/v1/admin/login')
        .send({ username: 'admin', password: 'wrongpass' });

      expect(res.status).toBe(401);
    });

    test('returns 400 without credentials', async () => {
      const res = await request(app)
        .post('/v1/admin/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/billing/plans', () => {
    test('returns all pricing plans', async () => {
      const res = await request(app).get('/v1/billing/plans');
      expect(res.status).toBe(200);
      expect(res.body.plans).toHaveLength(4);
      expect(res.body.plans[0].tier).toBe('free');
      expect(res.body.plans[1].tier).toBe('pro');
    });
  });

  describe('GET /v1/stripe/pricing', () => {
    test('returns pricing info', async () => {
      const res = await request(app).get('/v1/stripe/pricing');
      expect(res.status).toBe(200);
      expect(res.body.pricing).toHaveLength(3);
    });
  });

  describe('GET /v1/stripe/config', () => {
    test('returns stripe config status', async () => {
      const res = await request(app).get('/v1/stripe/config');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('configured');
    });
  });

  describe('404 handler', () => {
    test('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});
