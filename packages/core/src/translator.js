/**
 * SmartLangGuard Core - Translation Engine
 * 
 * Converts text typed with wrong keyboard layout (Arabic/English mismatch)
 * to the correct layout. Uses a deterministic character-mapping approach
 * with word-level dictionary scoring for ambiguous cases.
 * 
 * Supports multiple keyboard layouts: QWERTY (US), AZERTY (French), QWERTZ (German)
 * 
 * @module core/translator
 */

'use strict';

// ─── Keyboard Layout Maps ──────────────────────────────────────────────────────

/**
 * English US QWERTY → Arabic 101 layout mapping.
 * Each key on the English keyboard maps to its Arabic equivalent
 * when the OS is set to Arabic layout.
 */
const EN_TO_AR_QWERTY = {
  q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح',
  a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م',
  z: 'ئ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة',
  '`': 'ذ', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩', 0: '٠',
  '-': '-', '=': '=', '[': 'ج', ']': 'د', '\\': '\\', ';': 'ك', "'": 'ط',
  ',': 'و', '.': 'ز', '/': 'ظ',
  ' ': ' '
};

/**
 * French AZERTY → Arabic 101 layout mapping.
 * Used by French-speaking Arabic users (Algeria, Morocco, Tunisia, Lebanon).
 */
const EN_TO_AR_AZERTY = {
  a: 'ش', z: 'ئ', e: 'ث', r: 'ق', t: 'ف', y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح',
  q: 'ض', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م',
  w: 'ص', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة',
  '`': 'ذ', '&': '١', 'é': '٢', '"': '٣', "'": '٤', '(': '٥', '-': '٦',
  'è': '٧', '_': '٨', 'ç': '٩', 'à': '٠',
  ')': '=', '^': 'ج', '$': 'د', '*': '\\', ';': 'ك', ':': 'ط',
  ',': 'و', '.': 'ز', '/': 'ظ',
  ' ': ' '
};

/**
 * German QWERTZ → Arabic 101 layout mapping.
 */
const EN_TO_AR_QWERTZ = {
  q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف', z: 'ئ', u: 'ع', i: 'ه', o: 'خ', p: 'ح',
  a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل', h: 'ا', j: 'ت', k: 'ن', l: 'م',
  y: 'غ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا', n: 'ى', m: 'ة',
  '`': 'ذ', 1: '١', 2: '٢', 3: '٣', 4: '٤', 5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩', 0: '٠',
  '-': '-', '=': '=', '[': 'ج', ']': 'د', '\\': '\\', ';': 'ك', "'": 'ط',
  ',': 'و', '.': 'ز', '/': 'ظ',
  ' ': ' '
};

// Active layout (default: QWERTY)
let activeLayout = 'qwerty';
const LAYOUTS = {
  qwerty: EN_TO_AR_QWERTY,
  azerty: EN_TO_AR_AZERTY,
  qwertz: EN_TO_AR_QWERTZ
};

/**
 * Get the active EN_TO_AR map based on current layout.
 */
function getActiveMap() {
  return LAYOUTS[activeLayout] || LAYOUTS.qwerty;
}

// Keep backward-compatible EN_TO_AR reference
const EN_TO_AR = EN_TO_AR_QWERTY;

/**
 * Sets the active keyboard layout.
 * @param {'qwerty'|'azerty'|'qwertz'} layout
 */
function setKeyboardLayout(layout) {
  if (LAYOUTS[layout]) {
    activeLayout = layout;
  }
}

/**
 * Gets the current active keyboard layout name.
 */
function getKeyboardLayout() {
  return activeLayout;
}

/**
 * Auto-detects keyboard layout from text patterns.
 * Checks if certain key combinations are more consistent with one layout.
 */
function detectKeyboardLayout(text) {
  if (!text) return 'qwerty';
  
  // Check for AZERTY indicators: é, è, ç, à are common in French text
  if (/[éèçà]/.test(text)) return 'azerty';
  
  // Check for QWERTZ indicators: German-specific characters
  // ß, ü, ö, ä are strong indicators of German/QWERTZ layout
  if (/[ßüöäÜÖÄ]/.test(text)) return 'qwertz';
  
  // Heuristic: if text has many 'z' chars where 'y' would be expected in QWERTY
  // (QWERTZ swaps y↔z compared to QWERTY)
  const zCount = (text.match(/z/gi) || []).length;
  const yCount = (text.match(/y/gi) || []).length;
  if (zCount > yCount * 2 && zCount >= 2) return 'qwertz';
  
  return 'qwerty';
}

