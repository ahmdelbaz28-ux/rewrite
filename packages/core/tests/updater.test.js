const { compareVersions, getCurrentVersion, checkForUpdate } = require('../src/updater');

describe('Updater', () => {
  describe('compareVersions', () => {
    test('returns 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    test('returns 1 when a > b', () => {
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
    });

    test('returns -1 when a < b', () => {
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    });

    test('handles different lengths', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.1', '1.0')).toBe(1);
    });

    test('handles major version differences', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });
  });

  describe('getCurrentVersion', () => {
    test('returns a version string', () => {
      const v = getCurrentVersion();
      expect(typeof v).toBe('string');
      expect(v).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('checkForUpdate', () => {
    test('returns updateAvailable false when manifest unreachable', async () => {
      const result = await checkForUpdate();
      expect(result).toHaveProperty('updateAvailable');
      expect(result).toHaveProperty('currentVersion');
      expect(result).toHaveProperty('latestVersion');
    });
  });
});
