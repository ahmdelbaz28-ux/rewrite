/**
 * SmartLangGuard GDPR Privacy Framework
 * 
 * Provides:
 *   - Consent management
 *   - Data retention policies
 *   - Right to deletion (GDPR Article 17)
 *   - Data export (GDPR Article 20)
 *   - Anonymization
 *   - Privacy-preserving telemetry
 * 
 * @module backend/privacy
 */

'use strict';

const crypto = require('crypto');

// ─── Consent Types ─────────────────────────────────────────────────────────────

const CONSENT_TYPES = {
  TELEMETRY: 'telemetry',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
  PERSONALIZATION: 'personalization'
};

const CONSENT_VERSION = '1.0';

// ─── Consent Record ────────────────────────────────────────────────────────────

/**
 * Creates a new consent record
 */
function createConsentRecord(anonymousId, consents, source = 'app') {
  return {
    id: generateId(),
    anonymousId,
    consents: normalizeConsents(consents),
    version: CONSENT_VERSION,
    source,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ipAddress: null,  // Will be added by middleware
    userAgent: null    // Will be added by middleware
  };
}

/**
 * Normalize consent object
 */
function normalizeConsents(consents) {
  const defaults = {
    [CONSENT_TYPES.TELEMETRY]: false,
    [CONSENT_TYPES.ANALYTICS]: false,
    [CONSENT_TYPES.MARKETING]: false,
    [CONSENT_TYPES.PERSONALIZATION]: false
  };

  if (typeof consents === 'boolean') {
    // If single boolean, apply to all
    Object.keys(defaults).forEach(key => {
      defaults[key] = consents;
    });
  } else if (consents && typeof consents === 'object') {
    Object.keys(defaults).forEach(key => {
      if (consents[key] !== undefined) {
        defaults[key] = Boolean(consents[key]);
      }
    });
  }

  return defaults;
}

/**
 * Check if consent is given for a specific type
 */
function hasConsent(consentRecord, consentType) {
  if (!consentRecord || !consentRecord.consents) {
    return false;
  }
  return Boolean(consentRecord.consents[consentType]);
}

// ─── Data Retention ───────────────────────────────────────────────────────────

const RETENTION_PERIODS = {
  TELEMETRY_RAW: 30 * 24 * 60 * 60 * 1000,      // 30 days
  TELEMETRY_ANONYMIZED: 365 * 24 * 60 * 60 * 1000, // 1 year
  CONSENT_RECORDS: 5 * 365 * 24 * 60 * 60 * 1000,  // 5 years (legal requirement)
  SESSIONS: 90 * 24 * 60 * 60 * 1000,              // 90 days
  API_LOGS: 30 * 24 * 60 * 60 * 1000               // 30 days
};

/**
 * Check if data should be retained based on retention policy
 */
function shouldRetainData(createdAt, retentionType) {
  const retentionPeriod = RETENTION_PERIODS[retentionType];
  if (!retentionPeriod) return true;
  
  return Date.now() - createdAt < retentionPeriod;
}

/**
 * Get data that can be safely deleted (past retention period)
 */
function getExpiredDataQuery(retentionType, timestampColumn = 'timestamp') {
  const retentionPeriod = RETENTION_PERIODS[retentionType];
  if (!retentionPeriod) return null;
  
  const cutoffTime = Date.now() - retentionPeriod;
  return `${timestampColumn} < ${cutoffTime}`;
}

// ─── Anonymization ─────────────────────────────────────────────────────────────

/**
 * Anonymize an IP address (last octet for IPv4)
 */
