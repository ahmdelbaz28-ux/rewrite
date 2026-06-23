const {
  signLicenseToken,
  verifyLicenseToken,
  hasFeature,
  FEATURES,
  TIER_FEATURES,
  getDeviceFingerprint,
  getDeviceId
} = require('../src/license');

describe('License', () => {
  describe('signLicenseToken & verifyLicenseToken', () => {
    test('signs and verifies a valid token', () => {
      const payload = {
        tier: 'pro',
        features: ['rules-only', 'ai-scoring'],
        expires_at: Date.now() + 86400000
      };
      const token = signLicenseToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const verified = verifyLicenseToken(token);
      expect(verified).toBeTruthy();
      expect(verified.tier).toBe('pro');
      expect(verified.features).toContain('ai-scoring');
    });

    test('rejects tampered token', () => {
      const payload = { tier: 'free', expires_at: Date.now() + 86400000 };
      const token = signLicenseToken(payload);
      const tampered = token.slice(0, -2) + 'XX';
      expect(verifyLicenseToken(tampered)).toBeNull();
    });

    test('rejects expired token', () => {
      const payload = { tier: 'pro', expires_at: Date.now() - 1000 };
      const token = signLicenseToken(payload);
      expect(verifyLicenseToken(token)).toBeNull();
    });

    test('rejects null/undefined token', () => {
      expect(verifyLicenseToken(null)).toBeNull();
      expect(verifyLicenseToken(undefined)).toBeNull();
    });

    test('rejects malformed token', () => {
      expect(verifyLicenseToken('not-a-token')).toBeNull();
      expect(verifyLicenseToken('a.b.c')).toBeNull();
    });
  });

  describe('hasFeature', () => {
    test('returns true for features in license', () => {
      const license = { valid: true, features: ['rules-only', 'ai-scoring'] };
      expect(hasFeature(license, FEATURES.AI_SCORING)).toBe(true);
    });

    test('returns false for features not in license', () => {
      const license = { valid: true, features: ['rules-only'] };
      expect(hasFeature(license, FEATURES.AI_SCORING)).toBe(false);
    });

    test('returns true for rules-only on null license', () => {
      expect(hasFeature(null, FEATURES.RULES_ONLY)).toBe(true);
    });

    test('returns false for non-rules-only on null license', () => {
      expect(hasFeature(null, FEATURES.AI_SCORING)).toBe(false);
    });
  });

  describe('TIER_FEATURES', () => {
    test('free tier has rules-only', () => {
      expect(TIER_FEATURES.free).toContain(FEATURES.RULES_ONLY);
      expect(TIER_FEATURES.free).not.toContain(FEATURES.AI_SCORING);
    });

    test('pro tier has AI scoring', () => {
      expect(TIER_FEATURES.pro).toContain(FEATURES.AI_SCORING);
      expect(TIER_FEATURES.pro).toContain(FEATURES.MULTI_DEVICE);
    });

    test('team tier has all features', () => {
      expect(TIER_FEATURES.team.length).toBe(Object.values(FEATURES).length);
    });

    test('enterprise tier has all features', () => {
      expect(TIER_FEATURES.enterprise.length).toBe(Object.values(FEATURES).length);
    });
  });

  describe('getDeviceFingerprint', () => {
    test('returns a hex string', () => {
      const fp = getDeviceFingerprint();
      expect(fp).toBeTruthy();
      expect(typeof fp).toBe('string');
      expect(fp).toMatch(/^[a-f0-9]+$/);
    });

    test('is deterministic for same machine', () => {
      const fp1 = getDeviceFingerprint();
      const fp2 = getDeviceFingerprint();
      expect(fp1).toBe(fp2);
    });
  });

  describe('getDeviceId', () => {
    test('returns a device ID string', () => {
      const id = getDeviceId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.startsWith('dev_')).toBe(true);
    });
  });
});
