'use strict';

const {
  translate,
  translateBatch,
  convertToArabic,
  convertToEnglish,
  detectMistakeType,
  scoreArabicWord
} = require('../src/translator');

describe('Translator', () => {
  describe('convertToArabic', () => {
    test('converts basic English mistyped text to Arabic', () => {
      // "اهلا" on QWERTY layout = "high"
      expect(convertToArabic('high')).toBe('اهلا');
    });

    test('converts full sentence', () => {
      // "اهلا اخبارك" = "high hofhv;" on QWERTY (h=ا, i=ه, g=ل, h=ا, o=خ, f=ب, h=ا, v=ر, ;=ك)
      expect(convertToArabic('high hofhv;')).toBe('اهلا اخبارك');
    });

    test('preserves spaces and punctuation', () => {
      expect(convertToArabic('high!')).toBe('اهلا!');
    });

    test('preserves uppercase as lowercase mapping', () => {
      expect(convertToArabic('HIGH')).toBe('اهلا');
    });

    test('handles empty string', () => {
      expect(convertToArabic('')).toBe('');
    });

    test('preserves numbers as Arabic-Indic digits', () => {
      // Numbers 0-9 are mapped to Arabic-Indic digits ٠-٩
      const result = convertToArabic('hello 123');
      expect(result).toContain('١');
      expect(result).toContain('٢');
      expect(result).toContain('٣');
    });

    test('preserves unmapped chars like @ and # unchanged', () => {
      expect(convertToArabic('test@domain.com')).toContain('@');
      expect(convertToArabic('tag #1')).toContain('#');
    });

    test('handles "لا" combination (b → لا)', () => {
      expect(convertToArabic('b')).toBe('لا');
    });

    test('correctly maps "hglg" to "المل" (not "اهلا")', () => {
      // Important: this verifies the mapping is correct.
      // "hglg" actually maps to "المل" on Arabic 101 layout, NOT "اهلا".
      // "اهلا" on QWERTY is "high".
      expect(convertToArabic('hglg')).toBe('المل');
    });
  });

  describe('convertToEnglish', () => {
    test('converts Arabic mistyped text back to English', () => {
      const result = convertToEnglish('اهلا');
      expect(result).toContain('h');
    });

    test('handles empty string', () => {
      expect(convertToEnglish('')).toBe('');
    });
  });

  describe('detectMistakeType', () => {
    test('detects English-mistyped text', () => {
      expect(detectMistakeType('high hofhv;')).toBe('en-mistake');
    });

    test('detects Arabic-mistyped text', () => {
      expect(detectMistakeType('اهلا اخبارك')).toBe('ar-mistake');
    });

    test('returns unknown for empty', () => {
      expect(detectMistakeType('')).toBe('unknown');
    });

    test('returns unknown for mixed balanced text', () => {
      expect(detectMistakeType('123')).toBe('unknown');
    });
  });

  describe('translate (auto mode)', () => {
    test('auto-detects English→Arabic', () => {
      expect(translate('high')).toBe('اهلا');
    });

    test('auto-detects with score', () => {
      const result = translate('اهلا بك', { scoreOutput: true });
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('direction');
    });

    test('supports explicit direction', () => {
      const result = translate('high', { direction: 'en-to-ar' });
      expect(result).toBe('اهلا');
    });
  });

  describe('translateBatch', () => {
    test('translates multiple inputs', () => {
      const results = translateBatch(['high', 'hofhv;']);
      expect(results).toHaveLength(2);
      expect(results[0]).toBe('اهلا');
      expect(results[1]).toBe('اخبارك');
    });
  });

  describe('scoreArabicWord', () => {
    test('returns high score for common words', () => {
      expect(scoreArabicWord('في')).toBeGreaterThanOrEqual(80);
    });

    test('returns 0 for empty', () => {
      expect(scoreArabicWord('')).toBe(0);
    });

    test('returns positive score for any Arabic', () => {
      expect(scoreArabicWord('كلمة')).toBeGreaterThan(0);
    });
  });
});
