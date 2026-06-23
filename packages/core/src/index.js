/**
 * SmartLangGuard Core - Main Entry Point
 * 
 * Provides the unified API for all SmartLangGuard surfaces (CLI, MCP,
 * Daemon, VS Code, Browser Extension).
 * 
 * @module core
 */

'use strict';

const { translate, translateBatch, detectMistakeType, convertToArabic, convertToEnglish, scoreArabicWord, isFalsePositive, setKeyboardLayout, getKeyboardLayout, detectKeyboardLayout } = require('./translator');
const { scoreConversion, scoreWithContext } = require('./ai-scoring');
const { validateLicense, hasFeature, FEATURES, signLicenseToken, verifyLicenseToken, TIER_FEATURES, getDeviceFingerprint, getDeviceId } = require('./license');
const telemetry = require('./telemetry');
const updater = require('./updater');
const { SoundPlayer } = require('./sound-player');
const { TypingDetector, detectWrongLayout, detectLastWord, findAllMistakes } = require('./typing-detector');
const customModel = require('./custom-ai-model');
const userDictionary = require('./user-dictionary');

const VERSION = '0.2.0';

// ─── Configuration ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  endpoint: process.env.SMARTLANGGUARD_API || 'http://localhost:4000',
  telemetryEnabled: true,
  autoUpdate: true,
  defaultDirection: 'auto',
  useRemoteScoring: true,
  keyboardLayout: 'qwerty',
  enableLearning: true
};

let currentConfig = { ...DEFAULT_CONFIG };
let currentLicense = null;

/**
 * Initializes SmartLangGuard Core with the given config.
 * @param {Object} [config]
 */
async function init(config = {}) {
  currentConfig = { ...DEFAULT_CONFIG, ...config };

  // Set keyboard layout
  if (config.keyboardLayout) {
    setKeyboardLayout(config.keyboardLayout);
  }

  // Initialize user dictionary
  userDictionary.load();

  if (currentConfig.telemetryEnabled) {
    telemetry.init({
      enabled: true,
      endpoint: currentConfig.endpoint,
      anonymousId: config.anonymousId
    });
  }

  telemetry.track(telemetry.EVENTS.EXTENSION_ACTIVATED, {
    version: VERSION,
    platform: process.platform
  });

  // Validate license if provided
  if (config.licenseToken) {
    currentLicense = await validateLicense(config.licenseToken, {
      endpoint: currentConfig.endpoint
    });
    if (currentLicense?.valid) {
      telemetry.track(telemetry.EVENTS.LICENSE_VALIDATED, {
        tier: currentLicense.tier
      });
    }
  }
}

// ─── Main API: fixText ────────────────────────────────────────────────────────

/**
 * Fixes mistyped text using rules + optional AI scoring.
 * Now respects user dictionary whitelist and false positive patterns.
 * 
 * @param {string} text - mistyped input
 * @param {Object} [options]
 * @param {'auto'|'en-to-ar'|'ar-to-en'} [options.direction='auto']
 * @param {boolean} [options.useAI=true] - enable AI scoring (if licensed)
 * @returns {Promise<{original: string, corrected: string, direction: string, score: number, source: string}>}
 */
async function fixText(text, options = {}) {
  if (text == null) text = '';
  
  const direction = options.direction || currentConfig.defaultDirection;
  const isForcedDirection = direction !== 'auto';
  
  // Check false positive first - but skip if user explicitly forced a direction
  if (!isForcedDirection && isFalsePositive(text)) {
    return {
      original: text,
      corrected: text,
      direction: 'none',
      score: 0,
      source: 'false-positive'
    };
  }
  
  // Check user dictionary whitelist - but skip if user explicitly forced a direction
  if (!isForcedDirection && userDictionary.isWhitelisted(text)) {
    return {
      original: text,
      corrected: text,
      direction: 'none',
      score: 0,
      source: 'whitelist'
    };
  }
  
  const useAI = options.useAI !== false && currentConfig.useRemoteScoring;

  // 1. Apply rules-based translation
  const result = translate(text, { direction, scoreOutput: true });
  
  // If direction is 'unknown' (false positive or ambiguous), return original
  if (result.direction === 'unknown') {
    return {
      original: text,
      corrected: text,
      direction: 'none',
      score: 0,
      source: 'unknown'
    };
  }

  let score = result.score || 0;
  let source = 'rules';

  // 2. If ambiguous and AI is enabled, try AI scoring
  if (useAI && score >= 30 && score < 70) {
    const aiResult = await scoreConversion(text, result.text, {
      license: currentLicense,
      endpoint: currentConfig.endpoint,
      useRemote: hasFeature(currentLicense, FEATURES.AI_SCORING)
    });
    score = aiResult.score;
    source = aiResult.source;
  }

  telemetry.track(telemetry.EVENTS.CORRECTION_APPLIED, {
    direction: result.direction,
    length: text.length,
    score,
    source
  });

  return {
    original: text,
    corrected: result.text,
    direction: result.direction,
    score,
    source
  };
}

/**
 * Batch fix multiple texts.
 */
async function fixTextBatch(texts, options = {}) {
  return Promise.all(texts.map(t => fixText(t, options)));
}

// ─── License Management ───────────────────────────────────────────────────────

async function activateLicense(token) {
  currentLicense = await validateLicense(token, {
    endpoint: currentConfig.endpoint,
    forceRefresh: true
  });

  if (currentLicense?.valid) {
    telemetry.track(telemetry.EVENTS.LICENSE_VALIDATED, {
      tier: currentLicense.tier
    });
    return { success: true, license: currentLicense };
  }

  telemetry.track(telemetry.EVENTS.LICENSE_INVALID);
  return { success: false, error: 'Invalid or expired license' };
}

function getLicenseStatus() {
  if (!currentLicense) {
    return { valid: false, tier: 'free', features: ['rules-only'] };
  }
  return {
    valid: currentLicense.valid,
    tier: currentLicense.tier,
    features: currentLicense.features,
    expiresAt: currentLicense.expires_at,
    deviceId: currentLicense.device_id
  };
}

// ─── Update Management ────────────────────────────────────────────────────────

async function checkForUpdate() {
  return updater.checkForUpdate();
}

async function performUpdate(options) {
  return updater.performUpdate(options);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function shutdown() {
  userDictionary.save();
  telemetry.flush();
  telemetry.disable();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  VERSION,
  init,
  fixText,
  fixTextBatch,
  activateLicense,
  getLicenseStatus,
  checkForUpdate,
  performUpdate,
  shutdown,
  // False positive detection
  isFalsePositive,
  // Keyboard layout support
  setKeyboardLayout,
  getKeyboardLayout,
  detectKeyboardLayout,
  // User dictionary
  userDictionary,
  // Re-exports for advanced usage
  translate,
  translateBatch,
  convertToArabic,
  convertToEnglish,
  detectMistakeType,
  scoreArabicWord,
  scoreWithContext,
  scoreConversion,
  validateLicense,
  hasFeature,
  FEATURES,
  TIER_FEATURES,
  signLicenseToken,
  verifyLicenseToken,
  getDeviceFingerprint,
  getDeviceId,
  telemetry,
  telemetryEvents: telemetry.EVENTS,
  SoundPlayer,
  TypingDetector,
  detectWrongLayout,
  detectLastWord,
  findAllMistakes,
  customModel
};
