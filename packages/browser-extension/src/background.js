/**
 * SmartLangGuard Background Service Worker (MV3)
 * 
 * Handles:
 *   - Keyboard commands (Ctrl+Shift+L, Ctrl+Shift+K)
 *   - Context menu items
 *   - Communication between popup, content scripts, and daemon
 *   - License caching via chrome.storage
 */

'use strict';

// Default config
const DEFAULT_CONFIG = {
  daemonEndpoint: 'http://localhost:41783',
  apiEndpoint: 'http://localhost:4000',
  autoFix: false,
  licenseToken: '',
  telemetry: true,
  authToken: ''  // Daemon auth token
};

// ─── Install / Startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  // Initialize config
  const stored = await chrome.storage.local.get('config');
  if (!stored.config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
  }

  // Create context menu items
  chrome.contextMenus.create({
    id: 'fix-selection',
    title: 'SmartLangGuard: Fix Selection',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'fix-page',
    title: 'SmartLangGuard: Fix This Page (auto-detect)',
    contexts: ['page', 'editable']
  });

  chrome.contextMenus.create({
    id: 'fix-clipboard',
    title: 'SmartLangGuard: Fix Clipboard',
    contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
  });

  chrome.contextMenus.create({
    id: 'separator-1',
    type: 'separator',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'toggle-autofix',
    title: 'SmartLangGuard: Toggle Auto-Fix',
    contexts: ['page']
  });
});

// ─── Commands (keyboard shortcuts) ────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  const tab = await getActiveTab();
  if (!tab) return;

  switch (command) {
    case 'fix-selection':
      await fixSelectionInTab(tab.id);
      break;
    case 'fix-clipboard':
      await fixClipboardViaDaemon();
      break;
  }
});

// ─── Context Menu ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'fix-selection':
      if (info.selectionText) {
        await fixSelectionText(info.selectionText, tab?.id);
      }
      break;
    case 'fix-page':
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { action: 'autoFixPage' });
      }
      break;
    case 'fix-clipboard':
      await fixClipboardViaDaemon();
      break;
    case 'toggle-autofix':
      const { config } = await chrome.storage.local.get('config');
      config.autoFix = !config.autoFix;
      await chrome.storage.local.set({ config });
      showNotification(
        config.autoFix ? 'Auto-Fix enabled' : 'Auto-Fix disabled',
        config.autoFix 
          ? 'SmartLangGuard will auto-fix selection on supported pages.'
          : 'Auto-Fix has been turned off.'
      );
      break;
  }
});

// ─── Messages from popup/content scripts ──────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const result = await handleMessage(message, sender);
      sendResponse({ success: true, data: result });
    } catch (err) {
      console.error('[SmartLangGuard bg] error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // keep channel open for async
});

async function handleMessage(message, sender) {
  switch (message.action) {
    case 'fixText':
      return await callDaemon('/fix', { text: message.text, options: message.options });

    case 'fixClipboard':
      return await callDaemon('/clipboard/fix', {});

    case 'fixSelection':
      const tab = await getActiveTab();
      if (!tab) throw new Error('No active tab');
      return await fixSelectionInTab(tab.id);

    case 'getStatus':
      return await callDaemon('/status', null, 'GET');

    case 'toggleAutoFix':
      const res = await callDaemon('/autofix/toggle', null, 'POST');
      const { config } = await chrome.storage.local.get('config');
      config.autoFix = res.autofix;
      await chrome.storage.local.set({ config });
      return res;

    case 'activateLicense':
      return await callApi('/v1/license/validate', {
        token: message.token
      }, 'POST', {
        'X-Device-Id': await getDeviceId(),
        'X-Device-Fingerprint': await getDeviceFingerprint()
      });

    case 'getConfig':
      const stored = await chrome.storage.local.get('config');
      return stored.config || DEFAULT_CONFIG;

    case 'setConfig':
      const oldConfig = (await chrome.storage.local.get('config')).config || DEFAULT_CONFIG;
      const newConfig = { ...oldConfig, ...message.config };
      await chrome.storage.local.set({ config: newConfig });
      return newConfig;

    default:
      throw new Error(`Unknown action: ${message.action}`);
  }
}

// ─── Daemon API Helpers ───────────────────────────────────────────────────────

