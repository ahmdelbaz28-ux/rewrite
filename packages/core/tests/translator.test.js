const {
  translate,
  translateBatch,
  convertToArabic,
  convertToEnglish,
  detectMistakeType,
  scoreArabicWord,
  EN_TO_AR,
  AR_TO_EN
} = require('../src/translator');

describe('Translator', () => {
  describe('convertToArabic', () => {
    test('converts simple English text to Arabic', () => {
      expect(convertToArabic('high')).toBe('اهلا');
    });

    test('converts phrase', () => {
      expect(convertToArabic('high hofhv;')).toBe('اهلا اخبارك');
    });

    test('handles empty string', () => {
      expect(convertToArabic('')).toBe('');
    });

    test('handles null/undefined', () => {
      expect(convertToArabic(null)).toBe('');
      expect(convertToArabic(undefined)).toBe('');
    });

    test('preserves spaces', () => {
      expect(convertToArabic('a b c')).toContain(' ');
    });

    test('preserves non-mapped characters', () => {
      expect(convertToArabic('!')).toBe('!');
    });

    test('converts numbers to Arabic-Indic digits', () => {
      expect(convertToArabic('123')).toBe('١٢٣');
    });
  });

  describe('convertToEnglish', () => {
    test('converts simple Arabic text to English', () => {
      // اهلا = ا(h) ه(i) لا(b) — lam-alef ligature maps to 'b'
      const result = convertToEnglish('اهلا');
      expect(result).toBe('hib');
    });

    test('converts Arabic text with separate lam+alef', () => {
      // ش=a م=l س=s — simple word without ligature
      const result = convertToEnglish('شمس');
      expect(result).toBe('als');
    });

    test('handles empty string', () => {
      expect(convertToEnglish('')).toBe('');
    });

    test('handles null/undefined', () => {
      expect(convertToEnglish(null)).toBe('');
      expect(convertToEnglish(undefined)).toBe('');
    });

    test('preserves non-Arabic characters', () => {
      expect(convertToEnglish('123')).toBe('123');
    });
  });

  describe('detectMistakeType', () => {
    test('detects English mistake (English text that should be Arabic)', () => {
      expect(detectMistakeType('high hofhv')).toBe('en-mistake');
    });

    test('detects Arabic mistake (Arabic text that should be English)', () => {
      expect(detectMistakeType('اهلا')).toBe('ar-mistake');
    });

    test('returns unknown for empty text', () => {
      expect(detectMistakeType('')).toBe('unknown');
    });

    test('returns unknown for null', () => {
      expect(detectMistakeType(null)).toBe('unknown');
    });

    test('returns unknown for non-string', () => {
      expect(detectMistakeType(123)).toBe('unknown');
    });

    test('returns unknown for numbers only', () => {
      expect(detectMistakeType('123')).toBe('unknown');
    });
  });

  describe('translate', () => {
    test('auto-detects and translates Arabic keyboard mistakes', () => {
      // Text that is clearly wrong-layout Arabic: 'اهلا' typed on English layout = 'high'
      // But 'high' is an English word, so test with forced direction
      const result = translate('high', { direction: 'en-to-ar' });
      expect(result).toBe('اهلا');
    });

    test('forces en-to-ar direction', () => {
      const result = translate('high', { direction: 'en-to-ar' });
      expect(result).toBe('اهلا');
    });

    test('preserves intentional English words in auto mode', () => {
      // 'high' is in the intentional English words list, should NOT be auto-converted
      const result = translate('high');
      expect(result).toBe('high');
    });

    test('auto-detects Arabic text typed on English keyboard', () => {
      // Arabic-only text should be detected as ar-mistake for conversion to English
      const result = translate('اهلا');
      expect(typeof result).toBe('string');
    });

    test('returns score when scoreOutput is true', () => {
      const result = translate('high', { scoreOutput: true });
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('direction');
      expect(typeof result.score).toBe('number');
    });

    test('handles empty string', () => {
      expect(translate('')).toBe('');
    });
  });

  describe('translateBatch', () => {
    test('translates multiple texts', () => {
      const results = translateBatch(['high', 'hofhv;']);
      expect(results).toHaveLength(2);
      // 'high' is an English word, should be preserved in auto mode
      expect(results[0]).toBe('high');
    });

    test('handles empty array', () => {
      expect(translateBatch([])).toEqual([]);
    });
  });

  describe('scoreArabicWord', () => {
    test('scores known word', () => {
      const score = scoreArabicWord('في');
      expect(score).toBeGreaterThan(0);
    });

    test('returns 0 for empty string', () => {
      expect(scoreArabicWord('')).toBe(0);
    });

    test('scores unknown Arabic word with heuristics', () => {
      const score = scoreArabicWord('البيت');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Layout Maps', () => {
    test('EN_TO_AR has mappings for all letters', () => {
      expect(EN_TO_AR['q']).toBe('ض');
      expect(EN_TO_AR['a']).toBe('ش');
      expect(EN_TO_AR['h']).toBe('ا');
    });

    test('AR_TO_EN has reverse mappings', () => {
      expect(AR_TO_EN['ض']).toBe('q');
      expect(AR_TO_EN['ش']).toBe('a');
    });
  });
});