// ─── Reverse Mapping ──────────────────────────────────────────────────────────

/**
 * Arabic 101 → English QWERTY reverse mapping.
 * Used when user typed Arabic text but intended English.
 * Properly handles hamza variants as distinct mappings.
 */
// Build reverse maps for each layout to support Arabic→English conversion correctly
const AR_TO_EN_MAPS = {};
function buildReverseMap(enToAr) {
  const map = {};
  for (const [en, ar] of Object.entries(enToAr)) {
    if (!map[ar]) map[ar] = en;  // first mapping wins for each Arabic char
  }
  // Manual overrides for ambiguous/special characters
  map['ى'] = 'n';   // alef maqsura
  map['ي'] = 'd';   // ya
  map['ة'] = 'm';   // ta marbuta
  map['ه'] = 'i';   // ha
  map['ا'] = 'h';   // alef
  map['أ'] = 'h';   // alef with hamza above
  map['إ'] = 'h';   // alef with hamza below
  map['آ'] = 'h';   // alef with madda
  map['ؤ'] = 'c';   // waw with hamza
  map['ئ'] = 'z';   // ya with hamza
  map['ء'] = 'x';   // bare hamza
  map['لا'] = 'b';  // lam-alef ligature
  return map;
}
AR_TO_EN_MAPS.qwerty = buildReverseMap(EN_TO_AR_QWERTY);
AR_TO_EN_MAPS.azerty = buildReverseMap(EN_TO_AR_AZERTY);
AR_TO_EN_MAPS.qwertz = buildReverseMap(EN_TO_AR_QWERTZ);

// Backward-compatible AR_TO_EN reference (uses QWERTY layout)
const AR_TO_EN = AR_TO_EN_MAPS.qwerty;

// ─── False Positive Patterns ──────────────────────────────────────────────────

/**
 * Patterns that should NEVER be auto-converted.
 * These are legitimate text that happens to look like keyboard mistakes.
 */
