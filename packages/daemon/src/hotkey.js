/**
 * Cross-platform global hotkey registration.
 * 
 * Uses native OS APIs:
 *   - macOS: AppleScript via osascript
 *   - Windows: PowerShell with user32.dll RegisterHotKey
 *   - Linux: xdotool / xbindkeys
 * 
 * NOTE: This is a minimal implementation. For production, consider
 * using the `node-global-key-listener` or `iohook` packages.
 */

'use strict';

const { spawn, exec } = require('child_process');
const os = require('os');

let registeredProcesses = [];
let callback = null;

// ─── Hotkey Parsing ───────────────────────────────────────────────────────────

function parseHotkey(combo) {
  // "Ctrl+Shift+Space" → { ctrl, shift, space }
  const parts = combo.toLowerCase().split('+').map(s => s.trim());
  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('win'),
    key: parts.find(p => !['ctrl', 'control', 'shift', 'alt', 'option', 'meta', 'cmd', 'win'].includes(p))
  };
}

// ─── Registration ─────────────────────────────────────────────────────────────

async function register(combo, fn) {
  callback = fn;
  const platform = os.platform();

  switch (platform) {
    case 'darwin':
      return registerMacOS(combo);
    case 'win32':
      return registerWindows(combo);
    case 'linux':
      return registerLinux(combo);
    default:
      throw new Error(`Hotkeys not supported on ${platform}`);
  }
}

// ─── macOS (AppleScript) ──────────────────────────────────────────────────────

async function registerMacOS(combo) {
  const { ctrl, shift, alt, meta, key } = parseHotkey(combo);
  
  // For macOS, we use a Karabiner-style approach or skhd
  // This is a simplified version using a polling loop
  
  const script = `
    tell application "System Events"
      set isPressed to false
      repeat
        if (control down) and (shift down) and (option down is false) then
          set isPressed to true
        else if isPressed then
          set isPressed to false
        end if
        delay 0.05
      end repeat
    end tell
  `;
  
  // NOTE: This is a placeholder. Real implementation requires
  // Accessibility permissions and a proper event tap (CGEventTap).
  // For production, use `node-global-key-listener` package.
  console.log('  → macOS hotkey: requires Accessibility permission');
  console.log('  → Install skhd (brew install skhd) and configure manually');
  console.log('  → Or use the daemon local API on port 41783');
}

// ─── Windows (PowerShell) ─────────────────────────────────────────────────────

async function registerWindows(combo) {
  const { ctrl, shift, alt, key } = parseHotkey(combo);
  
  // Modifiers: MOD_CONTROL=0x0002, MOD_SHIFT=0x0004, MOD_ALT=0x0001
  let modifiers = 0;
  if (ctrl) modifiers |= 0x0002;
  if (shift) modifiers |= 0x0004;
  if (alt) modifiers |= 0x0001;
  
  // VK_SPACE = 0x20
  const vkMap = {
    'space': 0x20, 'enter': 0x0D, 'tab': 0x09, 'esc': 0x1B,
    'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45,
    'f': 0x46, 'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A,
    'k': 0x4B, 'l': 0x4C, 'm': 0x4D, 'n': 0x4E, 'o': 0x4F,
    'p': 0x50, 'q': 0x51, 'r': 0x52, 's': 0x53, 't': 0x54,
    'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58, 'y': 0x59, 'z': 0x5A
  };
  const vk = vkMap[key] || key.toUpperCase().charCodeAt(0);
  
  // Start a PowerShell process that registers the hotkey and writes to stdout
  const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.IO;

public class Hotkey {
  [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
  [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
  [DllImport("user32.dll")] public static extern bool PeekMessage(out MSG msg, IntPtr hWnd, uint filterMin, uint filterMax, uint remove);
  
  [StructLayout(Layout.Sequential)]
  public struct MSG { public IntPtr hWnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int pt_x; public int pt_y; }
  
  public static void Watch() {
    if (!RegisterHotKey(IntPtr.Zero, 1, ${modifiers}, ${vk})) {
      Console.Error.WriteLine("Failed to register hotkey");
      return;
    }
    MSG msg;
    while (true) {
      if (PeekMessage(out msg, IntPtr.Zero, 0x0312, 0x0312, 1)) {
        Console.WriteLine("HOTKEY_PRESSED");
        Console.Out.Flush();
      }
      Thread.Sleep(50);
    }
  }
}
"@
[Hotkey]::Watch()
`;
  
  const child = spawn('powershell', ['-NoProfile', '-Command', psScript], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  child.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('HOTKEY_PRESSED') && callback) {
      callback();
    }
  });
  
  child.stderr.on('data', (data) => {
    console.error('  Hotkey error:', data.toString());
  });
  
  registeredProcesses.push(child);
}

// ─── Linux (xdotool / xbindkeys) ──────────────────────────────────────────────

async function registerLinux(combo) {
  // For Linux, we recommend xbindkeys config file
  // Generate a config snippet
  const configSnippet = `
# SmartLangGuard hotkey
"${process.execPath} ${process.argv[1]} --trigger-hotkey"
  ${combo.replace(/\+/g, ' + ')}
`;
  
  const xbindkeysConfig = require('os').homedir() + '/.xbindkeysrc';
  console.log(`  → Add this to ${xbindkeysConfig}:`);
  console.log(configSnippet);
  console.log('  → Then run: xbindkeys -f ~/.xbindkeysrc');
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function unregisterAll() {
  for (const proc of registeredProcesses) {
    try {
      proc.kill();
    } catch {}
  }
  registeredProcesses = [];
  callback = null;
}

module.exports = {
  register,
  unregisterAll,
  parseHotkey
};
