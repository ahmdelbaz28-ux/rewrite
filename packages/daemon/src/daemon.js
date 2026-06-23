#!/usr/bin/env node
/**
 * SmartLangGuard Daemon
 * 
 * Background service that:
 *   - Monitors the system clipboard and auto-corrects on demand
 *   - Listens for a global hotkey (Ctrl+Shift+Space) to trigger a quick-fix popup
 *   - Provides a local HTTP API with token authentication for browser extensions
 *   - Supports auto-start on login
 *   - Uses non-blocking toast notifications (not modal dialogs)
 * 
 * @module daemon
 */

'use strict';

const core = require('@smartlangguard/core');
const clipboard = require('./clipboard');
const hotkey = require('./hotkey');
const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DAEMON_PORT = 41783;
const CONFIG_DIR = path.join(os.homedir(), '.smartlangguard');
const TOKEN_FILE = path.join(CONFIG_DIR, 'daemon-token');

let monitoring = false;
let lastClipboardHash = null;
let autoFixClipboard = false;
let clipboardCheckInterval = null;
let httpServer = null;
let shutdownRegistered = false;
let authToken = null;

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Generates or loads a persistent API authentication token.
 * The browser extension must send this token with each request.
 */
function getOrCreateToken() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    if (fs.existsSync(TOKEN_FILE)) {
      authToken = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
    } else {
      authToken = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(TOKEN_FILE, authToken, 'utf-8');
    }
  } catch {
    // Fallback: generate a random token (won't persist)
    authToken = crypto.randomBytes(32).toString('hex');
  }
  return authToken;
}

/**
 * Validates the authentication token from a request.
 */
function isAuthorized(req) {
  // Allow status endpoint without auth (for health checks)
  if (req.url === '/status' && req.method === 'GET') return true;
  
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${authToken}`) return true;
  
  // Also check query param (for simple clients)
  const url = new URL(req.url, `http://localhost:${DAEMON_PORT}`);
  const queryToken = url.searchParams.get('token');
  if (queryToken === authToken) return true;
  
  return false;
}

// ─── Initialization ───────────────────────────────────────────────────────────

async function startDaemon(options = {}) {
  await core.init({
    endpoint: options.endpoint,
    telemetryEnabled: true
  });

  // Generate auth token
  getOrCreateToken();

  console.log(`+--------------------------------------------+`);
  console.log(`|  SmartLangGuard Daemon v${core.VERSION.padEnd(30)}|`);
  console.log(`|--------------------------------------------|`);

  // Start clipboard monitor
  if (options.monitorClipboard !== false) {
    monitoring = true;
    startClipboardMonitor();
    console.log(`|  + Clipboard monitor: ACTIVE               |`);
  }

  // Start global hotkey listener
  if (options.enableHotkey !== false) {
    try {
      await hotkey.register('Ctrl+Shift+Space', handleHotkey);
      console.log(`|  + Global hotkey: Ctrl+Shift+Space         |`);
    } catch (err) {
      console.log(`|  - Hotkey unavailable: ${err.message.padEnd(22)}|`);
    }
  }

  // Start local HTTP server (for browser extensions)
  startLocalServer();
  const port = httpServer ? DAEMON_PORT : 'FAILED';
  console.log(`|  + Local API: http://localhost:${String(port).padEnd(37)}|`);
  console.log(`|  + Auth token: ${authToken.substring(0, 8)}...${' '.repeat(22)}|`);
  console.log(`+--------------------------------------------+`);
  console.log('');

  // Register auto-start if requested
  if (options.autoStart) {
    await setupAutoStart();
  }

  // Graceful shutdown
  registerShutdown();
  console.log('Press Ctrl+C to stop.\n');
}

