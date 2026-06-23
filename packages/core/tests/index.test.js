const core = require('../src/index');

describe('Core Index (Main Entry Point)', () => {
  describe('Exports', () => {
    test('exports VERSION', () => {
      expect(core.VERSION).toBeTruthy();
      expect(typeof core.VERSION).toBe('string');
    });

    test('exports init function', () => {
      expect(typeof core.init).toBe('function');
    });

    test('exports fixText function', () => {
      expect(typeof core.fixText).toBe('function');
    });

    test('exports fixTextBatch function', () => {
      expect(typeof core.fixTextBatch).toBe('function');
    });

    test('exports activateLicense function', () => {
      expect(typeof core.activateLicense).toBe('function');
    });

    test('exports getLicenseStatus function', () => {
      expect(typeof core.getLicenseStatus).toBe('function');
    });

    test('exports shutdown function', () => {
      expect(typeof core.shutdown).toBe('function');
    });

    test('exports translate function', () => {
      expect(typeof core.translate).toBe('function');
    });

    test('exports FEATURES object', () => {
      expect(core.FEATURES).toBeTruthy();
      expect(core.FEATURES.RULES_ONLY).toBe('rules-only');
      expect(core.FEATURES.AI_SCORING).toBe('ai-scoring');
    });

    test('exports TIER_FEATURES object', () => {
      expect(core.TIER_FEATURES).toBeTruthy();
      expect(core.TIER_FEATURES.free).toContain('rules-only');
    });

    test('exports SoundPlayer class', () => {
      expect(core.SoundPlayer).toBeTruthy();
    });

    test('exports TypingDetector class', () => {
      expect(core.TypingDetector).toBeTruthy();
    });

    test('exports detectWrongLayout function', () => {
      expect(typeof core.detectWrongLayout).toBe('function');
    });

    test('exports findAllMistakes function', () => {
      expect(typeof core.findAllMistakes).toBe('function');
    });

    test('exports customModel', () => {
      expect(core.customModel).toBeTruthy();
      expect(typeof core.customModel.scoreSentence).toBe('function');
    });
  });

  describe('getLicenseStatus', () => {
    test('returns free tier when no license is set', () => {
      const status = core.getLicenseStatus();
      expect(status.valid).toBe(false);
      expect(status.tier).toBe('free');
    });
  });

  describe('fixText', () => {
    test('fixes simple English-to-Arabic text', async () => {
      const result = await core.fixText('high', { useAI: false, direction: 'en-to-ar' });
      expect(result.original).toBe('high');
      expect(result.corrected).toBe('اهلا');
      expect(result.direction).toBe('en-to-ar');
      expect(typeof result.score).toBe('number');
    });

    test('fixes a phrase', async () => {
      const result = await core.fixText('high hofhv;', { useAI: false, direction: 'en-to-ar' });
      expect(result.corrected).toContain('اهلا');
    });

    test('returns result object with all fields', async () => {
      const result = await core.fixText('high', { useAI: false, direction: 'en-to-ar' });
      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('corrected');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('source');
    });
  });

  describe('fixTextBatch', () => {
    test('fixes multiple texts', async () => {
      const results = await core.fixTextBatch(['high', 'hofhv;'], { useAI: false, direction: 'en-to-ar' });
      expect(results).toHaveLength(2);
      expect(results[0].corrected).toBe('اهلا');
    });
  });
});
