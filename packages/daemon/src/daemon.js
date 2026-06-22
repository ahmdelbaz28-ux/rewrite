/**
 * SmartLangGuard Daemon
 * 
 * Background service that:
 *   - Monitors the system clipboard and auto-corrects on demand
 *   - Listens for a global hotkey (Ctrl+Shift+Space) to trigger a quick-fix popup
 *   - Provides a local HTTP API for browser extensions and other apps
 * 
 * @module daemon
 */

'use strict';

const core = require('@smartlangguard/core');
const clipboard = require('./clipboard');
const hotkey = require('./hotkey');
const http = require('http');
const { execFile } = require('child_process');

const DAEMON_PORT = 41783;

let monitoring = false;
let lastClipboardHash = null;
let autoFixClipboard = false;
let clipboardCheckInterval = null;
let httpServer = null;
let shutdownRegistered = false;

// ─── Initialization ───────────────────────────────────────────────────────────

async function startDaemon(options = {}) {
  await core.init({
    endpoint: options.endpoint,
    telemetryEnabled: true
  });

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
  console.log(`+--------------------------------------------+`);
  console.log('');

  // Graceful shutdown - only register once
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
      
      const hash = require('crypto').createHash('sha256').update(text).digest('hex');
      if (hash === lastClipboardHash) return;
      lastClipboardHash = hash;
      
      // Only auto-fix if enabled AND text looks like a layout mistake
      if (autoFixClipboard && looksLikeMistake(text)) {
        const result = await core.fixText(text);
        if (result.corrected !== text) {
          await clipboard.writeClipboard(result.corrected);
          // Show notification (platform-specific)
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

// ─── Notifications ────────────────────────────────────────────────────────────

function showNotification(message) {
  const platform = require('os').platform();
  
  const escaped = message.replace(/'/g, "'\\''").replace(/"/g, '\\"');
  
  switch (platform) {
    case 'darwin':
      execFile('osascript', ['-e', `display notification "${escaped}" with title "SmartLangGuard"`], () => {});
      break;
    case 'win32': {
      const psCode = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', 'SmartLangGuard')`;
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCode], () => {});
      break;
    }
    case 'linux':
      execFile('notify-send', ['SmartLangGuard', message], () => {});
      break;
    default:
      console.log(`[Notification] ${message}`);
      return;
  }
  console.log(`[Notification] ${message}`);
}

// ─── Local HTTP Server ────────────────────────────────────────────────────────

function startLocalServer() {
  const server = http.createServer(async (req, res) => {
    // CORS for browser extensions
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
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
    if (req.url === '/fix' && req.method === 'POST') {
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

    if (req.url === '/clipboard/fix' && req.method === 'POST') {
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

    if (req.url === '/autofix/toggle' && req.method === 'POST') {
      autoFixClipboard = !autoFixClipboard;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ autofix: autoFixClipboard }));
      return;
    }

    if (req.url === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: core.VERSION,
        monitoring,
        autofix: autoFixClipboard,
        license: core.getLicenseStatus()
      }));
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

module.exports = { startDaemon };

// ─── Auto-start when run directly ─────────────────────────────────────────────

if (require.main === module) {
  // Parse simple CLI args
  const args = process.argv.slice(2);
  const monitorClipboard = !args.includes('--no-clipboard');
  const enableHotkey = !args.includes('--no-hotkey');
  
  startDaemon({
    monitorClipboard,
    enableHotkey,
    endpoint: process.env.SMARTLANGGUARD_API || 'http://localhost:4000'
  }).catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
