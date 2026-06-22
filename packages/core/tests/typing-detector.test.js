const { TypingDetector, detectWrongLayout, detectLastWord, findAllMistakes } = require('../src/typing-detector');

describe('TypingDetector', () => {
  describe('Stateless functions', () => {
    describe('detectWrongLayout', () => {
      test('detects English text that should be Arabic', () => {
        const result = detectWrongLayout('high');
        expect(result).toBeTruthy();
        expect(result.detected).toBe(true);
        expect(result.direction).toBe('en-to-ar');
      });

      test('returns null for short text', () => {
        expect(detectWrongLayout('a')).toBeNull();
      });

      test('returns null for empty string', () => {
        expect(detectWrongLayout('')).toBeNull();
      });

      test('returns null for null input', () => {
        expect(detectWrongLayout(null)).toBeNull();
      });
    });

    describe('detectLastWord', () => {
      test('detects last word mistake', () => {
        const result = detectLastWord('hello world high');
        expect(result).toBeTruthy();
        expect(result.word).toBe('high');
        expect(result.range).toBeDefined();
      });

      test('returns null for empty text', () => {
        expect(detectLastWord('')).toBeNull();
      });

      test('handles cursor position', () => {
        const result = detectLastWord('high world', 4);
        expect(result).toBeTruthy();
      });
    });

    describe('findAllMistakes', () => {
      test('finds multiple mistakes', () => {
        const mistakes = findAllMistakes('high hofhv');
        expect(mistakes.length).toBeGreaterThan(0);
      });

      test('returns empty for no mistakes', () => {
        expect(findAllMistakes('اهلا وسهلا')).toEqual([]);
      });

      test('returns empty for empty string', () => {
        expect(findAllMistakes('')).toEqual([]);
      });

      test('returns empty for null', () => {
        expect(findAllMistakes(null)).toEqual([]);
      });
    });
  });

  describe('TypingDetector class', () => {
    test('constructs with default options', () => {
      const td = new TypingDetector();
      expect(td).toBeTruthy();
      expect(td.options.minConsecutiveChars).toBe(3);
    });

    test('constructs with custom sensitivity', () => {
      const td = new TypingDetector({ sensitivity: 'high' });
      expect(td.options.minConsecutiveChars).toBe(2);
    });

    test('low sensitivity requires more chars', () => {
      const td = new TypingDetector({ sensitivity: 'low' });
      expect(td.options.minConsecutiveChars).toBe(5);
    });

    test('analyze returns null for empty input', async () => {
      const td = new TypingDetector();
      const result = await td.analyze({ text: '', insertedText: '' });
      expect(result).toBeNull();
    });

    test('reset clears state', () => {
      const td = new TypingDetector();
      td.currentWord = 'test';
      td.reset();
      expect(td.currentWord).toBe('');
    });

    test('getState returns current state', () => {
      const td = new TypingDetector();
      td.currentWord = 'test';
      const state = td.getState();
      expect(state.currentWord).toBe('test');
    });
  });
});
