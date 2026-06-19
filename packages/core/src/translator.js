/**
 * SmartLangGuard Core - Translation Engine
 * 
 * Converts text typed with wrong keyboard layout (Arabic/English mismatch)
 * to the correct layout. Uses a deterministic character-mapping approach
 * with word-level dictionary scoring for ambiguous cases.
 * 
 * @module core/translator
 */

'use strict';

// ─── Layout Maps ──────────────────────────────────────────────────────────────

/**
 * English QWERTY → Arabic 101 layout mapping.
 * Each key on the English keyboard maps to its Arabic equivalent
 * when the OS is set to Arabic layout.
 */
const EN_TO_AR = {
  q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح',
  a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م',
  z: 'ئ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة',
  '`': 'ذ', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩', 0: '٠',
  '-': '-', '=': '=', '[': 'ج', ']': 'د', '\\': '\\', ';': 'ك', "'": 'ط',
  ',': 'و', '.': 'ز', '/': 'ظ',
  ' ': ' '
};

/**
 * Arabic 101 → English QWERTY reverse mapping.
 * Used when user typed Arabic text but intended English.
 */
const AR_TO_EN = (() => {
  const map = {};
  for (const [en, ar] of Object.entries(EN_TO_AR)) {
    if (!map[ar]) map[ar] = en;
  }
  // Manual overrides for ambiguous characters
  map['ى'] = 'n';
  map['ي'] = 'd'; // ensure ي→d since ى→n
  map['ة'] = 'm';
  map['ه'] = 'i';
  map['ا'] = 'h';
  map['أ'] = 'h';
  map['إ'] = 'h';
  map['آ'] = 'h';
  return map;
})();

// ─── Common Arabic Words Dictionary ───────────────────────────────────────────

/**
 * Frequency-ranked list of common Arabic words for scoring.
 * Higher score = more likely correct.
 */
const ARABIC_WORD_SCORES = {
  'في': 100, 'من': 100, 'على': 100, 'الى': 95, 'عن': 95, 'مع': 90,
  'هذا': 95, 'هذه': 95, 'ذلك': 90, 'التي': 90, 'الذي': 90,
  'كان': 95, 'كانت': 90, 'يكون': 85, 'قد': 85, 'كل': 90, 'بعض': 85,
  'عند': 85, 'عندما': 80, 'ثم': 80, 'او': 80, 'اما': 75, 'لكن': 85,
  'ايضا': 80, 'حيث': 80, 'كما': 80, 'لكي': 75, 'حتى': 85, '_since': 0,
  'اهلا': 90, 'السلام': 85, 'عليكم': 85, 'مرحبا': 90, 'شكرا': 95,
  'جزاك': 80, 'الله': 100, 'الرحمن': 85, 'الرحيم': 85,
  'الكتاب': 80, 'المدرسة': 75, 'البيت': 80, 'العمل': 80,
  'اليوم': 85, 'الان': 85, 'غدا': 80, 'امس': 75,
  'كتاب': 80, 'قلم': 75, 'ورقة': 75, 'مكتب': 75,
  'اهلا': 90, 'اخبارك': 85, 'تمام': 85, 'ماشي': 80,
  'محمد': 85, 'احمد': 85, 'علي': 85, 'حسن': 80,
  'مشروع': 80, 'برنامج': 80, 'كود': 75, 'تطبيق': 80,
  'انترنت': 75, 'كمبيوتر': 75, 'هاتف': 75, 'شاشة': 75,
  // Common English→Arabic mistakes (raw English shouldn't appear in Arabic output)
  'high': 0, // 'اهلا' raw - shouldn't appear
};

// ─── Detection Heuristics ─────────────────────────────────────────────────────

/**
 * Detects whether text appears to be typed in wrong layout.
 * Returns: 'en-mistake' | 'ar-mistake' | 'unknown'
 */
function detectMistakeType(text) {
  if (!text || typeof text !== 'string') return 'unknown';

  let enCount = 0;
  let arCount = 0;
  let consecutiveEn = 0;
  let maxConsecutiveEn = 0;

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0600 && code <= 0x06FF) {
      arCount++;
      consecutiveEn = 0;
    } else if (/[a-zA-Z]/.test(ch)) {
      enCount++;
      consecutiveEn++;
      if (consecutiveEn > maxConsecutiveEn) maxConsecutiveEn = consecutiveEn;
    } else {
      consecutiveEn = 0;
    }
  }

  // 3+ consecutive English letters in a mostly-Arabic context = English mistake
  if (arCount > 0 && enCount > 0) {
    if (maxConsecutiveEn >= 3 && enCount > arCount) return 'en-mistake';
    if (arCount > enCount) return 'ar-mistake';
  }

  if (enCount > 0 && arCount === 0 && maxConsecutiveEn >= 2) return 'en-mistake';
  if (arCount > 0 && enCount === 0) return 'ar-mistake';

  return 'unknown';
}

