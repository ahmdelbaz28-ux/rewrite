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

const DAEMON_PORT = 41783; // SLG (S=1? L=?...) - arbitrary local port

let monitoring = false;
let lastClipboardHash = null;
let autoFixClipboard = false;

// ─── Initialization ───────────────────────────────────────────────────────────

async function startDaemon(options = {}) {
  await core.init({
    endpoint: options.endpoint,
    telemetryEnabled: true
  });

  console.log(`╔════════════════════════════════════════════╗`);
  console.log(`║  SmartLangGuard Daemon v${core.VERSION}            ║`);
  console.log(`╠════════════════════════════════════════════╣`);

  // Start clipboard monitor
  if (options.monitorClipboard !== false) {
    monitoring = true;
    startClipboardMonitor();
    console.log(`║  ✓ Clipboard monitor: ACTIVE               ║`);
  }

  // Start global hotkey listener
  if (options.enableHotkey !== false) {
    try {
      await hotkey.register('Ctrl+Shift+Space', handleHotkey);
      console.log(`║  ✓ Global hotkey: Ctrl+Shift+Space         ║`);
    } catch (err) {
      console.log(`║  ✗ Hotkey unavailable: ${err.message.padEnd(22)}║`);
    }
  }

  // Start local HTTP server (for browser extensions)
  startLocalServer();
  console.log(`║  ✓ Local API: http://localhost:${DAEMON_PORT}      ║`);
  console.log(`╚════════════════════════════════════════════╝`);
  console.log(`\nPress Ctrl+C to stop.\n`);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await hotkey.unregisterAll();
    core.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await hotkey.unregisterAll();
    core.shutdown();
    process.exit(0);
  });
}

// ─── Clipboard Monitor ────────────────────────────────────────────────────────

let clipboardCheckInterval;

function startClipboardMonitor() {
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
  // Heuristic: 3+ consecutive English letters, or Arabic-only text shorter than 50 chars
  if (!text || text.length > 200) return false;
  if (!/[a-zA-Z]{3,}/.test(text) && !/^[\u0600-\u06FF\s]+$/.test(text)) return false;
  return true;
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
  const { exec } = require('child_process');
  const platform = require('os').platform();
  
  let cmd;
  switch (platform) {
    case 'darwin':
      cmd = `osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "SmartLangGuard"'`;
      break;
    case 'win32':
      cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', 'SmartLangGuard')"`;
      break;
    case 'linux':
      cmd = `notify-send "SmartLangGuard" "${message.replace(/"/g, '\\"')}"`;
      break;
    default:
      console.log(`[Notification] ${message}`);
      return;
  }
  
  exec(cmd, () => {});
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
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('  ⚠ Daemon already running on this port');
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = { startDaemon };
