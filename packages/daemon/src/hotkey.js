/**
 * Cross-platform global hotkey registration.
 * 
 * Uses native OS APIs:
 *   - Windows: PowerShell with user32.dll RegisterHotKey
 *   - macOS: AppleScript via osascript (requires Accessibility)
 *   - Linux: xbindkeys config generation
 */

'use strict';

const { spawn, exec } = require('child_process');
const os = require('os');

let registeredProcesses = [];
let callback = null;
let state = 'idle'; // idle | registering | ready | error

// ─── Hotkey Parsing ───────────────────────────────────────────────────────────

function parseHotkey(combo) {
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
  state = 'registering';
  const platform = os.platform();

  switch (platform) {
    case 'darwin':
      return registerMacOS(combo);
    case 'win32':
      return registerWindows(combo);
    case 'linux':
      return registerLinux(combo);
    default:
      state = 'error';
      throw new Error(`Hotkeys not supported on ${platform}`);
  }
}

// ─── macOS (AppleScript) ──────────────────────────────────────────────────────

async function registerMacOS(combo) {
  console.log('  → macOS hotkey: requires Accessibility permission');
  console.log('  → Install skhd (brew install skhd) and configure manually');
  console.log('  → Or use the daemon local API on port 41783');
  state = 'error';
  return Promise.resolve();
}

// ─── Windows (PowerShell) ─────────────────────────────────────────────────────

async function registerWindows(combo) {
  const { ctrl, shift, alt, key } = parseHotkey(combo);
  
  // Modifiers: MOD_CONTROL=0x0002, MOD_SHIFT=0x0004, MOD_ALT=0x0001
  let modifiers = 0;
  if (ctrl) modifiers |= 0x0002;
  if (shift) modifiers |= 0x0004;
  if (alt) modifiers |= 0x0001;
  
  // VK (Virtual Key) mapping
  const vkMap = {
    'space': 0x20, 'enter': 0x0D, 'tab': 0x09, 'esc': 0x1B,
    'backspace': 0x08, 'delete': 0x2E, 'insert': 0x2D,
    'home': 0x24, 'end': 0x23, 'pgup': 0x21, 'pgdn': 0x22,
    'up': 0x26, 'down': 0x28, 'left': 0x25, 'right': 0x27,
    '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
    '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
    'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45,
    'f': 0x46, 'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A,
    'k': 0x4B, 'l': 0x4C, 'm': 0x4D, 'n': 0x4E, 'o': 0x4F,
    'p': 0x50, 'q': 0x51, 'r': 0x52, 's': 0x53, 't': 0x54,
    'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58, 'y': 0x59, 'z': 0x5A,
    'f1': 0x70, 'f2': 0x71, 'f3': 0x72, 'f4': 0x73, 'f5': 0x74,
    'f6': 0x75, 'f7': 0x76, 'f8': 0x77, 'f9': 0x78, 'f10': 0x79,
    'f11': 0x7A, 'f12': 0x7B
  };
  const vk = vkMap[key] || key.toUpperCase().charCodeAt(0);
  
  // Windows hooks via RegisterHotKey:
  // The pwsh script is built as a JavaScript template literal.
  // ${modifiers} and ${vk} are JS interpolations replaced BEFORE
  // the string is sent to PowerShell, so the C# code gets the values.
  const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -ErrorAction Stop @"
using System;
using System.Runtime.InteropServices;

public class Hotkey {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
  
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
  
  [DllImport("user32.dll")]
  public static extern int GetMessage(out MSG msg, IntPtr hWnd, uint filterMin, uint filterMax);
  
  [StructLayout(LayoutKind.Sequential)]
  public struct MSG {
    public IntPtr hWnd;
    public uint message;
    public IntPtr wParam;
    public IntPtr lParam;
    public uint time;
    public int pt_x;
    public int pt_y;
  }
  
  public static void Run() {
    if (!RegisterHotKey(IntPtr.Zero, 1, ${modifiers}, ${vk})) {
      int err = Marshal.GetLastWin32Error();
      Console.Error.WriteLine("HOTKEY_ERROR RegisterHotKey failed with error code: " + err);
      return;
    }
    Console.WriteLine("HOTKEY_READY");
    Console.Out.Flush();
    
    MSG msg;
    while (GetMessage(out msg, IntPtr.Zero, 0, 0) != 0) {
      if (msg.message == 0x0312) {
        Console.WriteLine("HOTKEY_PRESSED");
        Console.Out.Flush();
      }
    }
  }
}
"@
try {
  [Hotkey]::Run()
} catch {
  Console.Error.WriteLine("HOTKEY_ERROR " + $_.ToString())
}
`;
  
  return new Promise((resolve, reject) => {
    const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let resolved = false;
    let startupTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        state = 'error';
        reject(new Error('Hotkey registration timed out after 10 seconds'));
      }
    }, 10000);
    
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      
      if (output.includes('HOTKEY_READY') && !resolved) {
        resolved = true;
        clearTimeout(startupTimeout);
        state = 'ready';
        resolve();
      }
      
      if (output.includes('HOTKEY_PRESSED') && callback) {
        callback();
      }
    });
    
    let stderrBuffer = '';
    child.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          if (trimmed.includes('HOTKEY_ERROR')) {
            if (!resolved) {
              resolved = true;
              clearTimeout(startupTimeout);
              state = 'error';
              reject(new Error(trimmed.replace('HOTKEY_ERROR ', '')));
            }
          } else if (trimmed.includes('Add-Type')) {
            // C# compilation error
            if (!resolved) {
              resolved = true;
              clearTimeout(startupTimeout);
              state = 'error';
              reject(new Error('C# compilation error: ' + trimmed));
            }
          } else {
            console.error('  Hotkey stderr:', trimmed);
          }
        }
      }
    });
    
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(startupTimeout);
        state = 'error';
        reject(new Error('Hotkey process error: ' + err.message));
      }
    });
    
    child.on('close', (code) => {
      const idx = registeredProcesses.indexOf(child);
      if (idx !== -1) registeredProcesses.splice(idx, 1);
      if (!resolved) {
        resolved = true;
        clearTimeout(startupTimeout);
        state = 'error';
        reject(new Error('Hotkey process exited unexpectedly with code ' + code));
      }
    });
    
    child.unref();
    registeredProcesses.push(child);
  });
}

// ─── Linux (xdotool / xbindkeys) ──────────────────────────────────────────────

async function registerLinux(combo) {
  const configSnippet = `
# SmartLangGuard hotkey
"${process.execPath} ${process.argv[1]} --trigger-hotkey"
  ${combo.replace(/\+/g, ' + ')}
`;
  
  const xbindkeysConfig = require('os').homedir() + '/.xbindkeysrc';
  console.log(`  → Add this to ${xbindkeysConfig}:`);
  console.log(configSnippet);
  console.log('  → Then run: xbindkeys -f ~/.xbindkeysrc');
  state = 'error';
  return Promise.resolve();
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