// ─── Core Converters ──────────────────────────────────────────────────────────

/**
 * Converts English-typed text to Arabic (mistyped with English layout).
 * @param {string} text
 * @returns {string}
 */
function convertToArabic(text) {
  if (!text) return '';
  return text.split('').map(ch => {
    const lower = ch.toLowerCase();
    if (EN_TO_AR.hasOwnProperty(lower)) {
      return EN_TO_AR[lower];
    }
    return ch;
  }).join('');
}

/**
 * Converts Arabic-typed text to English (mistyped with Arabic layout).
 * @param {string} text
 * @returns {string}
 */
function convertToEnglish(text) {
  if (!text) return '';
  return text.split('').map(ch => AR_TO_EN[ch] || ch).join('');
}

// ─── Word-Level Scoring ───────────────────────────────────────────────────────

/**
 * Scores an Arabic word by checking against the common-words dictionary.
 * Falls back to letter-frequency heuristics.
 * @param {string} word - Arabic word
 * @returns {number} 0-100 score
 */
function scoreArabicWord(word) {
  if (!word) return 0;
  const clean = word.replace(/[^\u0600-\u06FF]/g, '');
  if (!clean) return 0;

  if (ARABIC_WORD_SCORES.hasOwnProperty(clean)) {
    return ARABIC_WORD_SCORES[clean];
  }

  // Heuristic: words containing common Arabic letter combinations score higher
  let score = 30; // base score for valid Arabic letters
  if (clean.includes('ال')) score += 20; // definite article
  if (clean.length >= 3 && clean.length <= 7) score += 10; // typical word length
  if (/[اوي]/.test(clean.slice(-1))) score += 5; // common ending
  return Math.min(score, 80);
}

/**
 * Scores a converted word in context with its neighbors.
 * Used by the AI scoring layer for ambiguous cases.
 */
function scoreConversion(original, converted) {
  const wordScore = scoreArabicWord(converted);
  // Penalize if converted word has unusual character patterns
  if (/[A-Za-z]/.test(converted)) return wordScore * 0.3;
  return wordScore;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main translation function. Auto-detects direction and applies conversion.
 * @param {string} text - Input text (likely mistyped)
 * @param {Object} [options]
 * @param {'auto'|'en-to-ar'|'ar-to-en'} [options.direction='auto']
 * @param {boolean} [options.scoreOutput=false] - include confidence score
 * @returns {string|{text: string, score: number, direction: string}}
 */
function translate(text, options = {}) {
  const direction = options.direction || 'auto';
  let detected = direction;

  if (direction === 'auto') {
    detected = detectMistakeType(text);
    if (detected === 'unknown') detected = 'en-mistake'; // default
  }

  let result;
  if (detected === 'en-mistake' || detected === 'en-to-ar') {
    result = convertToArabic(text);
    detected = 'en-to-ar';
  } else if (detected === 'ar-mistake' || detected === 'ar-to-en') {
    result = convertToEnglish(text);
    detected = 'ar-to-en';
  } else {
    result = text;
  }

  if (options.scoreOutput) {
    // Average word score for confidence
    const words = result.split(/\s+/).filter(Boolean);
    const totalScore = words.reduce((sum, w) => sum + scoreConversion(w, w), 0);
    const avgScore = words.length > 0 ? Math.round(totalScore / words.length) : 0;
    return { text: result, score: avgScore, direction: detected };
  }

  return result;
}

/**
 * Batch translation for multiple inputs.
 * @param {string[]} texts
 * @param {Object} [options]
 * @returns {Array}
 */
function translateBatch(texts, options = {}) {
  return texts.map(t => translate(t, options));
}

module.exports = {
  translate,
  translateBatch,
  convertToArabic,
  convertToEnglish,
  detectMistakeType,
  scoreArabicWord,
  scoreConversion,
  EN_TO_AR,
  AR_TO_EN,
  ARABIC_WORD_SCORES
};
