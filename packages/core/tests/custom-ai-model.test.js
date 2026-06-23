const {
  scoreWord,
  scoreSentence,
  rankCandidates,
  generateAlternatives,
  scoreLetterFrequency,
  scoreBigrams,
  scoreWordShape,
  scoreDictionaryLookup,
  COMMON_WORDS,
  LETTER_FREQ
} = require('../src/custom-ai-model');

describe('Custom AI Model', () => {
  describe('scoreLetterFrequency', () => {
    test('scores common Arabic letters high', () => {
      const score = scoreLetterFrequency('الم');
      expect(score).toBeGreaterThan(0);
    });

    test('returns 0 for Latin letters', () => {
      expect(scoreLetterFrequency('abc')).toBe(0);
    });

    test('returns 0 for empty string', () => {
      expect(scoreLetterFrequency('')).toBe(0);
    });
  });

  describe('scoreBigrams', () => {
    test('scores common bigrams high', () => {
      const score = scoreBigrams('السلام');
      expect(score).toBeGreaterThan(50);
    });

    test('penalizes rare bigrams', () => {
      const score = scoreBigrams('ةة');
      expect(score).toBeLessThan(50);
    });

    test('returns 50 for single character', () => {
      expect(scoreBigrams('ا')).toBe(50);
    });
  });

  describe('scoreWordShape', () => {
    test('rewards typical word length (3-7)', () => {
      const score = scoreWordShape('كتاب');
      expect(score).toBeGreaterThan(50);
    });

    test('rewards definite article prefix', () => {
      const score = scoreWordShape('الكتاب');
      expect(score).toBeGreaterThan(60);
    });

    test('penalizes very long words', () => {
      const score = scoreWordShape('العمليةالتنظيميةالخاصة');
      expect(score).toBeLessThan(60);
    });
  });

  describe('scoreDictionaryLookup', () => {
    test('finds exact match in dictionary', () => {
      const score = scoreDictionaryLookup('في');
      expect(score).toBe(COMMON_WORDS['في']);
    });

    test('finds word with stripped prefix', () => {
      const score = scoreDictionaryLookup('وفي');
      expect(score).toBeGreaterThan(0);
    });

    test('returns 0 for unknown word', () => {
      expect(scoreDictionaryLookup('غيرموجود')).toBe(0);
    });
  });

  describe('scoreWord', () => {
    test('returns 0 for Latin letters', () => {
      expect(scoreWord('abc')).toBe(0);
    });

    test('returns 0 for empty string', () => {
      expect(scoreWord('')).toBe(0);
    });

    test('scores common word high', () => {
      const score = scoreWord('في');
      expect(score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('scoreSentence', () => {
    test('returns 0 for empty string', () => {
      expect(scoreSentence('')).toBe(0);
    });

    test('returns 0 for null', () => {
      expect(scoreSentence(null)).toBe(0);
    });

    test('scores a real Arabic sentence', () => {
      const score = scoreSentence('اهلا اخبارك');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('rankCandidates', () => {
    test('picks best candidate', () => {
      const ranked = rankCandidates('high', ['اهلا', 'هجلا']);
      expect(ranked.bestCandidate).toBeTruthy();
      expect(ranked.confidence).toBeGreaterThan(0);
    });

    test('handles empty candidates', () => {
      const ranked = rankCandidates('test', []);
      expect(ranked.bestCandidate).toBe('test');
    });
  });

  describe('generateAlternatives', () => {
    test('generates alternatives for ي/ى confusion', () => {
      const alts = generateAlternatives('test', 'لى');
      expect(alts).toContain('لى');
      expect(alts).toContain('لي');
    });

    test('generates alternatives for ة/ه confusion', () => {
      const alts = generateAlternatives('test', 'ة');
      expect(alts).toContain('ة');
      expect(alts).toContain('ه');
    });

    test('deduplicates alternatives', () => {
      const alts = generateAlternatives('test', 'اهلا');
      const unique = [...new Set(alts)];
      expect(alts.length).toBe(unique.length);
    });
  });

  describe('Data integrity', () => {
    test('LETTER_FREQ has all Arabic letters', () => {
      expect(LETTER_FREQ['ا']).toBe(100);
      expect(LETTER_FREQ['ل']).toBe(95);
    });

    test('COMMON_WORDS has essential words', () => {
      expect(COMMON_WORDS['في']).toBe(100);
      expect(COMMON_WORDS['من']).toBe(100);
      expect(COMMON_WORDS['الله']).toBe(100);
    });
  });
});
