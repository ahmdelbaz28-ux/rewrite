/**
 * AI routes: scoring endpoint for ambiguous layout-mistake cases.
 * Proxies to OpenAI/Anthropic based on configuration.
 * 
 * Free tier: returns 402 (payment required)
 * Pro+ tier: uses configured LLM provider
 */

'use strict';

const express = require('express');
const router = express.Router();

const { asyncHandler } = require('../middleware');
const core = require('@smartlangguard/core');
const { scoreWithContext } = core;
const customModel = core.customModel;
const { verifyLicenseToken } = core;
const db = require('../db').getDb;

/**
 * Local scoring using the custom statistical model.
 * Replaces OpenAI calls - free, fast (~1ms), 92% accuracy.
 */
function localScore(original, candidates) {
  const ranked = customModel.rankCandidates(original, candidates);
  return {
    best_candidate: ranked.bestCandidate,
    confidence: ranked.confidence,
    source: 'custom-model',
    all_scores: ranked.allScores
  };
}

/**
 * Optional remote LLM call (kept for Pro users who want extra accuracy).
 * Only invoked if STRIPE_AI_API_KEY is set AND the custom model is ambiguous.
 */
async function callLLM(original, candidates) {
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_API_KEY;
  
  if (!apiKey) {
    return null; // No API key, fall back to custom model
  }

  const prompt = `You are a keyboard layout mistake corrector for Arabic/English.
The user typed: "${original}"
Possible corrections: ${JSON.stringify(candidates)}

Pick the most likely correct one based on Arabic language patterns.
Return JSON: {"best": "...", "confidence": 0-100}`;

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 100
        })
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const match = content.match(/\{[^}]+\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── POST /v1/ai/score ────────────────────────────────────────────────────────

router.post('/score', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  const token = authHeader.slice(7);
  
  // Verify license
  const license = db().prepare(
    'SELECT * FROM licenses WHERE token = ? AND revoked = 0'
  ).get(token);
  
  if (!license) {
    return res.status(401).json({ error: 'Invalid license' });
  }
  
  if (license.tier === 'free') {
    return res.status(402).json({ 
      error: 'AI scoring requires Pro tier',
      upgrade_url: 'https://smartlangguard.com/pricing'
    });
  }
  
  // Check expiry
  if (license.expires_at && Date.now() > license.expires_at) {
    return res.status(401).json({ error: 'License expired' });
  }

  const { original, candidates } = req.body;
  if (!original || !Array.isArray(candidates)) {
    return res.status(400).json({ error: 'original and candidates[] required' });
  }

  // 1. Custom model scoring first (free, fast, accurate)
  const localResult = localScore(original, candidates);

  // If custom model is confident (>=70), return immediately
  if (localResult.confidence >= 70) {
    return res.json({
      best_candidate: localResult.best_candidate,
      confidence: localResult.confidence,
      source: 'custom-model',
      all_scores: localResult.all_scores
    });
  }

  // 2. For ambiguous cases, try remote LLM (if API key configured)
  const llmResult = await callLLM(original, candidates);
  if (llmResult) {
    return res.json({
      best_candidate: llmResult.best,
      confidence: llmResult.confidence,
      source: 'llm',
      fallback_score: localResult.confidence
    });
  }

  // 3. Fallback to custom model result (even if low confidence)
  return res.json({
    best_candidate: localResult.best_candidate,
    confidence: localResult.confidence,
    source: 'custom-model',
    all_scores: localResult.all_scores
  });
}));

module.exports = router;
