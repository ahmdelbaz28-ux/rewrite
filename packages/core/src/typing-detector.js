/**
 * SmartLangGuard Core - Real-time Typing Layout Detector
 * 
 * Analyzes text as the user types and detects when they're typing in the
 * wrong keyboard layout (e.g., typing English letters when they meant Arabic).
 * 
 * Designed for real-time use with debounced input events from:
 *   - VS Code: onDidChangeTextDocument
 *   - Browser: input/keydown events
 *   - Daemon: clipboard monitoring
 * 
 * Features:
 *   - User dictionary whitelist integration (never flags whitelisted words)
 *   - Auto-learning from dismissed alerts
 *   - Proper deletion/backspace tracking
 *   - First-word context awareness
 * 
 * @module core/typing-detector
 */

'use strict';

const { translate, detectMistakeType, isFalsePositive } = require('./translator');
const { scoreSentence } = require('./custom-ai-model');
const userDictionary = require('./user-dictionary');

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
      enableLearning: true,          // auto-learn from dismissals
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
    this.contextConfidence = 0;  // 0-100, how confident we are in the context
    this.detectionCount = 0;
    this.lastAlertTime = 0;
    this.alertCooldownMs = 2000; // don't re-alert within 2s
    this.completedWords = [];     // track recent completed words for context
  }

  /**
   * Process a text change event.
   * Returns a detection result if a layout mistake is detected, null otherwise.
   * 
   * @param {Object} change - { text, range, insertedText, deletedText }
   * @returns {Promise<{detected: boolean, direction: string, confidence: number, originalText: string, suggestedText: string, alert: boolean}|null>}
   */
  async analyze(change) {
    const now = Date.now();
    
    // Debounce: don't analyze too frequently
    if (now - this.lastAnalysisTime < this.options.debounceMs) {
      return null;
    }
    this.lastAnalysisTime = now;
    
    const { text, insertedText, deletedText } = change;
    
    // Handle deletions
    if (deletedText && !insertedText) {
      this._handleDeletion(deletedText);
      return null;
    }
    
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
   * Handles deletion events (backspace, select+delete).
   */
  _handleDeletion(deletedText) {
    if (!deletedText) return;
    
    // If large deletion (select all + delete), reset state
    if (deletedText.length > 50) {
      this.currentWord = '';
      this.contextLanguage = null;
      this.contextConfidence = 0;
      return;
    }
    
    // Trim current word based on what was deleted
    const deleteLen = deletedText.length;
    if (this.currentWord.length > deleteLen) {
      this.currentWord = this.currentWord.slice(0, -deleteLen);
    } else {
      this.currentWord = '';
    }
  }

  /**
   * Updates the current word tracking based on inserted text.
   * Properly handles word boundaries and special characters.
   */
  _updateWordTracking(insertedText) {
    for (const ch of insertedText) {
      if (/\s/.test(ch)) {
        // Word boundary - save completed word for context
        if (this.currentWord) {
          this.previousWord = this.currentWord;
          this.completedWords.push({
            word: this.currentWord,
            language: this._detectWordLanguage(this.currentWord)
          });
          // Keep only last 10 words for context
          if (this.completedWords.length > 10) {
            this.completedWords.shift();
          }
          this.currentWord = '';
        }
      } else if (/[.,!?;:،؟]/.test(ch)) {
        // Punctuation also ends a word
        if (this.currentWord) {
          this.previousWord = this.currentWord;
          this.completedWords.push({
            word: this.currentWord,
            language: this._detectWordLanguage(this.currentWord)
          });
          if (this.completedWords.length > 10) {
            this.completedWords.shift();
          }
          this.currentWord = '';
        }
      } else {
        this.currentWord += ch;
      }
    }
    
    // Update context from completed words
    this._updateContextFromHistory();
  }

  /**
   * Detects the language of a single word.
   */
  _detectWordLanguage(word) {
    if (!word) return null;
    const hasLatin = /[a-zA-Z]/.test(word);
    const hasArabic = /[\u0600-\u06FF]/.test(word);
    if (hasArabic && !hasLatin) return 'ar';
    if (hasLatin && !hasArabic) return 'en';
    return null;
  }

  /**
   * Updates context language based on recent word history.
   * This fixes the first-word detection problem by looking at completed words.
   */
  _updateContextFromHistory() {
    if (this.completedWords.length === 0) return;
    
    // Count recent languages
    let arCount = 0;
    let enCount = 0;
    for (const entry of this.completedWords.slice(-5)) {
      if (entry.language === 'ar') arCount++;
      else if (entry.language === 'en') enCount++;
    }
    
    if (arCount > enCount) {
      this.contextLanguage = 'ar';
      this.contextConfidence = Math.min(100, arCount * 20);
    } else if (enCount > arCount) {
      this.contextLanguage = 'en';
      this.contextConfidence = Math.min(100, enCount * 20);
    } else {
      this.contextLanguage = null;
      this.contextConfidence = 0;
    }
  }

  /**
   * Checks if the current word appears to be typed in the wrong layout.
   * Integrates with user dictionary to skip whitelisted words.
   */
  _detectWrongLayout() {
    const word = this.currentWord;
    
    if (word.length < this.options.minWordLength) return null;
    
    // Check user dictionary first - never flag whitelisted words
    if (userDictionary.isWhitelisted(word)) return null;
    
    // Check false positive patterns
    if (isFalsePositive(word)) return null;
    
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
    
    // Need stronger evidence when context is weak
    const contextMultiplier = this.contextConfidence > 50 ? 1 : 1.5;
    const minConsecutive = Math.ceil(this.options.minConsecutiveChars * contextMultiplier);
    
    // Latin chars in an Arabic context (or vice versa)
    const hasArabicContext = arabicCount > 0 || this.contextLanguage === 'ar';
    const hasEnglishContext = latinCount > 0 || this.contextLanguage === 'en';
    
    const isLatinMistake = maxConsecutiveLatin >= minConsecutive && hasArabicContext;
    const isArabicMistake = maxConsecutiveArabic >= minConsecutive && hasEnglishContext;
    
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
    
    // Don't flag low-confidence detections
    if (confidence < 30) return null;
    
    // Update context language based on what user typed previously
    if (direction === 'en-to-ar') {
      this.contextLanguage = 'ar';
      this.contextConfidence = Math.min(100, this.contextConfidence + 10);
    } else {
      this.contextLanguage = 'en';
      this.contextConfidence = Math.min(100, this.contextConfidence + 10);
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
   * Records that the user dismissed the current alert.
   * Used for auto-learning.
   */
  dismissCurrentAlert() {
    if (this.currentWord && this.options.enableLearning) {
      userDictionary.recordDismissal(this.currentWord);
    }
  }

  /**
   * Adds the current word to the whitelist.
   */
  whitelistCurrentWord() {
    if (this.currentWord) {
      userDictionary.addToWhitelist(this.currentWord);
    }
  }

  /**
   * Resets the detector state (e.g., when switching editors).
   */
  reset() {
    this.currentWord = '';
    this.previousWord = '';
    this.contextLanguage = null;
    this.contextConfidence = 0;
    this.lastDetection = null;
    this.detectionCount = 0;
    this.completedWords = [];
  }

  /**
   * Returns current state for debugging.
   */
  getState() {
    return {
      currentWord: this.currentWord,
      previousWord: this.previousWord,
      contextLanguage: this.contextLanguage,
      contextConfidence: this.contextConfidence,
      detectionCount: this.detectionCount,
      lastAlertTime: this.lastAlertTime,
      completedWords: this.completedWords.length
    };
  }
}

// ─── Stateless Helper Functions ───────────────────────────────────────────────

/**
 * Quick check: does this text look like it was typed in the wrong layout?
 * Stateless - doesn't track history. Integrates false positive detection.
 */
function detectWrongLayout(text) {
  if (!text || text.length < 2) return null;
  
  // Check false positive patterns first
  if (isFalsePositive(text)) return null;
  
  // Check user dictionary
  if (userDictionary.isWhitelisted(text)) return null;
  
  const mistakeType = detectMistakeType(text);
  if (mistakeType === 'unknown') return null;
  
  const direction = mistakeType === 'en-mistake' ? 'en-to-ar' : 'ar-to-en';
  const result = translate(text, { direction, scoreOutput: true });
  
  // Score the original text and converted text
  const originalScore = scoreSentence(text);
  const convertedScore = scoreSentence(result.text);
  
  // Only flag if converted text scores significantly higher
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
 * Handles punctuation attached to words.
 */
function findAllMistakes(text) {
  if (!text) return [];
  
  const results = [];
  const words = text.split(/(\s+)/); // keep separators
  
  let pos = 0;
  for (const rawWord of words) {
    if (rawWord.length === 0) continue;
    
    if (/\s/.test(rawWord[0])) {
      pos += rawWord.length;
      continue;
    }
    
    // Strip trailing punctuation for detection
    const cleanWord = rawWord.replace(/[.,!?;:،؟]+$/, '');
    if (cleanWord.length < 2) {
      pos += rawWord.length;
      continue;
    }
    
    const detection = detectWrongLayout(cleanWord);
    if (detection) {
      results.push({
        word: cleanWord,
        suggestion: detection.suggestion,
        direction: detection.direction,
        range: [pos, pos + cleanWord.length]
      });
    }
    
    pos += rawWord.length;
  }
  
  return results;
}

module.exports = {
  TypingDetector,
  detectWrongLayout,
  detectLastWord,
  findAllMistakes
}
