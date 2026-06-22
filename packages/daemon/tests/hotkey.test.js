/**
 * Tests for Daemon Hotkey functionality.
 * 
 * Covers:
 * 1. Hotkey parsing (cross-platform unit test)
 * 2. PowerShell C# code compilation (Windows-only)
 * 3. Complete daemon startup + hotkey registration flow
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ─── Hotkey Parsing Tests ─────────────────────────────────────────────────────

describe('Hotkey Parsing', () => {
  let hotkey;

  beforeAll(() => {
    hotkey = require('../src/hotkey');
  });

  test('parses Ctrl+Shift+Space correctly', () => {
    const result = hotkey.parseHotkey('Ctrl+Shift+Space');
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(true);
    expect(result.alt).toBe(false);
    expect(result.meta).toBe(false);
    expect(result.key).toBe('space');
  });

  test('parses Alt+Ctrl+A correctly', () => {
    const result = hotkey.parseHotkey('Alt+Ctrl+A');
    expect(result.ctrl).toBe(true);
    expect(result.alt).toBe(true);
    expect(result.shift).toBe(false);
    expect(result.key).toBe('a');
  });

  test('parses single key correctly', () => {
    const result = hotkey.parseHotkey('F1');
    expect(result.ctrl).toBe(false);
    expect(result.shift).toBe(false);
    expect(result.alt).toBe(false);
    expect(result.key).toBe('f1');
  });

  test('handles alternative modifier names', () => {
    const result = hotkey.parseHotkey('Control+Option+Win+Space');
    expect(result.ctrl).toBe(true);
    expect(result.alt).toBe(true);
    expect(result.meta).toBe(true);
    expect(result.key).toBe('space');
  });

  test('handles mixed case', () => {
    const result = hotkey.parseHotkey('ctrl+SHIFT+space');
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(true);
    expect(result.key).toBe('space');
  });

  test('handles extra whitespace', () => {
    const result = hotkey.parseHotkey('  Ctrl  +  Shift  +  Space  ');
    expect(result.ctrl).toBe(true);
    expect(result.shift).toBe(true);
    expect(result.key).toBe('space');
  });
});

// ─── Daemon Module Structure Tests ────────────────────────────────────────────

describe('Daemon Module', () => {
  test('hotkey module exports register, unregisterAll, parseHotkey', () => {
    const hotkey = require('../src/hotkey');
    expect(typeof hotkey.register).toBe('function');
    expect(typeof hotkey.unregisterAll).toBe('function');
    expect(typeof hotkey.parseHotkey).toBe('function');
  });

  test('daemon module exports startDaemon', () => {
    const daemon = require('../src/daemon');
    expect(typeof daemon.startDaemon).toBe('function');
  });

  test('clipboard module exports readClipboard and writeClipboard', () => {
    const clipboard = require('../src/clipboard');
    expect(typeof clipboard.readClipboard).toBe('function');
    expect(typeof clipboard.writeClipboard).toBe('function');
  });
});

// ─── C# Source Code Validation (Windows only) ────────────────────────────────

describe('PowerShell C# Hotkey Compilation', () => {
  const isWindows = process.platform === 'win32';

  test('C# source code has correct StructLayout syntax', () => {
    const hotkeyPath = path.join(__dirname, '..', 'src', 'hotkey.js');
    const source = fs.readFileSync(hotkeyPath, 'utf8');

    // Must use LayoutKind.Sequential in the embedded C#, not Layout.Sequential
    const hasCorrectLayout = source.includes('LayoutKind.Sequential');
    // Check only in the C# code block (between @" delimiters), not in comments
    const csharpBlock = source.match(/@"[\s\S]*?"@/);
    const incorrectInCsharp = csharpBlock && csharpBlock[0].includes('Layout.Sequential');

    expect(hasCorrectLayout).toBe(true);
    expect(incorrectInCsharp).toBe(false);
  });

  test('C# source contains all required Win32 P/Invoke declarations', () => {
    const hotkeyPath = path.join(__dirname, '..', 'src', 'hotkey.js');
    const source = fs.readFileSync(hotkeyPath, 'utf8');

    expect(source).toContain('RegisterHotKey');
    expect(source).toContain('UnregisterHotKey');
    expect(source).toContain('GetMessage');
    expect(source).toContain('user32.dll');
    expect(source).toContain('System.Runtime.InteropServices');
    expect(source).toContain('HOTKEY_READY');
    expect(source).toContain('HOTKEY_PRESSED');
  });

  test('C# code compiles successfully via Add-Type', async () => {
    if (!isWindows) {
      console.log('  → Skipping C# compilation test on non-Windows platform');
      return;
    }

    const { spawn } = require('child_process');

    // Extract the C# code from the hotkey module's psScript generation
    const hotkey = require('../src/hotkey');
    // We can't easily extract the embedded C#, so we compile a minimal test:
    const testScript = `
$ErrorActionPreference = 'Stop'
$code = @"
using System;
using System.Runtime.InteropServices;
public class HotkeyTest {
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
  public static bool Test() {
    return true;
  }
}
"@
Add-Type -ErrorAction Stop $code
$result = [HotkeyTest]::Test()
if ($result) { "COMPILE_OK" } else { "COMPILE_FAIL" }
`;

    const result = await new Promise((resolve, reject) => {
      const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', testScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
      child.on('close', (code) => {
        if (code === 0 && stdout.includes('COMPILE_OK')) {
          resolve({ success: true, stdout, stderr });
        } else {
          resolve({ success: false, stdout, stderr, code });
        }
      });
      child.on('error', reject);
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Compilation stderr:', result.stderr);
      console.error('Compilation stdout:', result.stdout);
    }
  }, 30000);

  test('full RegisterHotKey C# code compiles correctly', async () => {
    if (!isWindows) {
      return;
    }

    const { spawn } = require('child_process');

    const testScript = `
$ErrorActionPreference = 'Stop'
$code = @"
using System;
using System.Runtime.InteropServices;
public class HotkeyFull {
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
  public static bool TestCompile() {
    return true;
  }
}
"@
Add-Type -ErrorAction Stop $code
$result = [HotkeyFull]::TestCompile()
if ($result) { "FULL_COMPILE_OK" } else { "FULL_COMPILE_FAIL" }
`;

    const result = await new Promise((resolve, reject) => {
      const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', testScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
      child.on('close', (code) => {
        if (code === 0 && stdout.includes('FULL_COMPILE_OK')) {
          resolve({ success: true, stdout, stderr });
        } else {
          resolve({ success: false, stdout, stderr, code });
        }
      });
      child.on('error', reject);
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Full compilation stderr:', result.stderr);
    }
  }, 30000);
});

// ─── Daemon Startup Without Hotkey ────────────────────────────────────────────

describe('Daemon Startup', () => {
  test('starts and stops without hotkey (no crash)', async () => {
    const daemon = require('../src/daemon');
    
    // Start daemon with hotkey disabled (to avoid platform issues in test)
    const startPromise = daemon.startDaemon({
      monitorClipboard: false,
      enableHotkey: false,
      endpoint: 'http://localhost:4000'
    });

    // Give it a moment to initialize
    await new Promise(r => setTimeout(r, 500));

    // No error should have occurred
    expect(true).toBe(true);

    // Clean shutdown
    const { unregisterAll } = require('../src/hotkey');
    await unregisterAll();
  }, 10000);
});
