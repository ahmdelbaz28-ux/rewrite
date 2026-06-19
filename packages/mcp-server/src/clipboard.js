/**
 * Cross-platform clipboard access for MCP server.
 * Uses native OS commands (no external deps).
 */

'use strict';

const { exec } = require('child_process');
const os = require('os');

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

async function readClipboard() {
  const platform = os.platform();
  let cmd;
  switch (platform) {
    case 'darwin':
      cmd = 'pbpaste';
      break;
    case 'win32':
      cmd = 'powershell -NoProfile -Command "Get-Clipboard"';
      break;
    case 'linux':
      // Try xclip first, then xsel, then wl-paste (Wayland)
      try {
        return await execAsync('xclip -selection clipboard -o');
      } catch {
        try {
          return await execAsync('xsel --clipboard --output');
        } catch {
          return await execAsync('wl-paste');
        }
      }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
  return execAsync(cmd);
}

async function writeClipboard(text) {
  const platform = os.platform();
  let cmd;
  switch (platform) {
    case 'darwin':
      cmd = `printf %s "${text.replace(/"/g, '\\"')}" | pbcopy`;
      break;
    case 'win32':
      cmd = `powershell -NoProfile -Command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`;
      break;
    case 'linux':
      try {
        cmd = `printf %s "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard`;
      } catch {
        cmd = `printf %s "${text.replace(/"/g, '\\"')}" | wl-copy`;
      }
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
  return execAsync(cmd);
}

module.exports = { readClipboard, writeClipboard };
