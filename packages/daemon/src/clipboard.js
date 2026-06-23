/**
 * Cross-platform clipboard access.
 * Uses stdin piping to prevent command injection.
 */

'use strict';

const { spawn } = require('child_process');
const os = require('os');

function spawnAsync(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timeout = setTimeout(() => {
      killed = true;
      child.kill();
      reject(new Error(`Process timed out: ${cmd} ${args.join(' ')}`));
    }, 30000);
    child.stdin.on('error', () => {});
    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (killed) return;
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Process exited with code ${code}`));
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      if (killed) return;
      reject(err);
    });
  });
}

async function readClipboard() {
  const platform = os.platform();
  switch (platform) {
    case 'darwin':
      return spawnAsync('pbpaste', []);
    case 'win32':
      return spawnAsync('powershell', ['-NoProfile', '-Command', 'Get-Clipboard']);
    case 'linux':
      try { return await spawnAsync('xclip', ['-selection', 'clipboard', '-o']); }
      catch {
        try { return await spawnAsync('xsel', ['--clipboard', '--output']); }
        catch { return spawnAsync('wl-paste', []); }
      }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function writeClipboard(text) {
  const platform = os.platform();
  switch (platform) {
    case 'darwin':
      return spawnAsync('pbcopy', [], text);
    case 'win32':
      return spawnAsync('powershell', ['-NoProfile', '-Command', '$input | Set-Clipboard'], text);
    case 'linux':
      try { return spawnAsync('xclip', ['-selection', 'clipboard'], text); }
      catch { return spawnAsync('xsel', ['--clipboard', '--input'], text); }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

module.exports = { readClipboard, writeClipboard };
