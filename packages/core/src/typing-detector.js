/**
 * SmartLangGuard Core - Real-time Typing Layout Detector
 * 
 * Analyzes text as the user types and detects when they're typing in the
 * wrong keyboard layout (e.g., typing English letters when they meant Arabic).
 * 
 * Designed for real-time use with debounced input events from:
 *   - VS Code: onDidChangeTextDocument
 *   - Browser: input/keydown events
 *   - Daemon: global keylogger (optional, OS-level)
 * 
 * Detection triggers:
 *   1. 3+ consecutive Latin letters while previous text was Arabic
 *   2. 3+ consecutive Arabic letters while previous text was Latin
 *   3. Common layout-mistake patterns (e.g., "high" instead of "اهلا")
 *   4. Rapid transition (within 500ms) from Arabic context to Latin typing
 * 
 * @module core/typing-detector
 */

'use strict';

const { translate, detectMistakeType } = require('./translator');
const { scoreSentence } = require('./custom-ai-model');

// ─── State ────────────────────────────────────────────────────────────────────

/**
 * Maintains per-session state for the typing detector.
 * Each editor/input has its own TypingDetector instance.
 */
class TypingDetector {
  constructor(options = {}) {
    this.options = {
      minConsecutiveChars: 3,        // trigger after N chars in wrong layout
      minWordLength: 2,              // minimum word length to consider
      debounceMs: 250,               // delay before analyzing (in ms)
      sensitivity: 'medium',         // 'low' | 'medium' | 'high'
      requireContext: false,         // require preceding text in other language
      ...options
    };
    
    // Adjust based on sensitivity
    switch (this.options.sensitivity) {
      case 'low':    this.options.minConsecutiveChars = 5; break;
      case 'high':   this.options.minConsecutiveChars = 2; break;
      default:       this.options.minConsecutiveChars = 3;
    }
    
    // State
    this.lastAnalysisTime = 0;
    this.lastInput = '';
    this.lastDetection = null;
    this.currentWord = '';
    this.previousWord = '';
    this.contextLanguage = null; // 'ar' | 'en' | null
    this.detectionCount = 0;
    this.lastAlertTime = 0;
    this.alertCooldownMs = 2000; // don't re-alert within 2s
  }

  /**
   * Process a text change event.
   * Returns a detection result if a layout mistake is detected, null otherwise.
   * 
   * @param {Object} change - { text, range, insertedText }
   * @returns {Promise<{detected: boolean, direction: string, confidence: number, originalText: string, suggestedText: string, alert: boolean}|null>}
   */
  async analyze(change) {
    const now = Date.now();
    
    // Debounce: don't analyze too frequently
    if (now - this.lastAnalysisTime < this.options.debounceMs) {
      return null;
    }
    this.lastAnalysisTime = now;
    
    const { text, insertedText } = change;
    if (!insertedText) return null;
    
    // Update word tracking
    this._updateWordTracking(insertedText);
    
    // Check if current word is in wrong layout
    const detection = this._detectWrongLayout();
    if (!detection) return null;
    
    // Cooldown: don't alert too frequently
    const shouldAlert = (now - this.lastAlertTime) > this.alertCooldownMs;
    if (shouldAlert) {
      this.lastAlertTime = now;
      this.detectionCount++;
    }
    
    return {
      detected: true,
      direction: detection.direction,
      confidence: detection.confidence,
      originalText: detection.originalText,
      suggestedText: detection.suggestedText,
      wordStart: detection.wordStart,
      wordEnd: detection.wordEnd,
      alert: shouldAlert,
      detectionCount: this.detectionCount
    };
  }

  /**
   * Updates the current word tracking based on inserted text.
   */
  _updateWordTracking(insertedText) {
    for (const ch of insertedText) {
      if (/\s/.test(ch)) {
        // Word boundary
        if (this.currentWord) {
          this.previousWord = this.currentWord;
          this.currentWord = '';
        }
      } else if (ch === '\b' || ch === '\u0008') {
        // Backspace
        this.currentWord = this.currentWord.slice(0, -1);
      } else {
        this.currentWord += ch;
      }
    }
  }

