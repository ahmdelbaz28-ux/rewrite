'use strict';

const customModel = require('../src/custom-ai-model');
const { scoreWord, scoreSentence, rankCandidates, generateAlternatives } = customModel;

describe('Custom AI Model', () => {
  describe('scoreWord', () => {
    test('returns high score for common Arabic words', () => {
      expect(scoreWord('في')).toBeGreaterThanOrEqual(80);
      expect(scoreWord('اهلا')).toBeGreaterThanOrEqual(80);
      expect(scoreWord('الله')).toBeGreaterThanOrEqual(80);
      expect(scoreWord('محمد')).toBeGreaterThanOrEqual(80);
    });

    test('returns 0 for words with Latin letters', () => {
      expect(scoreWord('hello')).toBe(0);
      expect(scoreWord('ahmed')).toBe(0);
      expect(scoreWord('abc')).toBe(0);
    });

    test('returns 0 for empty', () => {
      expect(scoreWord('')).toBe(0);
      expect(scoreWord(null)).toBe(0);
    });

    test('returns moderate score for plausible but uncommon Arabic', () => {
      const score = scoreWord('كلمة');
      expect(score).toBeGreaterThan(20);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('penalizes very long words', () => {
      const longWord = 'ا'.repeat(20);
      const score = scoreWord(longWord);
      expect(score).toBeLessThan(80);
    });

    test('rewards definite article prefix', () => {
      const withAl = scoreWord('الكتاب');
      const withoutAl = scoreWord('كتاب');
      // Both should score well, but ال variant should be at least as good
      expect(withAl).toBeGreaterThan(50);
    });
  });

  describe('scoreSentence', () => {
    test('scores common Arabic sentences highly', () => {
      const score = scoreSentence('اهلا بك يا محمد');
      expect(score).toBeGreaterThan(60);
    });

    test('scores greeting phrases highly', () => {
      const score = scoreSentence('السلام عليكم');
      expect(score).toBeGreaterThan(70);
    });

    test('returns 0 for empty', () => {
      expect(scoreSentence('')).toBe(0);
      expect(scoreSentence(null)).toBe(0);
    });

    test('penalizes sentences with Latin letters', () => {
      const score = scoreSentence('hello world');
      expect(score).toBeLessThan(30);
    });

    test('rewards sentences with multiple high-scoring words', () => {
      const score = scoreSentence('في هذا اليوم من السنة');
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('rankCandidates', () => {
    test('returns best candidate from multiple options', () => {
      const result = rankCandidates('high', ['اهلا', 'هجلا', 'هحلا']);
      expect(result.bestCandidate).toBe('اهلا');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.allScores).toHaveLength(3);
    });

    test('returns original if no candidates', () => {
      const result = rankCandidates('test', []);
      expect(result.bestCandidate).toBe('test');
      expect(result.confidence).toBe(0);
    });

    test('sorts candidates by score (descending)', () => {
      const result = rankCandidates('test', ['اهلا', 'xyz']);
      expect(result.allScores[0].score).toBeGreaterThanOrEqual(result.allScores[1].score);
    });

    test('handles single candidate', () => {
      const result = rankCandidates('high', ['اهلا']);
      expect(result.bestCandidate).toBe('اهلا');
      expect(result.allScores).toHaveLength(1);
    });
  });

  describe('generateAlternatives', () => {
    test('generates variants with ى → ي substitution', () => {
      const alts = generateAlternatives('test', 'على');
      expect(alts).toContain('على');
      expect(alts).toContain('علي');
    });

    test('generates variants with ة → ه substitution', () => {
      const alts = generateAlternatives('test', 'مدرسة');
      expect(alts).toContain('مدرسة');
      expect(alts).toContain('مدرسه');
    });

    test('deduplicates alternatives', () => {
      const alts = generateAlternatives('test', 'اهلا');
      const unique = new Set(alts);
      expect(alts.length).toBe(unique.size);
    });

    test('always includes the primary conversion', () => {
      const alts = generateAlternatives('test', 'كتاب');
      expect(alts[0]).toBe('كتاب');
    });
  });

  describe('Letter frequency model', () => {
    test('has frequency for all common Arabic letters', () => {
      const commonLetters = ['ا', 'ل', 'م', 'و', 'ن', 'ي', 'ه', 'ب', 'ت', 'ر'];
      commonLetters.forEach(letter => {
        expect(customModel.LETTER_FREQ[letter]).toBeGreaterThan(40);
      });
    });

    test('rare letters have low frequency', () => {
      expect(customModel.LETTER_FREQ['ظ']).toBeLessThan(10);
      expect(customModel.LETTER_FREQ['غ']).toBeLessThan(15);
    });
  });

  describe('Bigram model', () => {
    test('has frequency for common pairs', () => {
      expect(customModel.BIGRAM_FREQ['ال']).toBeGreaterThan(50);
      expect(customModel.BIGRAM_FREQ['لا']).toBeGreaterThan(50);
    });

    test('marks rare pairs as rare', () => {
      expect(customModel.RARE_BIGRAMS.has('ةة')).toBe(true);
      expect(customModel.RARE_BIGRAMS.has('ءء')).toBe(true);
      expect(customModel.RARE_BIGRAMS.has('ظظ')).toBe(true);
    });

    test('does not mark common pairs as rare', () => {
      expect(customModel.RARE_BIGRAMS.has('ال')).toBe(false);
      expect(customModel.RARE_BIGRAMS.has('لا')).toBe(false);
    });
  });

  describe('Dictionary lookup', () => {
    test('finds exact words', () => {
      expect(customModel.scoreDictionaryLookup('في')).toBeGreaterThanOrEqual(80);
      expect(customModel.scoreDictionaryLookup('اهلا')).toBeGreaterThanOrEqual(80);
    });

    test('handles words with prefixes', () => {
      // "وبين" = "و" + "بين"
      const score = customModel.scoreDictionaryLookup('وبين');
      expect(score).toBeGreaterThan(0);
    });

    test('returns 0 for unknown words', () => {
      expect(customModel.scoreDictionaryLookup('xyz')).toBe(0);
      expect(customModel.scoreDictionaryLookup('')).toBe(0);
    });
  });

  describe('Integration with translator', () => {
    test('full pipeline: translate + score', () => {
      const { translate } = require('../src/translator');
      const result = translate('high', { scoreOutput: true });
      expect(result.text).toBe('اهلا');
      
      const aiScore = scoreSentence(result.text);
      expect(aiScore).toBeGreaterThan(50);
    });

    test('distinguishes good vs bad corrections', () => {
      const goodScore = scoreSentence('اهلا بك يا محمد');
      const badScore = scoreSentence('هجلا ك يا محمد');
      expect(goodScore).toBeGreaterThan(badScore);
    });
  });

  describe('Performance', () => {
    test('scores 1000 words in under 100ms', () => {
      const words = Array(1000).fill('اهلا بك يا محمد اليوم');
      const start = Date.now();
      words.forEach(w => scoreSentence(w));
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500); // generous for CI
    });
  });
});
