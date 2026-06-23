/**
 * SmartLangGuard User Dictionary - Learning & Whitelist System
 * 
 * Manages user-specific words that should never be flagged as mistakes.
 * Supports:
 *   - Manual whitelist (user adds words explicitly)
 *   - Auto-learning (learns from dismissed alerts)
 *   - Persistence (saves to disk as JSON)
 * 
 * @module core/user-dictionary
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.smartlangguard');
const DICT_FILE = path.join(DATA_DIR, 'user-dictionary.json');

/**
 * User dictionary state.
 */
let state = {
  whitelist: [],       // Words explicitly added by user
  autoLearned: [],     // Words auto-learned from dismissed alerts
  dismissed: {},       // { word: count } - tracks how many times user dismissed alerts
  learnThreshold: 3,   // Auto-learn after N dismissals
  maxEntries: 5000,    // Maximum dictionary size
  dirty: false         // Whether state needs saving
};

let loaded = false;

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Loads the user dictionary from disk.
 */
function load() {
  if (loaded) return;
  try {
    if (fs.existsSync(DICT_FILE)) {
      const data = JSON.parse(fs.readFileSync(DICT_FILE, 'utf-8'));
      state.whitelist = data.whitelist || [];
      state.autoLearned = data.autoLearned || [];
      state.dismissed = data.dismissed || {};
      state.learnThreshold = data.learnThreshold || 3;
    }
  } catch {
    // Start fresh if file is corrupt
    state = {
      whitelist: [],
      autoLearned: [],
      dismissed: {},
      learnThreshold: 3,
      maxEntries: 5000,
      dirty: false
    };
  }
  loaded = true;
}

/**
 * Saves the user dictionary to disk.
 */
function save() {
  if (!state.dirty) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DICT_FILE, JSON.stringify({
      whitelist: state.whitelist,
      autoLearned: state.autoLearned,
      dismissed: state.dismissed,
      learnThreshold: state.learnThreshold
    }, null, 2), 'utf-8');
    state.dirty = false;
  } catch {
    // Silently fail if we can't write (e.g., read-only filesystem)
  }
}

// ─── Whitelist Management ─────────────────────────────────────────────────────

/**
 * Adds a word to the whitelist.
 * @param {string} word
 * @returns {boolean} true if added, false if already exists
 */
function addToWhitelist(word) {
  if (!word || typeof word !== 'string') return false;
  const normalized = word.trim().toLowerCase();
  if (!normalized) return false;
  
  load();
  
  if (state.whitelist.includes(normalized)) return false;
  
  if (state.whitelist.length >= state.maxEntries) {
    // Remove oldest entry
    state.whitelist.shift();
  }
  
  state.whitelist.push(normalized);
  state.dirty = true;
  save();
  return true;
}

/**
 * Removes a word from the whitelist.
 * @param {string} word
 * @returns {boolean} true if removed
 */
function removeFromWhitelist(word) {
  if (!word) return false;
  const normalized = word.trim().toLowerCase();
  
  load();
  
  const idx = state.whitelist.indexOf(normalized);
  if (idx === -1) return false;
  
  state.whitelist.splice(idx, 1);
  state.dirty = true;
  save();
  return true;
}

/**
 * Checks if a word is whitelisted (manually or auto-learned).
 * @param {string} word
 * @returns {boolean}
 */
function isWhitelisted(word) {
  if (!word || typeof word !== 'string') return false;
  const normalized = word.trim().toLowerCase();
  
  load();
  
  return state.whitelist.includes(normalized) || 
         state.autoLearned.includes(normalized);
}

/**
 * Gets all whitelisted words.
 * @returns {string[]}
 */
function getWhitelist() {
  load();
  return [...state.whitelist, ...state.autoLearned];
}

// ─── Auto-Learning ────────────────────────────────────────────────────────────

/**
 * Records that the user dismissed an alert for a specific word.
 * After enough dismissals, the word is auto-learned.
 * @param {string} word - The word that was flagged but dismissed
 * @returns {{ dismissed: boolean, learned: boolean }}
 */
function recordDismissal(word) {
  if (!word || typeof word !== 'string') return { dismissed: false, learned: false };
  const normalized = word.trim().toLowerCase();
  if (!normalized) return { dismissed: false, learned: false };
  
  load();
  
  // Already whitelisted?
  if (isWhitelisted(normalized)) {
    return { dismissed: true, learned: true };
  }
  
  // Increment dismissal count
  state.dismissed[normalized] = (state.dismissed[normalized] || 0) + 1;
  state.dirty = true;
  
  // Check if threshold reached
  if (state.dismissed[normalized] >= state.learnThreshold) {
    // Auto-learn this word
    if (state.autoLearned.length >= state.maxEntries) {
      state.autoLearned.shift();
    }
    state.autoLearned.push(normalized);
    delete state.dismissed[normalized];
    save();
    return { dismissed: true, learned: true };
  }
  
  save();
  return { dismissed: true, learned: false };
}

/**
 * Gets the dismissal count for a word.
 * @param {string} word
 * @returns {number}
 */
function getDismissalCount(word) {
  if (!word) return 0;
  const normalized = word.trim().toLowerCase();
  load();
  return state.dismissed[normalized] || 0;
}

// ─── Bulk Operations ──────────────────────────────────────────────────────────

/**
 * Imports words from an array into the whitelist.
 * @param {string[]} words
 * @returns {number} number of words added
 */
function importWhitelist(words) {
  if (!Array.isArray(words)) return 0;
  let count = 0;
  for (const word of words) {
    if (addToWhitelist(word)) count++;
  }
  return count;
}

/**
 * Exports all whitelisted words.
 * @returns {{ whitelist: string[], autoLearned: string[] }}
 */
function exportDictionary() {
  load();
  return {
    whitelist: [...state.whitelist],
    autoLearned: [...state.autoLearned]
  };
}

/**
 * Clears all learned words (keeps manual whitelist).
 */
function clearLearned() {
  load();
  state.autoLearned = [];
  state.dismissed = {};
  state.dirty = true;
  save();
}

/**
 * Resets the entire dictionary.
 */
function reset() {
  state = {
    whitelist: [],
    autoLearned: [],
    dismissed: {},
    learnThreshold: 3,
    maxEntries: 5000,
    dirty: false
  };
  loaded = true;
  state.dirty = true;
  save();
}

/**
 * Gets dictionary statistics.
 */
function getStats() {
  load();
  return {
    whitelistCount: state.whitelist.length,
    autoLearnedCount: state.autoLearned.length,
    pendingDismissals: Object.keys(state.dismissed).length,
    learnThreshold: state.learnThreshold
  };
}

/**
 * Sets the auto-learn threshold.
 * @param {number} n - number of dismissals before auto-learning
 */
function setLearnThreshold(n) {
  if (typeof n === 'number' && n >= 1 && n <= 100) {
    state.learnThreshold = n;
    state.dirty = true;
    save();
  }
}

module.exports = {
  load,
  save,
  addToWhitelist,
  removeFromWhitelist,
  isWhitelisted,
  getWhitelist,
  recordDismissal,
  getDismissalCount,
  importWhitelist,
  exportDictionary,
  clearLearned,
  reset,
  getStats,
  setLearnThreshold,
  DATA_DIR,
  DICT_FILE
};
