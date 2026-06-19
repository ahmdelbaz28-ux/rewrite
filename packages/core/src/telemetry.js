/**
 * SmartLangGuard Core - Telemetry
 * 
 * Privacy-first telemetry collection. All events are batched,
 * anonymized, and sent to the SaaS backend periodically.
 * 
 * Users can opt-out completely via config.
 * 
 * @module core/telemetry
 */

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const TELEMETRY_QUEUE_FILE = path.join(
  os.homedir(),
  '.smartlangguard',
  'telemetry-queue.json'
);

const FLUSH_INTERVAL = 60 * 1000; // 1 minute
const MAX_BATCH_SIZE = 50;
const MAX_QUEUE_SIZE = 1000;

// ─── Queue Management ─────────────────────────────────────────────────────────

let queue = [];
let flushTimer = null;
let isFlushing = false;
let endpoint = process.env.SMARTLANGGUARD_API || 'http://localhost:4000';
let enabled = true;
let anonymousId = null;

function loadQueue() {
  try {
    if (fs.existsSync(TELEMETRY_QUEUE_FILE)) {
      const raw = fs.readFileSync(TELEMETRY_QUEUE_FILE, 'utf8');
      queue = JSON.parse(raw);
    }
  } catch {
    queue = [];
  }
}

function persistQueue() {
  try {
    const dir = path.dirname(TELEMETRY_QUEUE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TELEMETRY_QUEUE_FILE, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch {
    // non-fatal
  }
}

function generateAnonymousId() {
  if (anonymousId) return anonymousId;
  const crypto = require('crypto');
  anonymousId = `anon_${crypto.randomBytes(8).toString('hex')}`;
  return anonymousId;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initializes the telemetry module.
 * @param {Object} config
 * @param {boolean} [config.enabled=true]
 * @param {string} [config.endpoint]
 * @param {string} [config.anonymousId]
 */
function init(config = {}) {
  enabled = config.enabled !== false;
  if (config.endpoint) endpoint = config.endpoint;
  if (config.anonymousId) anonymousId = config.anonymousId;
  else generateAnonymousId();

  loadQueue();

  if (enabled && !flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL);
    flushTimer.unref?.(); // don't keep process alive just for telemetry
  }
}

/**
 * Tracks a telemetry event.
 * @param {string} event - event name (e.g. 'correction_applied')
 * @param {Object} [properties] - additional properties
 */
function track(event, properties = {}) {
  if (!enabled) return;

  const entry = {
    event,
    properties,
    anonymous_id: anonymousId,
    timestamp: Date.now(),
    session_id: process.pid,
    os: `${os.platform()}-${os.arch()}`,
    app_version: require('../../package.json').version || '0.0.0'
  };

  queue.push(entry);
  if (queue.length > MAX_QUEUE_SIZE) queue = queue.slice(-MAX_QUEUE_SIZE);
  persistQueue();

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  }
}

/**
 * Flushes queued telemetry events to the backend.
 */
async function flush() {
  if (isFlushing || queue.length === 0) return;
  isFlushing = true;

  const batch = queue.slice(0, MAX_BATCH_SIZE);
  queue = queue.slice(MAX_BATCH_SIZE);

  try {
    const res = await fetch(`${endpoint}/v1/telemetry/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch })
    });

    if (!res.ok) {
      // Re-queue on failure
      queue = [...batch, ...queue].slice(0, MAX_QUEUE_SIZE);
      persistQueue();
    } else {
      persistQueue();
    }
  } catch {
    // Re-queue on network error
    queue = [...batch, ...queue].slice(0, MAX_QUEUE_SIZE);
    persistQueue();
  } finally {
    isFlushing = false;
  }
}

/**
 * Disables telemetry and clears the queue.
 */
function disable() {
  enabled = false;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  queue = [];
  try {
    if (fs.existsSync(TELEMETRY_QUEUE_FILE)) fs.unlinkSync(TELEMETRY_QUEUE_FILE);
  } catch {
    // ignore
  }
}

/**
 * Returns current queue size (for debugging).
 */
function getQueueSize() {
  return queue.length;
}

// ─── Standard Events ──────────────────────────────────────────────────────────

const EVENTS = {
  EXTENSION_ACTIVATED: 'extension_activated',
  CLI_INVOKED: 'cli_invoked',
  MCP_TOOL_CALLED: 'mcp_tool_called',
  CORRECTION_APPLIED: 'correction_applied',
  CORRECTION_REJECTED: 'correction_rejected',
  CORRECTION_UNDONE: 'correction_undone',
  LICENSE_VALIDATED: 'license_validated',
  LICENSE_INVALID: 'license_invalid',
  ERROR_OCCURRED: 'error_occurred',
  UPDATE_CHECKED: 'update_checked',
  UPDATE_APPLIED: 'update_applied'
};

module.exports = {
  init,
  track,
  flush,
  disable,
  getQueueSize,
  EVENTS
};