const FALSE_POSITIVE_PATTERNS = [
  // URLs (comprehensive - including inline URLs)
  /^https?:\/\/.+/i,
  /https?:\/\/[^\s]+/i,         // URLs within text
  /^www\..+/i,
  /^ftp:\/\/.+/i,
  
  // Email addresses
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
  
  // File paths (Windows, Unix, relative)
  /^[A-Za-z]:[\\\/].+/,
  /^~\/.+/,
  /^\.{0,2}[\/\\].+\.[a-zA-Z]{1,5}$/,
  
  // Code patterns (common programming keywords/syntax)
  /^(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|typeof|null|undefined|true|false|console|require|module|def|print|self|try|catch|finally|throw|switch|case|break|continue|default|do|enum|extends|super|implements|interface|package|private|protected|public|static|void|yield)\b/,
  /^\/\/.*$/,        // line comments
  /^\/\*.+$/,        // block comments
  /^#include.+/,     // C preprocessor
  /^#\s*\w+/,        // Python/shell comments and directives
  
  // Hex colors
  /^#[0-9A-Fa-f]{3,8}$/,
  
  // IP addresses
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  
  // Version numbers (semver with optional v prefix and prerelease)
  /^v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?$/,
  
  // Pure numbers / math expressions
  /^\d[\d+\-*/().\s,]*$/,
  
  // Common abbreviations (2-4 letters, all uppercase)
  /^[A-Z]{2,4}$/,
  
  // Git references
  /^git\s+/,
  /^(HEAD|main|master|develop|feature\/).+/,
  
  // Package names (npm scoped packages, pip packages)
  /^@[a-z0-9\-]+\/[a-z0-9\-]+$/,
  
  // Password-like patterns (mixed case + digits + special chars)
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
  
  // Base64-encoded strings
  /^[A-Za-z0-9+/]+=*$/,
  
  // UUIDs
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // Environment variables ($VAR or ${VAR})
  /^\$[{]?[A-Z_]+[}]?$/,
  
  // JSON/XML fragments
  /^\s*[{[]"/,
  /^\s*<\/?[a-zA-Z]/,
  
  // Markdown syntax
  /^#{1,6}\s/,
  /^\[.+\]\(.+\)/,
  
  // Shell commands
  /^(sudo|apt|yum|brew|pip|npm|yarn|cargo|go|docker|kubectl)\s/,
  
  // SSH/SCP patterns
  /^(ssh|scp|rsync)\s/,
  
  // CSS property-like patterns
  /^[a-z-]+\s*:/,
];

/**
 * Common English words that are frequently typed intentionally.
 * If the ENTIRE input is one of these words, don't auto-convert.
 */
const INTENTIONAL_ENGLISH_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'did', 'got',
  'let', 'say', 'she', 'too', 'use', 'yes', 'add', 'ask', 'big', 'end',
  'far', 'few', 'fun', 'guy', 'hit', 'hot', 'job', 'lot', 'man', 'men',
  'mom', 'non', 'own', 'pay', 'put', 'run', 'set', 'sit', 'six', 'top',
  'try', 'two', 'act', 'age', 'ago', 'air', 'arm', 'art', 'bad', 'bag',
  'bed', 'bit', 'box', 'boy', 'bus', 'buy', 'car', 'cat', 'cup', 'cut',
  'dad', 'die', 'dog', 'eat', 'eye', 'fan', 'fat', 'fly', 'gas', 'god',
  'gun', 'hat', 'hey', 'ice', 'key', 'kid', 'law', 'leg', 'lie', 'low',
  'map', 'mix', 'mom', 'mom', 'net', 'oil', 'pay', 'per', 'red', 'row',
  'sea', 'sir', 'sky', 'sun', 'tax', 'tea', 'tie', 'tip', 'war', 'web',
  'win', 'wow', 'api', 'css', 'git', 'html', 'http', 'json', 'sql',
  'url', 'xml', 'npm', 'app', 'bug', 'cli', 'doc', 'env', 'ftp', 'gui',
  'ios', 'jar', 'lib', 'log', 'oop', 'pip', 'ram', 'sdk', 'ssh', 'ssl',
  'tcp', 'usb', 'utc', 'api', 'aws', 'cdn', 'cpu', 'dns', 'gpu', 'iot',
  'lan', 'mac', 'os', 'php', 'rss', 'spa', 'ssd', 'svg', 'ui', 'ux',
  'vpn', 'wan', 'wifi', 'yaml', 'ok', 'no', 'hi', 'tv', 'pc', 'vs',
  // Programming terms that look like Arabic keyboard mistakes
  'function', 'class', 'return', 'const', 'export', 'import', 'async',
  'array', 'object', 'string', 'number', 'boolean', 'null', 'undefined',
  'true', 'false', 'console', 'window', 'document', 'element', 'style',
  'click', 'input', 'event', 'value', 'index', 'count', 'total', 'error',
  'hello', 'world', 'test', 'data', 'user', 'name', 'type', 'code',
  'file', 'path', 'node', 'npm', 'git', 'push', 'pull', 'merge', 'commit',
]);

/**
 * Checks if text matches any false positive pattern.
 * @param {string} text
 * @returns {boolean}
 */
function isFalsePositive(text) {
  if (!text) return false;
  const trimmed = text.trim();
  
  // Check against regex patterns
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Check if entire text is a common intentional English word
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length <= 3 && words.every(w => INTENTIONAL_ENGLISH_WORDS.has(w))) {
    return true;
  }
  
  // Pure uppercase (acronyms): API, CSS, HTML, etc.
  if (/^[A-Z]{2,10}$/.test(trimmed)) return true;
  
  // Text with mixed case (CamelCase, PascalCase) - likely code
  if (/^[a-z]+[A-Z]/.test(trimmed) || /^[A-Z][a-z]+[A-Z]/.test(trimmed)) return true;
  
  // Contains special chars typical of code: =, {, }, (, ), =>, ::, ->, etc.
  if (/[={}()]/.test(trimmed) && /[a-zA-Z]/.test(trimmed)) return true;
  
  // Phone numbers
  if (/^\+?\d[\d\s\-()]{6,}$/.test(trimmed)) return true;
  
  // Date formats
  if (/^\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}$/.test(trimmed)) return true;
  
  // Contains URL anywhere in the text
  if (/https?:\/\/[^\s]+/i.test(trimmed)) return true;
  
  // Likely password: starts with uppercase, has numbers and special chars
  if (/^[A-Z][a-zA-Z]*\d+[!@#$%^&*]/.test(trimmed) && trimmed.length >= 8) return true;
  
  // Mixed script in the same word (e.g., "الـAPI" where Arabic and Latin alternate)
  // If more than 3 script transitions in a short span, it's likely mixed content
  let scriptTransitions = 0;
  let prevScript = null;
  for (const ch of trimmed) {
    const code = ch.charCodeAt(0);
    let script = 'other';
    if (code >= 0x0600 && code <= 0x06FF) script = 'arabic';
    else if (/[a-zA-Z]/.test(ch)) script = 'latin';
    if (prevScript && script !== prevScript && script !== 'other') {
      scriptTransitions++;
    }
    if (script !== 'other') prevScript = script;
  }
  if (scriptTransitions >= 4) return true;
  
  // Programming operators and syntax
  if (/^(=>|===|!==|>=|<=|!=|==|&&|\|\||\+\+|--|\+=|-=|\*=|\/=)$/.test(trimmed)) return true;
  
  return false;
}

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
  'ايضا': 80, 'حيث': 80, 'كما': 80, 'لكي': 75, 'حتى': 85,
  'اهلا': 90, 'السلام': 85, 'عليكم': 85, 'مرحبا': 90, 'شكرا': 95,
  'جزاك': 80, 'الله': 100, 'الرحمن': 85, 'الرحيم': 85,
  'الكتاب': 80, 'المدرسة': 75, 'البيت': 80, 'العمل': 80,
  'اليوم': 85, 'الان': 85, 'غدا': 80, 'امس': 75,
  'كتاب': 80, 'قلم': 75, 'ورقة': 75, 'مكتب': 75,
  'اخبارك': 85, 'تمام': 85, 'ماشي': 80,
  'محمد': 85, 'احمد': 85, 'علي': 85, 'حسن': 80,
  'مشروع': 80, 'برنامج': 80, 'كود': 75, 'تطبيق': 80,
  'انترنت': 75, 'كمبيوتر': 75, 'هاتف': 75, 'شاشة': 75,
};