function registerShutdown() {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  async function shutdown() {
    console.log('\nShutting down...');
    try {
      await hotkey.unregisterAll();
    } catch {}
    if (clipboardCheckInterval) {
      clearInterval(clipboardCheckInterval);
      clipboardCheckInterval = null;
    }
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
    try { core.shutdown(); } catch {}
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ─── Clipboard Monitor ────────────────────────────────────────────────────────

function startClipboardMonitor() {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
  }
  clipboardCheckInterval = setInterval(async () => {
    try {
      const text = await clipboard.readClipboard();
      if (!text) return;
      
      const hash = crypto.createHash('sha256').update(text).digest('hex');
      if (hash === lastClipboardHash) return;
      lastClipboardHash = hash;
      
      // Only auto-fix if enabled AND text looks like a layout mistake
      if (autoFixClipboard && looksLikeMistake(text)) {
        const result = await core.fixText(text);
        if (result.corrected !== text) {
          await clipboard.writeClipboard(result.corrected);
          showNotification(`✓ Fixed: ${text.substring(0, 30)}... → ${result.corrected.substring(0, 30)}...`);
        }
      }
    } catch (err) {
      // Silently ignore clipboard errors
    }
  }, 1000);
  
  clipboardCheckInterval.unref?.();
}

function looksLikeMistake(text) {
  if (!text || text.length > 200) return false;
  
  // Skip URLs, emails, file paths, code
  const { isFalsePositive } = require('@smartlangguard/core');
  if (isFalsePositive && isFalsePositive(text)) return false;
  
  const hasEnglish = /[a-zA-Z]{3,}/.test(text);
  const onlyArabic = /^[\u0600-\u06FF\s]+$/.test(text);
  const mixed = hasEnglish && /[\u0600-\u06FF]/.test(text);
  if (mixed) return false;
  if (hasEnglish) return true;
  if (onlyArabic) return text.length < 50;
  return false;
}

// ─── Hotkey Handler ───────────────────────────────────────────────────────────

async function handleHotkey() {
  try {
    const text = await clipboard.readClipboard();
    if (!text) {
      showNotification('Clipboard is empty');
      return;
    }

    const result = await core.fixText(text);
    if (result.corrected === text) {
      showNotification('No fix needed');
      return;
    }

    // Copy fixed text back to clipboard
    await clipboard.writeClipboard(result.corrected);
    showNotification(`✓ Fixed → ${result.corrected.substring(0, 50)}`);
  } catch (err) {
    showNotification(`Error: ${err.message}`);
  }
}

// ─── Notifications (Non-blocking Toast) ───────────────────────────────────────

function showNotification(message) {
  const platform = os.platform();
  
  const escaped = message.replace(/'/g, "'\\''").replace(/"/g, '\\"');
  
  switch (platform) {
    case 'darwin':
      execFile('osascript', ['-e', `display notification "${escaped}" with title "SmartLangGuard"`], () => {});
      break;
    case 'win32': {
      // Use non-blocking toast notification instead of modal MessageBox
      const psCode = [
        '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
        '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
        '$xml = "<toast><visual><binding template=\\"ToastGeneric\\"><text>SmartLangGuard</text>',
        `<text>${message.replace(/"/g, '&quot;')}</text>`,
        '</binding></visual></toast>"',
        '$doc = New-Object Windows.Data.Xml.Dom.XmlDocument',
        '$doc.LoadXml($xml)',
        '$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("SmartLangGuard")',
        '$toast = New-Object Windows.UI.Notifications.ToastNotification $doc',
        '$notifier.Show($toast)'
      ].join('; ');
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCode], (err) => {
        // Fallback to BurntToast module or simple console if toast fails
        if (err) {
          console.log(`[Notification] ${message}`);
        }
      });
      break;
    }
    case 'linux':
      execFile('notify-send', ['SmartLangGuard', message, '--icon=dialog-information', '-t', '3000'], () => {});
      break;
    default:
      console.log(`[Notification] ${message}`);
      return;
  }
  console.log(`[Notification] ${message}`);
}

// ─── Local HTTP Server (with Auth) ────────────────────────────────────────────

