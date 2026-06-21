/**
 * License routes: validate, activate, revoke, info
 */

'use strict';

const express = require('express');

const router = express.Router();

const crypto = require('crypto');

const db = require('../db').prepare;

const { asyncHandler } = require('../middleware');

const { signLicenseToken, TIER_FEATURES } = require('../../../core/src/license');

// ─── POST /v1/license/validate ────────────────────────────────────────────────

router.post('/validate', asyncHandler(async (req, res) => {
  const { token } = req.body;
  const deviceId = req.headers['x-device-id'];
  const fingerprint = req.headers['x-device-fingerprint'];

  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token required' });
  }

  const license = db().prepare(
    'SELECT * FROM licenses WHERE token = ? AND revoked = 0'
  ).get(token);

  if (!license) {
    return res.json({ valid: false });
  }

  // Check expiry
  if (license.expires_at && Date.now() > license.expires_at) {
    return res.json({ valid: false, reason: 'expired' });
  }

  // Device management
  if (deviceId && fingerprint) {
    const devices = JSON.parse(license.device_fingerprints || '[]');
    
    // Check if device is already registered
    const existing = devices.find(d => d.fingerprint === fingerprint);
    if (!existing) {
      // Check device limit
      if (devices.length >= license.max_devices) {
        return res.status(403).json({
          valid: false,
          reason: 'max_devices_reached',
          max_devices: license.max_devices
        });
      }
      devices.push({
        device_id: deviceId,
        fingerprint,
        registered_at: Date.now()
      });
      db().prepare('UPDATE licenses SET device_fingerprints = ? WHERE id = ?')
        .run(JSON.stringify(devices), license.id);
    }

    // Update last_seen (use UPSERT for idempotency)
    // First: check if this device is already registered (with any license)
    const existingDevice = db().prepare(
      'SELECT id, license_id FROM devices WHERE id = ?'
    ).get(deviceId);
    
    if (existingDevice) {
      if (existingDevice.license_id === license.id) {
        // Same device, same license → just update last_seen
        db().prepare(
          'UPDATE devices SET last_seen = ?, fingerprint = ? WHERE id = ?'
        ).run(Date.now(), fingerprint, deviceId);
      } else {
        // Device switched to a new license → reassign
        db().prepare(
          'UPDATE devices SET license_id = ?, fingerprint = ?, last_seen = ? WHERE id = ?'
        ).run(license.id, fingerprint, Date.now(), deviceId);
      }
    } else {
      // New device → check if fingerprint is already registered for this license
      const existingFp = db().prepare(
        'SELECT id FROM devices WHERE license_id = ? AND fingerprint = ?'
      ).get(license.id, fingerprint);
      
      if (existingFp) {
        // Same fingerprint, update its device_id and last_seen
        db().prepare(
          'UPDATE devices SET id = ?, last_seen = ? WHERE license_id = ? AND fingerprint = ?'
        ).run(deviceId, Date.now(), license.id, fingerprint);
      } else {
        // Truly new device
        db().prepare(
          `INSERT INTO devices (id, license_id, fingerprint, hostname, platform, last_seen, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          deviceId, license.id, fingerprint,
          req.headers['x-hostname'] || 'unknown',
          req.headers['x-platform'] || 'unknown',
          Date.now(), Date.now()
        );
      }
    }
  }

  res.json({
    valid: true,
    tier: license.tier,
    features: JSON.parse(license.features || '[]'),
    expires_at: license.expires_at,
    max_devices: license.max_devices,
    devices_registered: JSON.parse(license.device_fingerprints || '[]').length
  });
}));

// ─── POST /v1/license/activate ────────────────────────────────────────────────

router.post('/activate', asyncHandler(async (req, res) => {
  const { email, tier = 'free' } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Generate token
  const token = 'slg_' + crypto.randomBytes(16).toString('hex');
  const features = JSON.stringify(TIER_FEATURES[tier] || TIER_FEATURES.free);
  const maxDevices = tier === 'free' ? 1 : tier === 'pro' ? 3 : tier === 'team' ? 10 : 100;
  const expiresAt = tier === 'free' 
    ? Date.now() + (365 * 24 * 60 * 60 * 1000)  // 1 year
    : Date.now() + (30 * 24 * 60 * 60 * 1000);  // 30 days (renewed by Stripe)

  db().prepare(
    `INSERT INTO licenses (token, tier, email, features, max_devices, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(token, tier, email, features, maxDevices, expiresAt, Date.now(), Date.now());

  // Generate offline-signed token
  const offlineToken = signLicenseToken({
    tier,
    features: TIER_FEATURES[tier] || TIER_FEATURES.free,
    expires_at: expiresAt,
    email
  });

  res.status(201).json({
    token,
    offline_token: offlineToken,
    tier,
    features: TIER_FEATURES[tier] || TIER_FEATURES.free,
    max_devices: maxDevices,
    expires_at: expiresAt
  });
}));

// ─── POST /v1/license/revoke ──────────────────────────────────────────────────

router.post('/revoke', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const result = db().prepare('UPDATE licenses SET revoked = 1, updated_at = ? WHERE token = ?')
    .run(Date.now(), token);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'License not found' });
  }

  res.json({ success: true });
}));

// ─── GET /v1/license/info ─────────────────────────────────────────────────────

router.get('/info/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const license = db().prepare(
    'SELECT token, tier, email, features, max_devices, expires_at, created_at FROM licenses WHERE token = ? AND revoked = 0'
  ).get(token);

  if (!license) {
    return res.status(404).json({ error: 'License not found' });
  }

  const devices = JSON.parse(
    db().prepare('SELECT device_fingerprints FROM licenses WHERE id = (SELECT id FROM licenses WHERE token = ?)').get(token)?.device_fingerprints || '[]'
  );

  res.json({
    ...license,
    features: JSON.parse(license.features || '[]'),
    devices_registered: devices.length,
    devices_remaining: license.max_devices - devices.length
  });
}));

module.exports = router;
