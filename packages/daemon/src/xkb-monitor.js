/**
 * SmartLangGuard XKB Keyboard Monitor
 * 
 * Monitors X keyboard events on Linux for real-time layout detection.
 * Uses xinput and xkb-switch to detect current layout and potential mistakes.
 * 
 * This is a fallback for when the browser extension is not available,
 * providing system-wide keyboard layout monitoring.
 * 
 * @module daemon/xkb-monitor
 */

'use strict';

const { exec, spawn } = require('child_process');
const EventEmitter = require('events');

class XKBMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.pollInterval = options.pollInterval || 1000;  // Check every 1s
    this.currentLayout = null;
    this.lastLayout = null;
    this.pollTimer = null;
    this.isRunning = false;
    this.isLinux = process.platform === 'linux';
    
    // Layout detection methods (in order of preference)
    this.layoutMethods = [
      { name: 'setxkbmap', cmd: 'setxkbmap -print', parser: this.parseSetxkbmap },
      { name: 'xkb-switch', cmd: 'xkb-switch', parser: this.parseXkbSwitch },
      { name: 'localectl', cmd: 'localectl status', parser: this.parseLocalectl },
    ];
  }

  /**
   * Start monitoring keyboard layout changes
   */
  start() {
    if (!this.isLinux) {
      console.log('[XKBMonitor] Not on Linux, skipping');
      return;
    }
    
    if (this.isRunning) {
      console.log('[XKBMonitor] Already running');
      return;
    }
    
    this.isRunning = true;
    this.pollLayout();
    
    // Poll for layout changes
    this.pollTimer = setInterval(() => {
      this.pollLayout();
    }, this.pollInterval);
    
    console.log('[XKBMonitor] Started monitoring keyboard layout');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    console.log('[XKBMonitor] Stopped');
  }

  /**
   * Poll current keyboard layout
   */
  async pollLayout() {
    const layout = await this.detectLayout();
    
    if (layout && layout !== this.currentLayout) {
      this.lastLayout = this.currentLayout;
      this.currentLayout = layout;
      
      this.emit('layoutchange', {
        current: layout,
        previous: this.lastLayout,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Detect current keyboard layout
   */
  async detectLayout() {
    for (const method of this.layoutMethods) {
      try {
        const layout = await this.runCommand(method.cmd, method.parser);
        if (layout) {
          return layout;
        }
      } catch {
        // Try next method
        continue;
      }
    }
    return null;
  }

  /**
   * Run a command and return parsed result
   */
  runCommand(cmd, parser) {
    return new Promise((resolve) => {
      exec(cmd, { timeout: 2000 }, (error, stdout, stderr) => {
        if (error) {
          resolve(null);
          return;
        }
        try {
          const layout = parser(stdout);
          resolve(layout);
        } catch {
          resolve(null);
        }
      });
    });
  }

  /**
   * Parse setxkbmap output
   */
  parseSetxkbmap(output) {
    // Output looks like: xkb_keymap { xkb_keycodes... };
    const match = output.match(/xkb_keymap\s*\{[^}]*xkb_layouts\s*\{([^}]+)\}/);
    if (match) {
      return match[1].split(',')[0].trim();
    }
    return null;
  }

  /**
   * Parse xkb-switch output
   */
  parseXkbSwitch(output) {
    return output.trim().split('\n')[0] || null;
  }

  /**
   * Parse localectl output
   */
  parseLocalectl(output) {
    // Output looks like:
    // X11 Layout Model    XKB Layout
    //    us            pc105+inet
    //    ar            pc105+inet
    const lines = output.trim().split('\n');
    if (lines.length >= 2) {
      const layoutLine = lines[1].trim();
      const layout = layoutLine.split(/\s+/)[0];
      return layout || null;
    }
    return null;
  }

  /**
   * Check if current layout is Arabic
   */
  isArabicLayout() {
    return this.currentLayout === 'ar';
  }

  /**
   * Get layout info
   */
  getInfo() {
    return {
      current: this.currentLayout,
      previous: this.lastLayout,
      isRunning: this.isRunning,
      isLinux: this.isLinux,
      pollInterval: this.pollInterval
    };
  }
}

// ─── Arabic Keymapper Simulation ────────────────────────────────────────────────

/**
 * Maps English keys to Arabic (QWERTY to Arabic keyboard)
 */
const EN_TO_AR_LAYOUT = {
  // Number row (shift + number)
  '`': 'ذ', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥',
  '6': '٦', '7': '٧', '8': '٨', '9': '٩', '0': '٠', '-': 'ـ',
  '=': '=', 'backspace': 'backspace',
  
  // Top row
  'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ',
  'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح', '[': 'ج', ']': 'د',
  '\\': '\\',
  
  // Middle row
  'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا',
  'j': 'ت', 'k': 'ن', 'l': 'م', ';': 'ك', '\'': 'ط',
  
  // Bottom row
  'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى',
  'm': 'ة', ',': 'و', '.': 'ز', '/': 'ظ',
  
  // Space and special
  ' ': ' ', 'enter': 'enter', 'tab': 'tab', 'shift': 'shift',
  'ctrl': 'ctrl', 'alt': 'alt', 'meta': 'meta'
};

/**
 * Check if a character looks like it might be typed on wrong layout
 */
function looksLikeWrongLayout(typedText, expectedText) {
  // Count how many characters could be wrong-layout mistakes
  let mistakes = 0;
  
  for (let i = 0; i < typedText.length; i++) {
    const typed = typedText[i].toLowerCase();
    const expected = expectedText[i]?.toLowerCase();
    
    if (expected && EN_TO_AR_LAYOUT[typed] !== expected) {
      mistakes++;
    }
  }
  
  // If more than 30% could be mistakes, flag it
  return mistakes / typedText.length > 0.3;
}

/**
 * Detect keyboard layout mismatch
 * Returns true if text appears to be typed on wrong layout
 */
function detectLayoutMismatch(text) {
  // Count potential Arabic characters (if we're seeing English that should be Arabic)
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // If mostly Latin but we see some Arabic, might be wrong layout
  if (latinChars > 3 && arabicChars > 0 && arabicChars < latinChars * 0.3) {
    return true;
  }
  
  // Check for common wrong-layout patterns
  const wrongLayoutPatterns = [
    /sfy/g,    // 'sfy' could be 'اسف' (sorry)
    /hd/g,     // 'hd' could be 'هذا' (this)
    /shm/g,    // 'shm' could be 'شكرا' (thanks)
    /e]k/g,    // 'e]k' could be 'ايك' (to you)
    /vd/g,     // 'vd' could be 'ردي' (my reply)
  ];
  
  for (const pattern of wrongLayoutPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  XKBMonitor,
  EN_TO_AR_LAYOUT,
  looksLikeWrongLayout,
  detectLayoutMismatch
};