function startLocalServer() {
  const server = http.createServer(async (req, res) => {
    // CORS: restrict to browser extension origins + localhost
    const origin = req.headers.origin || '';
    const allowedOrigins = [
      'chrome-extension://',
      'moz-extension://',
      'http://localhost',
      'http://127.0.0.1'
    ];
    
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check
    if (!isAuthorized(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized. Send Authorization: Bearer <token> header.' }));
      return;
    }

    // Parse body
    let body = '';
    for await (const chunk of req) body += chunk;
    let data = {};
    if (body) {
      try { data = JSON.parse(body); } catch {}
    }

    // Routes
    if (req.url.startsWith('/fix') && req.method === 'POST') {
      try {
        const result = await core.fixText(data.text || '', data.options || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (req.url.startsWith('/clipboard/fix') && req.method === 'POST') {
      try {
        await handleHotkey();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (req.url.startsWith('/autofix/toggle') && req.method === 'POST') {
      autoFixClipboard = !autoFixClipboard;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ autofix: autoFixClipboard }));
      return;
    }

    if (req.url.startsWith('/whitelist') && req.method === 'POST') {
      const userDict = require('@smartlangguard/core').userDictionary || require('../../core/src/user-dictionary');
      if (data.word) {
        userDict.addToWhitelist(data.word);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, word: data.word }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing "word" in request body' }));
      }
      return;
    }

    if (req.url.startsWith('/dismiss') && req.method === 'POST') {
      const userDict = require('@smartlangguard/core').userDictionary || require('../../core/src/user-dictionary');
      if (data.word) {
        const result = userDict.recordDismissal(data.word);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing "word" in request body' }));
      }
      return;
    }

    if (req.url.startsWith('/status') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: core.VERSION,
        monitoring,
        autofix: autoFixClipboard,
        license: core.getLicenseStatus(),
        authRequired: true
      }));
      return;
    }

    // Token endpoint (for browser extension to get the auth token)
    if (req.url.startsWith('/token') && req.method === 'GET') {
      // Only allow from localhost
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token: authToken }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(DAEMON_PORT, '127.0.0.1');
  httpServer = server;
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('  - Port already in use: daemon already running');
      console.log('  - Use Ctrl+C to stop this instance');
    } else {
      console.error('Server error:', err);
    }
  });
}

// ─── Auto-Start on Login ──────────────────────────────────────────────────────

/**
 * Sets up the daemon to auto-start when the user logs in.
 */
async function setupAutoStart() {
  const platform = os.platform();
  const scriptPath = process.argv[1];
  
  try {
    switch (platform) {
      case 'win32': {
        // Create a .bat file in the Startup folder
        const startupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
        const batContent = `@echo off\nstart "" /min node "${scriptPath}" --no-hotkey`;
        fs.writeFileSync(path.join(startupDir, 'SmartLangGuard.bat'), batContent);
        console.log('|  + Auto-start: ENABLED (Windows Startup)    |');
        break;
      }
      case 'darwin': {
        // Create a LaunchAgent plist
        const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
        if (!fs.existsSync(plistDir)) fs.mkdirSync(plistDir, { recursive: true });
        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.smartlangguard.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${scriptPath}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>`;
        fs.writeFileSync(path.join(plistDir, 'com.smartlangguard.daemon.plist'), plist);
        console.log('|  + Auto-start: ENABLED (LaunchAgent)        |');
        break;
      }
      case 'linux': {
        // Create a systemd user service
        const systemdDir = path.join(os.homedir(), '.config', 'systemd', 'user');
        if (!fs.existsSync(systemdDir)) fs.mkdirSync(systemdDir, { recursive: true });
        const service = `[Unit]
Description=SmartLangGuard Daemon
[Service]
ExecStart=/usr/bin/node ${scriptPath}
Restart=always
[Install]
WantedBy=default.target`;
        fs.writeFileSync(path.join(systemdDir, 'smartlangguard.service'), service);
        console.log('|  + Auto-start: ENABLED (systemd service)    |');
        break;
      }
    }
  } catch (err) {
    console.log(`|  - Auto-start failed: ${err.message.padEnd(20)}|`);
  }
}

/**
 * Removes auto-start configuration.
 */
function removeAutoStart() {
  const platform = os.platform();
  try {
    switch (platform) {
      case 'win32': {
        const startupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
        const batFile = path.join(startupDir, 'SmartLangGuard.bat');
        if (fs.existsSync(batFile)) fs.unlinkSync(batFile);
        break;
      }
      case 'darwin': {
        const plist = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.smartlangguard.daemon.plist');
        if (fs.existsSync(plist)) fs.unlinkSync(plist);
        break;
      }
      case 'linux': {
        const service = path.join(os.homedir(), '.config', 'systemd', 'user', 'smartlangguard.service');
        if (fs.existsSync(service)) fs.unlinkSync(service);
        break;
      }
    }
  } catch {}
}

module.exports = { startDaemon, removeAutoStart, getOrCreateToken };

// ─── Auto-start when run directly ─────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const monitorClipboard = !args.includes('--no-clipboard');
  const enableHotkey = !args.includes('--no-hotkey');
  const autoStart = args.includes('--auto-start');
  const disableAutoStart = args.includes('--disable-auto-start');
  
  if (disableAutoStart) {
    removeAutoStart();
    console.log('Auto-start disabled.');
    process.exit(0);
  }
  
  startDaemon({
    monitorClipboard,
    enableHotkey,
    autoStart,
    endpoint: process.env.SMARTLANGGUARD_API || 'http://localhost:4000'
  }).catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
