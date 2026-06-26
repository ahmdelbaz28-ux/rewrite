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
const { XKBMonitor, detectLayoutMismatch } = require('./xkb-monitor');
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

// Windows keyboard hook process
let keyboardHookProcess = null;

// Linux XKB monitor
let xkbMonitor = null;

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
  // Start OS-level keyboard hook (Windows/Linux, real-time typing monitor)
  if (options.enableTypingMonitor) {
    if (os.platform() === 'win32') {
      await startKeyboardHook();
    } else if (os.platform() === 'linux') {
      await startXkbMonitor();
    }
  }

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

  async function shutdown(signal) {
    console.log(`\nShutting down from ${signal}...`);
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
    // Stop keyboard hook if running
    stopKeyboardHook();
    stopXkbMonitor();
    try { core.shutdown(); } catch {}
    // Only exit if triggered by signal (not when called programmatically)
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      process.exit(0);
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
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
      // Sanitize message to prevent PowerShell/XML injection
      const safeMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const psCode = [
        '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
        '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
        '$xml = "<toast><visual><binding template=\\"ToastGeneric\\"><text>SmartLangGuard</text>',
        `<text>${safeMsg}</text>`,
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
    const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit
    let bodySize = 0;
    for await (const chunk of req) {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        return;
      }
      body += chunk;
    }
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

    // Hook toggle endpoint (for tray app)
    if (req.url.startsWith('/hook/toggle') && req.method === 'POST') {
      if (os.platform() !== 'win32') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Keyboard hook is only supported on Windows' }));
        return;
      }

      const hookStatus = getKeyboardHookStatus();
      if (hookStatus.running) {
        stopKeyboardHook();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ running: false, message: 'Keyboard hook stopped' }));
      } else {
        if (!hookStatus.built) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Keyboard hook executable not found. Build with: cd packages/windows-hook && npm run build' }));
          return;
        }
        await startKeyboardHook();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ running: true, message: 'Keyboard hook started' }));
      }
      return;
    }

    if (req.url.startsWith('/status') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: core.VERSION,
        monitoring,
        autofix: autoFixClipboard,
        keyboardHook: getKeyboardHookStatus(),
        license: core.getLicenseStatus(),
        authRequired: true
      }));
      return;
    }

    // Token endpoint (for browser extension to get the auth token)
    if (req.url.startsWith('/token') && req.method === 'GET') {
      // Only allow from localhost - verify remote address
      const remoteAddr = req.socket.remoteAddress;
      if (remoteAddr !== '127.0.0.1' && remoteAddr !== '::1' && remoteAddr !== '::ffff:127.0.0.1') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: token endpoint only accessible from localhost' }));
        return;
      }
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

// ─── Windows Keyboard Hook Integration (Real-Time Typing Monitor) ────────────

/**
 * Paths to check for the keyboard hook executable.
 */
function getKeyboardHookPaths() {
  const possiblePaths = [
    // Development path (when running from source via npm workspaces)
    path.join(__dirname, '..', '..', 'windows-hook', 'dist', 'SmartLangGuard.KeyHook.exe'),
    // Development path (unbuilt source)
    path.join(__dirname, '..', '..', 'windows-hook', 'KeyHook', 'bin', 'Release', 'net8.0', 'SmartLangGuard.KeyHook.exe'),
    // Production path (when installed via npm in node_modules)
    path.join(__dirname, '..', '..', '@smartlangguard', 'windows-hook', 'dist', 'SmartLangGuard.KeyHook.exe'),
  ];
  
  // Try resolve from the windows-hook package directly (wrapped in try/catch for safety)
  try {
    const pkgJson = require.resolve('@smartlangguard/windows-hook/package.json');
    possiblePaths.push(path.join(path.dirname(pkgJson), 'dist', 'SmartLangGuard.KeyHook.exe'));
  } catch {
    // Package not installed - that's ok, we'll try the other paths
  }

  return possiblePaths;
}

/**
 * Finds the keyboard hook executable on the system.
 */