async function callDaemon(path, body, method = 'POST') {
  const { config } = await chrome.storage.local.get('config');
  const endpoint = config?.daemonEndpoint || DEFAULT_CONFIG.daemonEndpoint;
  const authToken = config?.authToken;

  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(`${endpoint}${path}`, opts);

  if (!res.ok) {
    throw new Error(`Daemon returned ${res.status}`);
  }

  return await res.json();
}

async function callApi(path, body, method = 'POST', extraHeaders = {}) {
  const { config } = await chrome.storage.local.get('config');
  const endpoint = config?.apiEndpoint || DEFAULT_CONFIG.apiEndpoint;

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(`${endpoint}${path}`, opts);
  return await res.json();
}

// ─── Selection Fixing ─────────────────────────────────────────────────────────

async function fixSelectionInTab(tabId) {
  // Ask content script for the current selection
  const response = await chrome.tabs.sendMessage(tabId, { action: 'getSelection' });
  if (!response?.success || !response.data?.text) {
    throw new Error('No text selected');
  }

  const result = await callDaemon('/fix', { text: response.data.text });
  
  // Replace selection in the page
  await chrome.tabs.sendMessage(tabId, {
    action: 'replaceSelection',
    text: result.corrected
  });

  // Show notification
  showNotification(
    'Fixed ✓',
    `"${response.data.text.slice(0, 30)}..." → "${result.corrected.slice(0, 30)}..."`
  );

  // Track telemetry
  if (result.direction) {
    trackTelemetry('correction_applied', {
      direction: result.direction,
      length: response.data.text.length,
      score: result.score,
      source: result.source
    });
  }

  return result;
}

async function fixSelectionText(text, tabId) {
  const result = await callDaemon('/fix', { text });

  if (tabId) {
    await chrome.tabs.sendMessage(tabId, {
      action: 'replaceSelection',
      text: result.corrected
    });
  }

  showNotification(
    'Fixed ✓',
    `"${text.slice(0, 30)}..." → "${result.corrected.slice(0, 30)}..."`
  );

  return result;
}

async function fixClipboardViaDaemon() {
  const result = await callDaemon('/clipboard/fix', {});
  showNotification('Clipboard fixed ✓', 'The corrected text is now in your clipboard.');
  return result;
}

// ─── Tab Helpers ──────────────────────────────────────────────────────────────

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ─── Device Identity ──────────────────────────────────────────────────────────

let cachedDeviceId = null;

async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = await chrome.storage.local.get('deviceId');
  if (stored.deviceId) {
    cachedDeviceId = stored.deviceId;
    return cachedDeviceId;
  }
  cachedDeviceId = 'ext_' + crypto.getRandomValues(new Uint8Array(12)).reduce(
    (s, b) => s + b.toString(16).padStart(2, '0'), ''
  );
  await chrome.storage.local.set({ deviceId: cachedDeviceId });
  return cachedDeviceId;
}

async function getDeviceFingerprint() {
  const ua = navigator.userAgent;
  const lang = navigator.language;
  const platform = navigator.platform;
  const data = `${ua}|${lang}|${platform}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).reduce(
    (s, b) => s + b.toString(16).padStart(2, '0'), ''
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: `SmartLangGuard: ${title}`,
    message,
    priority: 2
  });
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

async function trackTelemetry(event, properties) {
  const { config } = await chrome.storage.local.get('config');
  if (!config?.telemetry) return;

  // Buffer events in storage, flush periodically
  const stored = await chrome.storage.local.get('telemetryQueue');
  const queue = stored.telemetryQueue || [];
  queue.push({
    event,
    properties,
    anonymous_id: await getDeviceId(),
    timestamp: Date.now(),
    app_version: chrome.runtime.getManifest().version
  });

  // Cap queue size
  while (queue.length > 100) queue.shift();

  await chrome.storage.local.set({ telemetryQueue: queue });

  // Flush every 10 events
  if (queue.length >= 10) {
    flushTelemetry();
  }
}

async function flushTelemetry() {
  const { config, telemetryQueue } = await chrome.storage.local.get(['config', 'telemetryQueue']);
  if (!telemetryQueue || telemetryQueue.length === 0) return;

  try {
    await callApi('/v1/telemetry/batch', { events: telemetryQueue });
    await chrome.storage.local.set({ telemetryQueue: [] });
  } catch (err) {
    // Keep in queue, will retry later
    console.warn('Telemetry flush failed:', err.message);
  }
}

// Periodic flush (alarm-based to respect MV3 lifecycle)
chrome.alarms?.create('flushTelemetry', { periodInMinutes: 30 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flushTelemetry') flushTelemetry();
});