  /**
   * Checks if the current word appears to be typed in the wrong layout.
   */
  _detectWrongLayout() {
    const word = this.currentWord;
    
    if (word.length < this.options.minWordLength) return null;
    
    // Count Latin and Arabic chars
    let latinCount = 0;
    let arabicCount = 0;
    let consecutiveLatin = 0;
    let maxConsecutiveLatin = 0;
    let consecutiveArabic = 0;
    let maxConsecutiveArabic = 0;
    
    for (const ch of word) {
      if (/[a-zA-Z]/.test(ch)) {
        latinCount++;
        consecutiveLatin++;
        consecutiveArabic = 0;
        if (consecutiveLatin > maxConsecutiveLatin) maxConsecutiveLatin = consecutiveLatin;
      } else if (/[\u0600-\u06FF]/.test(ch)) {
        arabicCount++;
        consecutiveArabic++;
        consecutiveLatin = 0;
        if (consecutiveArabic > maxConsecutiveArabic) maxConsecutiveArabic = consecutiveArabic;
      } else {
        consecutiveLatin = 0;
        consecutiveArabic = 0;
      }
    }
    
    // Determine if this looks like a layout mistake
    let direction = null;
    
    // Latin chars in an Arabic context (or vice versa)
    const isLatinMistake = maxConsecutiveLatin >= this.options.minConsecutiveChars && 
                           (arabicCount > 0 || this.contextLanguage === 'ar' || latinCount > arabicCount * 3);
    const isArabicMistake = maxConsecutiveArabic >= this.options.minConsecutiveChars &&
                            (latinCount > 0 || this.contextLanguage === 'en' || arabicCount > latinCount * 3);
    
    if (isLatinMistake && !isArabicMistake) {
      direction = 'en-to-ar';
    } else if (isArabicMistake && !isLatinMistake) {
      direction = 'ar-to-en';
    } else if (isLatinMistake && isArabicMistake) {
      // Ambiguous - go with majority
      direction = latinCount > arabicCount ? 'en-to-ar' : 'ar-to-en';
    } else {
      return null;
    }
    
    // Get suggested fix
    const result = translate(word, { direction, scoreOutput: true });
    const confidence = result.score || 0;
    
    // Update context language based on what user typed previously
    if (direction === 'en-to-ar') {
      // They meant to type Arabic
      this.contextLanguage = 'ar';
    } else {
      this.contextLanguage = 'en';
    }
    
    return {
      direction,
      confidence,
      originalText: word,
      suggestedText: result.text,
      wordStart: -word.length, // relative offset from cursor
      wordEnd: 0
    };
  }

  /**
   * Resets the detector state (e.g., when switching editors).
   */
  reset() {
    this.currentWord = '';
    this.previousWord = '';
    this.contextLanguage = null;
    this.lastDetection = null;
    this.detectionCount = 0;
  }

  /**
   * Returns current state for debugging.
   */
  getState() {
    return {
      currentWord: this.currentWord,
      previousWord: this.previousWord,
      contextLanguage: this.contextLanguage,
      detectionCount: this.detectionCount,
      lastAlertTime: this.lastAlertTime
    };
  }
}

// ─── Stateless Helper Functions ───────────────────────────────────────────────

/**
 * Quick check: does this text look like it was typed in the wrong layout?
 * Stateless - doesn't track history.
 * 
 * @param {string} text - text to check
 * @returns {{ detected: boolean, direction: string, confidence: number, suggestion: string } | null}
 */
function detectWrongLayout(text) {
  if (!text || text.length < 2) return null;
  
  const mistakeType = detectMistakeType(text);
  if (mistakeType === 'unknown') return null;
  
  const direction = mistakeType === 'en-mistake' ? 'en-to-ar' : 'ar-to-en';
  const result = translate(text, { direction, scoreOutput: true });
  
  // Score the original (mistyped) text in its original form
  // and the converted text - if converted scores higher, it's likely a mistake
  const originalScore = scoreSentence(text);
  const convertedScore = scoreSentence(result.text);
  
  // If converted text scores significantly higher, it's a real mistake
  if (convertedScore > originalScore + 20) {
    return {
      detected: true,
      direction,
      confidence: Math.min(100, convertedScore),
      originalText: text,
      suggestion: result.text
    };
  }
  
  return null;
}

/**
 * Detects layout mistakes in the most recent word of a text buffer.
 * Useful for analyzing "what was just typed".
 * 
 * @param {string} fullText - the full text buffer
 * @param {number} cursorPos - cursor position (default: end of text)
 * @returns {{ detected: boolean, direction: string, word: string, suggestion: string, range: [number, number] } | null}
 */
function detectLastWord(fullText, cursorPos) {
  if (!fullText) return null;
  if (cursorPos === undefined) cursorPos = fullText.length;
  
  // Find the start of the current word (back to last whitespace)
  let start = cursorPos;
  while (start > 0 && !/\s/.test(fullText[start - 1])) {
    start--;
  }
  
  const word = fullText.substring(start, cursorPos);
  if (word.length < 2) return null;
  
  const detection = detectWrongLayout(word);
  if (!detection) return null;
  
  return {
    detected: true,
    direction: detection.direction,
    word,
    suggestion: detection.suggestion,
    range: [start, cursorPos]
  };
}

/**
 * Finds all "wrong layout" words in a text buffer.
 * Returns array of detected mistakes with their positions.
 * 
 * @param {string} text
 * @returns {Array<{ word: string, suggestion: string, direction: string, range: [number, number] }>}
 */
function findAllMistakes(text) {
  if (!text) return [];
  
  const results = [];
  const words = text.split(/(\s+)/); // keep separators
  
  let pos = 0;
  for (const word of words) {
    if (word.length === 0) continue;
    
    if (/\s/.test(word[0])) {
      pos += word.length;
      continue;
    }
    
    const detection = detectWrongLayout(word);
    if (detection) {
      results.push({
        word,
        suggestion: detection.suggestion,
        direction: detection.direction,
        range: [pos, pos + word.length]
      });
    }
    
    pos += word.length;
  }
  
  return results;
}

module.exports = {
  TypingDetector,
  detectWrongLayout,
  detectLastWord,
  findAllMistakes
};