function findKeyboardHook() {
  // Try named paths first
  for (const p of getKeyboardHookPaths()) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Starts the Windows keyboard hook process.
 * This uses WH_KEYBOARD_LL to intercept keystrokes globally.
 * Only works on Windows.
 */
function startKeyboardHook() {
  return new Promise((resolve) => {
    if (keyboardHookProcess) {
      console.log('|  + Keyboard hook already running' + ' '.repeat(30) + '|');
      resolve();
      return;
    }

    const hookExe = findKeyboardHook();
    if (!hookExe) {
      console.log('|  - Keyboard hook: executable not found. Build with:' + ' '.repeat(7) + '|');
      console.log('|    cd packages/windows-hook && npm run build' + ' '.repeat(17) + '|');
      resolve();
      return;
    }

    try {
      const child = require('child_process').spawn(hookExe, [
        '--daemon-url', `http://localhost:${DAEMON_PORT}`,
        '--verbose'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: false
      });

      child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) process.stdout.write(`  [hook] ${output}\n`);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) process.stderr.write(`  [hook:err] ${output}\n`);
      });

      child.on('error', (err) => {
        console.log(`|  - Keyboard hook failed: ${err.message.padEnd(20)}|`);
        keyboardHookProcess = null;
        resolve();
      });

      child.on('close', (code) => {
        if (keyboardHookProcess === child) {
          keyboardHookProcess = null;
          console.log('|  - Keyboard hook stopped' + ' '.repeat(32) + '|');
        }
      });

      keyboardHookProcess = child;
      console.log('|  + Keyboard hook: ACTIVE (real-time)' + ' '.repeat(17) + '|');
      resolve();
    } catch (err) {
      console.log(`|  - Keyboard hook error: ${err.message.padEnd(18)}|`);
      keyboardHookProcess = null;
      resolve();
    }
  });
}

/**
 * Stops the Windows keyboard hook process.
 */
function stopKeyboardHook() {
  if (keyboardHookProcess) {
    try {
      keyboardHookProcess.kill();
    } catch {}
    keyboardHookProcess = null;
    console.log('  Keyboard hook stopped.');
  }
}

/**
 * Returns the status of the keyboard hook.
 */
function getKeyboardHookStatus() {
  if (os.platform() !== 'win32') return { supported: false, reason: 'Windows only' };
  const exe = findKeyboardHook();
  return {
    supported: true,
    built: exe !== null,
    running: keyboardHookProcess !== null && !keyboardHookProcess.killed
  };
}

// ─── Linux XKB Monitor ─────────────────────────────────────────────────────────

/**
 * Starts the Linux XKB keyboard layout monitor.
 */
async function startXkbMonitor() {
  if (xkbMonitor) {
    console.log('|  + XKB monitor already running' + ' '.repeat(30) + '|');
    return;
  }

  if (os.platform() !== 'linux') {
    console.log('|  - XKB monitor: Linux only' + ' '.repeat(33) + '|');
    return;
  }

  try {
    xkbMonitor = new XKBMonitor({ pollInterval: 1000 });

    xkbMonitor.on('layoutchange', (info) => {
      console.log(`  [XKB] Layout changed: ${info.previous} -> ${info.current}`);
      
      // Emit event for other parts of the daemon to use
      if (httpServer) {
        broadcastEvent('layoutchange', info);
      }
    });

    xkbMonitor.start();
    console.log('|  + XKB monitor: ACTIVE (real-time)' + ' '.repeat(23) + '|');
  } catch (err) {
    console.log(`|  - XKB monitor error: ${err.message.padEnd(28)}|`);
    xkbMonitor = null;
  }
}

/**
 * Stops the Linux XKB monitor.
 */
function stopXkbMonitor() {
  if (xkbMonitor) {
    xkbMonitor.stop();
    xkbMonitor = null;
    console.log('  XKB monitor stopped.');
  }
}

/**
 * Returns the status of the XKB monitor.
 */
function getXkbMonitorStatus() {
  if (os.platform() !== 'linux') return { supported: false, reason: 'Linux only' };
  return {
    supported: true,
    running: xkbMonitor !== null && xkbMonitor.isRunning,
    currentLayout: xkbMonitor?.currentLayout || null
  };
}

/**
 * Broadcasts an event to all connected HTTP clients.
 */
const connectedClients = new Set();

function broadcastEvent(event, data) {
  const message = JSON.stringify({ event, data, timestamp: Date.now() });
  for (const client of connectedClients) {
    try {
      client.write(`data: ${message}\n\n`);
    } catch {
      connectedClients.delete(client);
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Stops the daemon gracefully
 */
async function stopDaemon() {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
    clipboardCheckInterval = null;
  }
  monitoring = false;
  try {
    await hotkey.unregisterAll();
  } catch {}
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  stopKeyboardHook();
  stopXkbMonitor();
  try { core.shutdown(); } catch {}
}

module.exports = { 
  startDaemon, 
  stopDaemon,
  removeAutoStart, 
  getOrCreateToken, 
  startKeyboardHook, 
  stopKeyboardHook, 
  getKeyboardHookStatus,
  startXkbMonitor,
  stopXkbMonitor,
  getXkbMonitorStatus,
  connectedClients
};

// ─── Auto-start when run directly ─────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const monitorClipboard = !args.includes('--no-clipboard');
  const enableHotkey = !args.includes('--no-hotkey');
  const enableTypingMonitor = args.includes('--enable-typing-monitor');
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
    enableTypingMonitor,
    autoStart,
    endpoint: process.env.SMARTLANGGUARD_API || 'http://localhost:4000'
  }).catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
