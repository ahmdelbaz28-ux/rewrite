#!/usr/bin/env node

/**
 * SmartLangGuard System Tray App
 *
 * Electron application that lives in the system tray/menu bar and provides:
 *   - Green dot icon when keyboard hook is active
 *   - Yellow dot icon when daemon is running but hook is off
 *   - Red dot icon when daemon is unreachable
 *   - Right-click menu to toggle auto-fix, keyboard hook, and auto-start
 *   - Toast notifications for important events
 *   - Auto-starts on login (configurable)
 *   - No visible window (runs entirely in the tray)
 *
 * Usage:
 *   npx @smartlangguard/tray-app
 *   smartlangguard tray
 *
 * @module tray-app
 */

'use strict';

const { app, Tray, Menu, nativeImage, Notification } = require('electron');
const http = require('http');
const path = require('path');
const os = require('os');

// ─── Configuration ───────────────────────────────────────────────────────────

const DAEMON_URL = `http://localhost:41783`;
const POLL_INTERVAL_MS = 2000; // poll daemon status every 2 seconds
const ICON_SIZE = 32; // tray icon size in pixels (standard for Windows)

// ─── State ───────────────────────────────────────────────────────────────────

let tray = null;
let pollTimer = null;
let daemonAuthToken = null;
let currentState = {
  daemonRunning: false,
  hookRunning: false,
  hookBuilt: false,
  autofix: false,
  monitoring: false,
  hookSupported: true,
  version: '0.0.0'
};

// ─── Auth Token ──────────────────────────────────────────────────────────────

const fs = require('fs');
const tokenPath = path.join(os.homedir(), '.smartlangguard', 'daemon-token');

try {
  if (fs.existsSync(tokenPath)) {
    daemonAuthToken = fs.readFileSync(tokenPath, 'utf8').trim();
  }
} catch {
  // Auth token not available - some features will be read-only
}

// ─── Icon Generation ─────────────────────────────────────────────────────────

/**
 * Generates a tray icon as a colored circle using raw RGBA pixel data.
 * Creates a 24x24 image with a filled circle and a glossy highlight.
 *
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Electron.NativeImage}
 */