function anonymizeIP(ipAddress) {
  if (!ipAddress) return null;
  
  // IPv4: 192.168.1.100 -> 192.168.1.0
  const ipv4Match = ipAddress.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.0`;
  }
  
  // IPv6: Keep first 64 bits
  const ipv6Parts = ipAddress.split(':');
  if (ipv6Parts.length >= 4) {
    return `${ipv6Parts[0]}::${ipv6Parts.slice(-2).join(':')}`.substring(0, 20);
  }
  
  return '0.0.0.0';
}

/**
 * Anonymize telemetry event
 */
function anonymizeEvent(event) {
  return {
    ...event,
    anonymousId: hashIdentifier(event.anonymousId),
    ipAddress: anonymizeIP(event.ipAddress),
    os: event.os,
    app_version: event.app_version,
    timestamp: event.timestamp,
    properties: event.properties ? anonymizeProperties(event.properties) : null
  };
}

/**
 * Anonymize properties (remove PII)
 */
function anonymizeProperties(properties) {
  if (!properties || typeof properties !== 'object') {
    return properties;
  }

  const piiFields = ['email', 'name', 'phone', 'address', 'ip', 'deviceId', 'fingerprint'];
  const anonymized = { ...properties };

  piiFields.forEach(field => {
    if (anonymized[field]) {
      anonymized[field] = hashIdentifier(String(anonymized[field]));
    }
  });

  return anonymized;
}

/**
 * Hash identifier for privacy
 */
function hashIdentifier(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex').substring(0, 16);
}

// ─── Data Export ──────────────────────────────────────────────────────────────

/**
 * Export user data in JSON format (GDPR Article 20)
 */
function exportUserData(userData, consentRecords, telemetryEvents) {
  return {
    exportDate: new Date().toISOString(),
    version: '1.0',
    user: userData ? {
      id: userData.id,
      email: userData.email,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at
    } : null,
    consentHistory: consentRecords,
    telemetry: telemetryEvents.map(anonymizeEvent),
    metadata: {
      recordCount: telemetryEvents.length,
      exportedFields: ['id', 'email', 'createdAt', 'updatedAt', 'consentHistory', 'telemetry']
    }
  };
}

// ─── Right to Deletion ─────────────────────────────────────────────────────────

/**
 * Generate deletion confirmation token
 */
function generateDeletionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create deletion request record
 */
function createDeletionRequest(identifier, identifierType, reason = null) {
  return {
    id: generateId(),
    identifier,
    identifierType, // 'anonymous_id', 'email', 'license_token'
    reason,
    status: 'pending',
    createdAt: Date.now(),
    completedAt: null,
    deletionToken: generateDeletionToken()
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * Sanitize string for logging (remove potential PII patterns)
 */
function sanitizeForLogging(str) {
  if (typeof str !== 'string') return str;
  
  // Email pattern
  str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  
  // Phone pattern
  str = str.replace(/\+?[\d\s-]{10,}/g, '[PHONE_REDACTED]');
  
  // IP address
  str = str.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP_REDACTED]');
  
  return str;
}

// ─── Express Middleware ────────────────────────────────────────────────────────

/**
 * Privacy middleware that adds IP and User-Agent to requests
 */
function privacyMiddleware(req, res, next) {
  req.clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.connection?.remoteAddress 
    || req.ip;
  
  req.userAgent = req.headers['user-agent'];
  
  next();
}

/**
 * Consent verification middleware
 */
function requireConsentMiddleware(consentType, db) {
  return async (req, res, next) => {
    // Skip for certain routes
    const skipRoutes = ['/health', '/v1/telemetry/batch', '/v1/license/validate'];
    if (skipRoutes.includes(req.path)) {
      return next();
    }

    // For telemetry, check consent
    if (consentType === CONSENT_TYPES.TELEMETRY) {
      const anonymousId = req.headers['x-anonymous-id'] || req.body?.anonymous_id;
      
      if (anonymousId && db) {
        const consentRecord = db.get(
          'SELECT * FROM consent_records WHERE anonymous_id = ? ORDER BY created_at DESC LIMIT 1',
          anonymousId
        );
        
        if (consentRecord) {
          const consentData = JSON.parse(consentRecord.consents || '{}');
          if (!hasConsent({ consents: consentData }, CONSENT_TYPES.TELEMETRY)) {
            return res.status(403).json({
              error: 'Consent required',
              message: 'Telemetry collection requires user consent',
              consentRequired: CONSENT_TYPES.TELEMETRY
            });
          }
        } else {
          // No consent record - check default (no consent by default)
          return res.status(403).json({
            error: 'Consent required',
            message: 'Telemetry collection requires user consent',
            consentRequired: CONSENT_TYPES.TELEMETRY
          });
        }
      }
    }

    next();
  };
}

/**
 * Data retention cleanup job
 */
async function runRetentionCleanup(db) {
  console.log('Starting data retention cleanup...');
  
  const deletedCounts = {};
  
  // Clean up old telemetry (raw data older than 30 days)
  const telemetryCutoff = Date.now() - RETENTION_PERIODS.TELEMETRY_RAW;
  const telemetryResult = db.run(
    'DELETE FROM telemetry_events WHERE timestamp < ?',
    telemetryCutoff
  );
  deletedCounts.telemetry = telemetryResult.changes;
  
  // Anonymize telemetry older than 6 months (but less than 1 year)
  const anonymizeCutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const oldEvents = db.all(
    'SELECT * FROM telemetry_events WHERE timestamp < ? AND (ip_address IS NOT NULL OR anonymous_id IS NOT NULL)',
    anonymizeCutoff
  );
  
  for (const event of oldEvents) {
    const anonymized = anonymizeEvent({
      ...event,
      properties: event.properties ? JSON.parse(event.properties) : null
    });
    
    db.run(
      'UPDATE telemetry_events SET anonymous_id = ?, ip_address = ?, properties = ? WHERE id = ?',
      anonymized.anonymousId,
      anonymized.ipAddress,
      anonymized.properties ? JSON.stringify(anonymized.properties) : null,
      event.id
    );
  }
  
  console.log(`Retention cleanup complete. Deleted ${deletedCounts.telemetry} telemetry records.`);
  return deletedCounts;
}

module.exports = {
  CONSENT_TYPES,
  CONSENT_VERSION,
  RETENTION_PERIODS,
  createConsentRecord,
  normalizeConsents,
  hasConsent,
  shouldRetainData,
  getExpiredDataQuery,
  anonymizeIP,
  anonymizeEvent,
  anonymizeProperties,
  hashIdentifier,
  exportUserData,
  generateDeletionToken,
  createDeletionRequest,
  sanitizeForLogging,
  privacyMiddleware,
  requireConsentMiddleware,
  runRetentionCleanup
};
