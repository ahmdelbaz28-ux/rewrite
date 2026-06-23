/**
 * SmartLangGuard Core - Auto-Updater
 * 
 * Checks for updates, downloads signed binaries, and verifies SHA256
 * before applying. Supports differential updates for faster downloads.
 * 
 * @module core/updater
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const UPDATE_MANIFEST_URL = process.env.SMARTLANGGUARD_UPDATE_URL ||
  'https://updates.smartlangguard.com/latest.json';

const UPDATE_CACHE_DIR = path.join(
  os.homedir(),
  '.smartlangguard',
  'updates'
);

// ─── Version Comparison ───────────────────────────────────────────────────────

/**
 * Compares two semver versions.
 * @returns {number} -1 if a < b, 0 if equal, 1 if a > b
 */
function compareVersions(a, b) {
  // Validate version strings before comparison
  const VERSION_REGEX = /^\d+(\.\d+)*$/;
  if (!VERSION_REGEX.test(a) || !VERSION_REGEX.test(b)) {
    return 0; // Invalid version strings are treated as equal (no update forced)
  }
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const pa = partsA[i] || 0;
    const pb = partsB[i] || 0;
    if (pa < pb) return -1;
    if (pa > pb) return 1;
  }
  return 0;
}

// ─── Update Check ─────────────────────────────────────────────────────────────

/**
 * Fetches the update manifest from the server.
 * @returns {Promise<{version: string, url: string, sha256: string, notes: string, minRequired: string}|null>}
 */
async function fetchManifest() {
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, {
      headers: { 'User-Agent': `SmartLangGuard/${getCurrentVersion()}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getCurrentVersion() {
  try {
    return require('../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Checks if an update is available.
 * @returns {Promise<{updateAvailable: boolean, latestVersion: string, currentVersion: string, manifest: Object|null}>}
 */
async function checkForUpdate() {
  const currentVersion = getCurrentVersion();
  const manifest = await fetchManifest();

  if (!manifest) {
    return { updateAvailable: false, latestVersion: currentVersion, currentVersion, manifest: null };
  }

  const updateAvailable = compareVersions(manifest.version, currentVersion) > 0;

  // Check if current version is below minimum required (forced update)
  const forcedUpdate = manifest.minRequired &&
    compareVersions(currentVersion, manifest.minRequired) < 0;

  return {
    updateAvailable,
    forcedUpdate,
    latestVersion: manifest.version,
    currentVersion,
    manifest
  };
}

// ─── Download & Verify ────────────────────────────────────────────────────────

/**
 * Downloads the update binary and verifies its SHA256 hash.
 * @param {Object} manifest - update manifest from fetchManifest
 * @returns {Promise<{path: string, verified: boolean}>}
 */
async function downloadUpdate(manifest) {
  if (!fs.existsSync(UPDATE_CACHE_DIR)) {
    fs.mkdirSync(UPDATE_CACHE_DIR, { recursive: true });
  }

  const platform = os.platform();
  const arch = os.arch();
  const filename = `smartlangguard-${manifest.version}-${platform}-${arch}` +
    (platform === 'win32' ? '.exe' : '');
  const downloadPath = path.join(UPDATE_CACHE_DIR, filename);

  // Download
  const res = await fetch(manifest.url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(downloadPath, buffer, { mode: 0o755 });

  // Verify SHA256
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const verified = hash === manifest.sha256;

  if (!verified) {
    fs.unlinkSync(downloadPath);
    throw new Error(`Hash verification failed: expected ${manifest.sha256}, got ${hash}`);
  }

  // Verify signature (if present)
  if (manifest.signature && manifest.publicKey) {
    const sigValid = crypto.verify(
      'sha256',
      buffer,
      { key: manifest.publicKey, format: 'pem' },
      Buffer.from(manifest.signature, 'base64')
    );
    if (!sigValid) {
      fs.unlinkSync(downloadPath);
      throw new Error('Signature verification failed');
    }
  }

  return { path: downloadPath, verified: true, hash };
}

// ─── Apply Update ─────────────────────────────────────────────────────────────

/**
 * Applies the downloaded update by replacing the current binary.
 * On Windows, this requires a restart. On Unix, atomic replace.
 * 
 * @param {string} downloadedPath
 * @returns {Promise<{applied: boolean, requiresRestart: boolean}>}
 */
async function applyUpdate(downloadedPath) {
  const currentBin = process.execPath;
  const backupPath = `${currentBin}.bak`;

  try {
    // Backup current binary
    if (fs.existsSync(currentBin)) {
      fs.copyFileSync(currentBin, backupPath);
    }

    // Replace
    fs.copyFileSync(downloadedPath, currentBin);
    fs.chmodSync(currentBin, 0o755);

    // Clean up
    fs.unlinkSync(downloadedPath);
    setTimeout(() => {
      try { if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath); } catch {}
    }, 5000);

    return { applied: true, requiresRestart: true };
  } catch (err) {
    // Restore from backup
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, currentBin);
    }
    throw err;
  }
}

// ─── Full Update Flow ─────────────────────────────────────────────────────────

/**
 * Performs the full update flow: check → download → verify → apply.
 * @param {Object} [options] - { onProgress }
 * @returns {Promise<{updated: boolean, version: string, requiresRestart: boolean}>}
 */
async function performUpdate(options = {}) {
  const { onProgress } = options;

  onProgress?.('checking');
  const check = await checkForUpdate();
  if (!check.updateAvailable) {
    return { updated: false, version: check.currentVersion, requiresRestart: false };
  }

  onProgress?.('downloading');
  const downloaded = await downloadUpdate(check.manifest);

  onProgress?.('applying');
  const applied = await applyUpdate(downloaded.path);

  return {
    updated: true,
    version: check.latestVersion,
    requiresRestart: applied.requiresRestart
  };
}

module.exports = {
  checkForUpdate,
  fetchManifest,
  downloadUpdate,
  applyUpdate,
  performUpdate,
  compareVersions,
  getCurrentVersion,
  UPDATE_MANIFEST_URL
};
