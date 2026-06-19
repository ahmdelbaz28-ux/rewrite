/**
 * SmartLangGuard Core - AI Scoring Layer
 * 
 * Provides AI-powered scoring for ambiguous layout-mistake cases.
 * Uses a hybrid approach:
 *   1. Local dictionary (offline, fast, free)
 *   2. Optional remote LLM call (for Pro users, ambiguous cases only)
 * 
 * The remote call is gated by the license layer to avoid free-tier abuse.
 * 
 * @module core/ai-scoring
 */

'use strict';

const { scoreArabicWord } = require('./translator');

// ─── Local N-gram Model ───────────────────────────────────────────────────────

/**
 * Common Arabic bigrams for context scoring.
 * Higher value = more natural Arabic sequence.
 */
const ARABIC_BIGRAMS = {
  'في ال': 100, 'من ال': 100, 'على ال': 100, 'في ه': 90,
  'السلام عليكم': 100, 'اهلا بك': 95, 'شكرا لك': 95,
  'كيف حال': 90, 'ماذا تفعل': 85, 'انا بخير': 90,
  'في هذه': 85, 'من هذا': 80, 'على ذلك': 85,
  'لا اله': 95, 'الا الله': 100, 'محمد رسول': 95,
  'اللهم صلي': 90, 'كتاب جديد': 75, 'مشروع كبير': 75,
  'كتابة صحيحة': 80, 'لغة عربية': 85
};

/**
 * Scores a full sentence using bigram model.
 * @param {string} arabicText
 * @returns {number} 0-100
 */
function scoreWithContext(arabicText) {
  if (!arabicText || typeof arabicText !== 'string') return 0;

  let score = 0;
  let matches = 0;

  // Check each known bigram
  for (const [phrase, weight] of Object.entries(ARABIC_BIGRAMS)) {
    if (arabicText.includes(phrase)) {
      score += weight;
      matches++;
    }
  }

  // Average word score
  const words = arabicText.split(/\s+/).filter(Boolean);
  const wordScore = words.reduce((sum, w) => sum + scoreArabicWord(w), 0);
  const avgWordScore = words.length > 0 ? wordScore / words.length : 0;

  // Combine: bigram matches boost confidence
  if (matches === 0) return Math.round(avgWordScore * 0.7);
  return Math.min(100, Math.round(avgWordScore * 0.5 + (score / Math.max(matches, 1)) * 0.5));
}

// ─── Ambiguity Detection ──────────────────────────────────────────────────────

/**
 * Detects ambiguous conversions that may benefit from AI scoring.
 * Ambiguous = score between 30 and 70.
 */
function isAmbiguous(originalText, convertedText) {
  const score = scoreWithContext(convertedText);
  return score >= 30 && score < 70;
}

// ─── Remote LLM Scoring (Pro feature) ─────────────────────────────────────────

/**
 * Calls the SaaS backend's AI scoring endpoint.
 * Used only when local scoring is ambiguous AND user has valid Pro license.
 * 
 * @param {string} originalText
 * @param {string[]} candidates - alternative conversions
 * @param {Object} license - validated license object
 * @param {string} [endpoint='http://localhost:4000']
 * @returns {Promise<{bestCandidate: string, confidence: number, source: string}>}
 */
async function remoteScore(originalText, candidates, license, endpoint = 'http://localhost:4000') {
  if (!license || !license.tier || license.tier === 'free') {
    // Free tier: use best local candidate
    return {
      bestCandidate: candidates[0] || originalText,
      confidence: scoreWithContext(candidates[0] || originalText),
      source: 'local'
    };
  }

  try {
    const res = await fetch(`${endpoint}/v1/ai/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${license.token}`
      },
      body: JSON.stringify({
        original: originalText,
        candidates
      })
    });

    if (!res.ok) {
      throw new Error(`AI scoring failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      bestCandidate: data.best_candidate || candidates[0],
      confidence: data.confidence || 0,
      source: 'remote'
    };
  } catch (err) {
    // Fallback to local scoring
    const scores = candidates.map(c => ({ text: c, score: scoreWithContext(c) }));
    scores.sort((a, b) => b.score - a.score);
    return {
      bestCandidate: scores[0]?.text || originalText,
      confidence: scores[0]?.score || 0,
      source: 'local-fallback',
      error: err.message
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * High-level: score a single conversion, optionally using remote AI.
 * 
 * @param {string} original
 * @param {string} converted
 * @param {Object} [options] - { license, endpoint, useRemote }
 * @returns {Promise<{score: number, source: string, ambiguous: boolean}>}
 */
async function scoreConversion(original, converted, options = {}) {
  const localScore = scoreWithContext(converted);
  const ambiguous = isAmbiguous(original, converted);

  if (!ambiguous || !options.useRemote || !options.license) {
    return { score: localScore, source: 'local', ambiguous };
  }

  const remote = await remoteScore(original, [converted], options.license, options.endpoint);
  return {
    score: remote.confidence,
    source: remote.source,
    ambiguous: false
  };
}

module.exports = {
  scoreWithContext,
  isAmbiguous,
  remoteScore,
  scoreConversion,
  ARABIC_BIGRAMS
};