// ─── Detection Heuristics ─────────────────────────────────────────────────────

/**
 * Detects whether text appears to be typed in wrong layout.
 * Now includes false-positive detection to avoid corrupting legitimate text.
 * Returns: 'en-mistake' | 'ar-mistake' | 'unknown'
 */
function detectMistakeType(text) {
  if (!text || typeof text !== 'string') return 'unknown';
  
  // False positive check FIRST - don't touch legitimate text
  if (isFalsePositive(text)) return 'unknown';

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
 * Uses the active keyboard layout mapping.
 * @param {string} text
 * @returns {string}
 */
function convertToArabic(text) {
  if (!text) return '';
  const map = getActiveMap();
  return text.split('').map(ch => {
    const lower = ch.toLowerCase();
    if (map.hasOwnProperty(lower)) {
      return map[lower];
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
  // Use layout-specific reverse map for correct Arabic→English conversion
  const reverseMap = AR_TO_EN_MAPS[activeLayout] || AR_TO_EN_MAPS.qwerty;
  // Handle multi-character sequences like 'لا' (lam-alef ligature)
  let result = '';
  for (let i = 0; i < text.length; i++) {
    // Check for lam-alef ligature (لا)
    if (i + 1 < text.length && text[i] === 'ل' && text[i + 1] === 'ا') {
      result += reverseMap['لا'] || 'b';
      i++; // skip the next character (ا) since we consumed it as part of لا
      continue;
    }
    result += reverseMap[text[i]] || text[i];
  }
  return result;
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
 * @param {string} original - the original (mistyped) word
 * @param {string} converted - the converted (corrected) word
 */
function scoreConversion(original, converted) {
  const wordScore = scoreArabicWord(converted);
  // Penalize if converted word still has Latin letters (incomplete conversion)
  if (/[A-Za-z]/.test(converted)) return wordScore * 0.3;
  // Penalize if original looks like a valid English word (false positive risk)
  if (original && /^[a-zA-Z]+$/.test(original) && original.length <= 3) {
    return wordScore * 0.5; // short English words are often intentional
  }
  return wordScore;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main translation function. Auto-detects direction and applies conversion.
 * Now safely returns original text for 'unknown' detection to prevent corruption.
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
    // IMPORTANT: Don't convert 'unknown' text - return original to prevent corruption
    if (detected === 'unknown') {
      if (options.scoreOutput) {
        return { text: text, score: 0, direction: 'unknown' };
      }
      return text;
    }
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
  isFalsePositive,
  setKeyboardLayout,
  getKeyboardLayout,
  detectKeyboardLayout,
  EN_TO_AR,
  AR_TO_EN,
  AR_TO_EN_MAPS,
  ARABIC_WORD_SCORES,
  EN_TO_AR_QWERTY,
  EN_TO_AR_AZERTY,
  EN_TO_AR_QWERTZ,
  FALSE_POSITIVE_PATTERNS,
  INTENTIONAL_ENGLISH_WORDS
}
