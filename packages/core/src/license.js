/**
 * SmartLangGuard Core - License Layer
 * 
 * Handles license validation, caching, and feature gating.
 * Supports both online (SaaS) and offline (signed token) validation.
 * 
 * License tiers:
 *   - free:    rules-only translation, single device
 *   - pro:     AI scoring, multi-device, cloud sync
 *   - team:    everything in pro + shared workspace
 *   - enterprise: everything in team + SSO + analytics API
 * 
 * @module core/license
 */

'use strict';

const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

// ─── Constants ────────────────────────────────────────────────────────────────

const LICENSE_CACHE_FILE = path.join(
  os.homedir(),
  '.smartlangguard',
  'license.json'
);

const DEVICE_ID_FILE = path.join(
  os.homedir(),
  '.smartlangguard',
  'device.id'
);

// Shared secret for offline token signing (rotated per release)
const OFFLINE_SECRET = process.env.SMARTLANGGUARD_OFFLINE_SECRET ||
  'smkt-2026-offline-signing-key-v1';

if (!process.env.SMARTLANGGUARD_OFFLINE_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: SMARTLANGGUARD_OFFLINE_SECRET not set. Using default (insecure for production).');
}

// ─── Device Fingerprint ───────────────────────────────────────────────────────

/**
 * Generates a stable device fingerprint.
 * Combines hostname, platform, CPU info, and MAC address.
 */
function getDeviceFingerprint() {
  const hostname = os.hostname();
  const platform = `${os.platform()}-${os.arch()}`;
  const cpus = os.cpus()[0]?.model || 'unknown';
  const networkInterfaces = os.networkInterfaces();
  const macs = Object.values(networkInterfaces)
    .flat()
    .filter(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
    .map(iface => iface.mac)
    .sort()[0] || 'no-mac';

  const raw = `${hostname}|${platform}|${cpus}|${macs}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Loads or creates a persistent device ID.
 */
function getDeviceId() {
  try {
    if (fs.existsSync(DEVICE_ID_FILE)) {
      return fs.readFileSync(DEVICE_ID_FILE, 'utf8').trim();
    }
    const id = `dev_${crypto.randomBytes(12).toString('hex')}`;
    const dir = path.dirname(DEVICE_ID_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEVICE_ID_FILE, id, { mode: 0o600 });
    return id;
  } catch (err) {
    // Fallback to in-memory ID if filesystem is read-only
    return `dev_${crypto.randomBytes(12).toString('hex')}`;
  }
}

// ─── License Token Format ─────────────────────────────────────────────────────

/**
 * Creates a signed offline license token.
 * Format: base64(payload).base64(signature)
 */
function signLicenseToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', OFFLINE_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies a signed license token and returns the payload.
 * Returns null if invalid or expired.
 */
function verifyLicenseToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expected = crypto
    .createHmac('sha256', OFFLINE_SECRET)
    .update(data)
    .digest('base64url');

  // Timing-safe comparison
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    if (payload.expires_at && Date.now() > payload.expires_at) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// ─── Online Validation ────────────────────────────────────────────────────────

/**
 * Validates a license token against the SaaS backend.
 * Caches the result locally for offline use (24h TTL).
 * 
 * @param {string} token
 * @param {Object} [options] - { endpoint, forceRefresh }
 * @returns {Promise<{valid: boolean, tier: string, features: string[], expiresAt: number, deviceId: string}|null>}
 */
async function validateLicense(token, options = {}) {
  const endpoint = options.endpoint || 
    process.env.SMARTLANGGUARD_API || 
    'http://localhost:4000';
  const forceRefresh = options.forceRefresh || false;

  // 1. Check local cache first (unless forced)
  if (!forceRefresh) {
    const cached = loadCachedLicense();
    if (cached && cached.token === token && Date.now() < cached.expires_at) {
      return cached;
    }
  }

  // 2. Try online validation
  const deviceId = getDeviceId();
  const fingerprint = getDeviceFingerprint();

  try {
    const res = await fetch(`${endpoint}/v1/license/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        'X-Device-Fingerprint': fingerprint
      },
      body: JSON.stringify({ token })
    });

    if (!res.ok) {
      // Fall back to offline verification if backend is unreachable
      return tryOfflineFallback(token);
    }

    const data = await res.json();
    if (!data.valid) {
      clearCachedLicense();
      return { valid: false, tier: 'free', features: ['rules-only'], expiresAt: 0, deviceId };
    }

    const licenseInfo = {
      valid: true,
      token,
      tier: data.tier || 'free',
      features: data.features || ['rules-only'],
      expires_at: data.expires_at || (Date.now() + 24 * 60 * 60 * 1000),
      device_id: deviceId,
      cached_at: Date.now()
    };

    cacheLicense(licenseInfo);
    return licenseInfo;
  } catch (err) {
    // Network error - try offline
    return tryOfflineFallback(token);
  }
}

function tryOfflineFallback(token) {
  const payload = verifyLicenseToken(token);
  if (payload) {
    return {
      valid: true,
      token,
      tier: payload.tier || 'free',
      features: payload.features || ['rules-only'],
      expires_at: payload.expires_at,
      device_id: getDeviceId(),
      cached_at: Date.now(),
      offline: true
    };
  }
  return null;
}

// ─── Cache Management ─────────────────────────────────────────────────────────

function cacheLicense(license) {
  try {
    const dir = path.dirname(LICENSE_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LICENSE_CACHE_FILE, JSON.stringify(license, null, 2), { mode: 0o600 });
  } catch (err) {
    // Non-fatal: continue without cache
  }
}

function loadCachedLicense() {
  try {
    if (!fs.existsSync(LICENSE_CACHE_FILE)) return null;
    const raw = fs.readFileSync(LICENSE_CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearCachedLicense() {
  try {
    if (fs.existsSync(LICENSE_CACHE_FILE)) fs.unlinkSync(LICENSE_CACHE_FILE);
  } catch {
    // ignore
  }
}

// ─── Feature Gating ───────────────────────────────────────────────────────────

/**
 * Checks if a feature is available for the given license.
 */
function hasFeature(license, feature) {
  if (!license || !license.valid) {
    return feature === 'rules-only';
  }
  return license.features?.includes(feature) || false;
}

const FEATURES = {
  RULES_ONLY: 'rules-only',
  AI_SCORING: 'ai-scoring',
  MULTI_DEVICE: 'multi-device',
  CLOUD_SYNC: 'cloud-sync',
  ANALYTICS: 'analytics',
  SSO: 'sso',
  PRIORITY_SUPPORT: 'priority-support'
};

const TIER_FEATURES = {
  free: [FEATURES.RULES_ONLY],
  pro: [FEATURES.RULES_ONLY, FEATURES.AI_SCORING, FEATURES.MULTI_DEVICE, FEATURES.CLOUD_SYNC],
  team: Object.values(FEATURES),
  enterprise: Object.values(FEATURES)
};

module.exports = {
  validateLicense,
  signLicenseToken,
  verifyLicenseToken,
  getDeviceFingerprint,
  getDeviceId,
  hasFeature,
  FEATURES,
  TIER_FEATURES,
  cacheLicense,
  loadCachedLicense,
  clearCachedLicense,
  LICENSE_CACHE_FILE
};