function generateTrayIcon(r, g, b) {
  const size = ICON_SIZE;
  const center = size / 2;
  const radius = center - 1.5;
  const highlightRadius = radius * 0.35;

  // RGBA pixel buffer: 4 bytes per pixel, rows from top to bottom
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= radius) {
        // Inside the circle
        const alpha = dist > radius - 1.5 ? Math.round((radius - dist) * 255) : 255;

        // Add glossy highlight in the top-left quadrant
        const angle = Math.atan2(dy, dx);
        const isHighlight = dist < highlightRadius && angle > -Math.PI * 0.8 && angle < Math.PI * 0.2;

        if (isHighlight) {
          // Lighter highlight (BGRA byte order for Windows)
          const brightness = 1.0 - (dist / highlightRadius) * 0.3;
          buffer[idx] = Math.min(255, Math.round(b + (255 - b) * 0.4 * brightness));     // Blue
          buffer[idx + 1] = Math.min(255, Math.round(g + (255 - g) * 0.4 * brightness));  // Green
          buffer[idx + 2] = Math.min(255, Math.round(r + (255 - r) * 0.4 * brightness));  // Red
          buffer[idx + 3] = alpha;                                                         // Alpha
        } else {
          // Normal color with slight edge darkening
          const edgeDarken = Math.max(0.7, 1.0 - (dist / radius) * 0.2);
          // BGRA byte order for Windows (little-endian x64)
          buffer[idx] = Math.round(b * edgeDarken);     // Blue
          buffer[idx + 1] = Math.round(g * edgeDarken);  // Green
          buffer[idx + 2] = Math.round(r * edgeDarken);  // Red
          buffer[idx + 3] = alpha;                       // Alpha
        }
      } else {
        // Transparent (outside the circle)
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

// Cache the icons for performance
const ICONS = {
  green: null,  // hook active
  yellow: null, // daemon running, hook off
  red: null,    // daemon unreachable
  gray: null    // loading / unknown
};

function getIcon(state) {
  if (!ICONS.green) {
    ICONS.green = generateTrayIcon(34, 197, 94);   // #22c55e
    ICONS.yellow = generateTrayIcon(234, 179, 8);   // #eab308
    ICONS.red = generateTrayIcon(239, 68, 68);       // #ef4444
    ICONS.gray = generateTrayIcon(107, 114, 128);    // #6b7280
  }

  if (!state.daemonRunning) return ICONS.red;
  if (state.hookRunning) return ICONS.green;
  return ICONS.yellow;
}

function getStatusText(state) {
  if (!state.daemonRunning) return 'Daemon Offline';
  if (state.hookRunning) return 'Keyboard Hook: Active';
  if (!state.hookBuilt) return 'Keyboard Hook: Not Built';
  return 'Keyboard Hook: Inactive';
}

function getTooltip(state) {
  const lines = [
    `SmartLangGuard v${state.version}`,
    getStatusText(state),
    `Auto-Fix: ${state.autofix ? 'ON' : 'OFF'}`,
    `Clipboard: ${state.monitoring ? 'Active' : 'Inactive'}`
  ];
  // Only show daemon URL if daemon is running
  if (state.daemonRunning) {
    lines.push(`Daemon: ${DAEMON_URL}`);
  }
  return lines.join('  |  ');
}

// ─── Daemon API Client ───────────────────────────────────────────────────────

/**
 * Makes an HTTP request to the daemon API.
 * @param {string} method - HTTP method
 * @param {string} path - URL path (e.g., '/status')
 * @param {object} [body] - Optional request body for POST
 * @returns {Promise<object|null>}
 */
function daemonRequest(method, path, body) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: 41783,
      path,
      method,
      timeout: 1500,
      headers: {}
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    // Add auth token for non-GET requests (tray app can access the local token file)
    if (method !== 'GET' && daemonAuthToken) {
      options.headers['Authorization'] = `Bearer ${daemonAuthToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Fetches the daemon status.
 */
async function fetchStatus() {
  return daemonRequest('GET', '/status');
}

/**
 * Toggles the auto-fix feature on the daemon.
 */
async function toggleAutofix() {
  return daemonRequest('POST', '/autofix/toggle');
}

/**
 * Toggles the keyboard hook on/off via the daemon's /hook/toggle endpoint.
 */
async function toggleKeyboardHook() {
  const result = await daemonRequest('POST', '/hook/toggle');
  if (result && result.running !== undefined) {
    currentState.hookRunning = result.running;
    updateTray();
    showNotification(
      'Keyboard Hook',
      result.running ? 'Hook is now ACTIVE' : 'Hook is now INACTIVE'
    );
    return result;
  }
  showNotification(
    'Keyboard Hook Error',
    (result && result.error) || 'Could not toggle hook. Is hook built?'
  );
  return { running: false };
}

// ─── Polling ─────────────────────────────────────────────────────────────────

async function pollDaemon() {
  const status = await fetchStatus();

  if (status) {
    currentState = {
      daemonRunning: true,
      hookRunning: status.keyboardHook?.running || false,
      hookBuilt: status.keyboardHook?.built || false,
      hookSupported: status.keyboardHook?.supported !== false,
      autofix: status.autofix || false,
      monitoring: status.monitoring || false,
      version: status.version || '0.0.0'
    };
  } else {
    currentState.daemonRunning = false;
  }

  updateTray();
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(pollDaemon, POLL_INTERVAL_MS);
  pollDaemon(); // immediate first poll
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ─── Tray Menu ───────────────────────────────────────────────────────────────

function buildContextMenu() {
  const isDaemonOnline = currentState.daemonRunning;

  const template = [
    {
      label: `SmartLangGuard v${currentState.version}`,
      enabled: false,
      icon: getIcon(currentState)
    },
    { type: 'separator' },
    {
      label: `Status: ${getStatusText(currentState)}`,
      enabled: false
    },
    {
      label: `Auto-Fix: ${currentState.autofix ? 'ON ✓' : 'OFF ○'}`,
      type: 'checkbox',
      checked: currentState.autofix,
      enabled: isDaemonOnline,
      click: async () => {
        const result = await toggleAutofix();
        if (result) {
          currentState.autofix = result.autofix;
          updateTray();
          showNotification(
            'Auto-Fix Toggled',
            result.autofix ? 'Auto-fix is now ON' : 'Auto-fix is now OFF'
          );
        } else {
          showNotification('Daemon Error', 'Could not toggle auto-fix. Is the daemon running?');
        }
      }
    },
    {
      label: `${currentState.hookRunning ? '✓' : '○'} Keyboard Hook`,
      type: 'checkbox',
      checked: currentState.hookRunning,
      enabled: isDaemonOnline && currentState.hookBuilt,
      click: async () => {
        await toggleKeyboardHook();
      }
    },
    { type: 'separator' },
    {
      label: 'Start Daemon with Hook',
      enabled: !isDaemonOnline,
      click: () => {
        // This is a placeholder - in production, this would spawn the daemon process
        showNotification(
          'Daemon Control',
          'Run: smartlangguard daemon --enable-typing-monitor --auto-start'
        );
      }
    },
    {
      label: 'Open at Login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
        showNotification(
          'Auto-Start',
          menuItem.checked ? 'Will start on login' : 'Will NOT start on login'
        );
      }
    },
    { type: 'separator' },
    {
      label: 'About SmartLangGuard',
      click: () => {
        showNotification(
          'SmartLangGuard',
          `Version ${currentState.version}\nAuto-correct keyboard layout mistakes\nArabic ↔ English`
        );
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ];

  return Menu.buildFromTemplate(template);
}

function updateTray() {
  if (!tray) return;

  const icon = getIcon(currentState);
  tray.setImage(icon);
  tray.setToolTip(getTooltip(currentState));

  const contextMenu = buildContextMenu();
  tray.setContextMenu(contextMenu);
}

// ─── Notifications ───────────────────────────────────────────────────────────

/**
 * Shows a non-blocking toast notification using Electron's Notification API.
 * @param {string} title
 * @param {string} body
 */
function showNotification(title, body) {
  try {
    const notification = new Notification({
      title: `SmartLangGuard: ${title}`,
      body,
      silent: true,
      icon: getIcon(currentState)
    });
    notification.show();
  } catch (err) {
    console.error(`[Tray] Notification error: ${err.message}`);
  }
}

// ─── Tray Setup ──────────────────────────────────────────────────────────────

function createTray() {
  // Start with gray icon (loading state)
  const grayIcon = generateTrayIcon(107, 114, 128);
  tray = new Tray(grayIcon);
  tray.setToolTip('SmartLangGuard - Starting...');

  // Set initial context menu
  const menu = Menu.buildFromTemplate([
    { label: 'Starting SmartLangGuard...', enabled: false }
  ]);
  tray.setContextMenu(menu);

  // Click behavior: show notification with current status
  tray.on('click', () => {
    showNotification(
      'SmartLangGuard',
      getTooltip(currentState).replace(/\s*\|\s*/g, '\n')
    );
  });

  // Double-click: toggle auto-fix
  tray.on('double-click', async () => {
    if (currentState.daemonRunning) {
      const result = await toggleAutofix();
      if (result) {
        currentState.autofix = result.autofix;
        updateTray();
      }
    } else {
      showNotification('Daemon Offline', 'Cannot toggle auto-fix. Start the daemon first.');
    }
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.whenReady().then(() => {
  createTray();
  startPolling();

  // Show a startup notification
  setTimeout(() => {
    if (currentState.daemonRunning) {
      showNotification(
        'Ready',
        `SmartLangGuard is running. ${currentState.hookRunning ? 'Keyboard hook active.' : 'Hook inactive.'}`
      );
    } else {
      showNotification(
        'Daemon Not Found',
        'SmartLangGuard daemon is not running. Start it with: smartlangguard daemon'
      );
    }
  }, 3000);
});

app.on('will-quit', () => {
  stopPolling();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// Prevent the app from quitting when all windows are closed (we have no windows)
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

// ─── Exports (for CLI integration) ───────────────────────────────────────────

let trayStarted = false;

module.exports = {
  start: () => {
    // Prevent duplicate tray creation
    if (trayStarted) return;
    trayStarted = true;

    // The app lifecycle is managed by Electron's app module
    app.whenReady().then(() => {
      createTray();
      startPolling();
    });
  },
  getState: () => ({ ...currentState })
};
