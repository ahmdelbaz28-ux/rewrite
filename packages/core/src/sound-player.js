/**
 * SmartLangGuard Core - Sound Player
 * 
 * Generates and plays short notification sounds for layout-mistake alerts.
 * All sounds are generated programmatically as WAV data (no external files needed).
 * 
 * Available sounds:
 *   - 'beep'      : short square-wave beep (~150ms)
 *   - 'ding'      : soft sine-wave ding (~300ms)
 *   - 'chime'     : ascending 3-note chime (~500ms)
 *   - 'soft-pop'  : very soft damped pop (~200ms)
 *   - 'click'     : short click (~80ms)
 *   - 'off'       : no sound
 * 
 * Cross-platform playback:
 *   - macOS:    afplay (built-in)
 *   - Linux:    paplay, aplay, or ffplay (in order of preference)
 *   - Windows:  PowerShell with System.Media.SoundPlayer
 * 
 * @module core/sound-player
 */

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');
const crypto = require('crypto');

// ─── WAV Generation ───────────────────────────────────────────────────────────

const SAMPLE_RATE = 22050; // 22.05 kHz - good enough for short tones
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

/**
 * Generates a WAV file buffer from float samples (-1.0 to 1.0).
 */
function floatSamplesToWav(samples) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const fileSize = 44 + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  let offset = 0;
  
  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  
  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;  // PCM format
  buffer.writeUInt16LE(NUM_CHANNELS, offset); offset += 2;
  buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4;
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE / 8, offset); offset += 4;
  buffer.writeUInt16LE(NUM_CHANNELS * BITS_PER_SAMPLE / 8, offset); offset += 2;
  buffer.writeUInt16LE(BITS_PER_SAMPLE, offset); offset += 2;
  
  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  
  // Convert float samples to 16-bit PCM
  for (let i = 0; i < numSamples; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.round(s * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }
  
  return buffer;
}

// ─── Sound Generators ─────────────────────────────────────────────────────────

/**
 * Generates a simple tone with envelope.
 */
function generateTone(freq, durationMs, options = {}) {
  const {
    waveType = 'sine',     // 'sine' | 'square' | 'triangle' | 'sawtooth'
    volume = 0.5,           // 0.0 to 1.0
    attackMs = 5,           // attack time (fade-in)
    releaseMs = 50,         // release time (fade-out)
    decayMs = 0             // decay after attack
  } = options;
  
  const totalSamples = Math.floor(SAMPLE_RATE * durationMs / 1000);
  const attackSamples = Math.floor(SAMPLE_RATE * attackMs / 1000);
  const releaseSamples = Math.floor(SAMPLE_RATE * releaseMs / 1000);
  const samples = new Float32Array(totalSamples);
  
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * freq * t;
    
    let sample;
    switch (waveType) {
      case 'square':
        sample = Math.sin(phase) >= 0 ? 1 : -1;
        break;
      case 'triangle':
        sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case 'sawtooth':
        sample = 2 * ((freq * t) % 1) - 1;
        break;
      case 'sine':
      default:
        sample = Math.sin(phase);
    }
    
    // Apply envelope
    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      envelope = (totalSamples - i) / releaseSamples;
    } else if (decayMs > 0) {
      const decaySamples = Math.floor(SAMPLE_RATE * decayMs / 1000);
      const decayStart = attackSamples;
      if (i < decayStart + decaySamples) {
        const decayProgress = (i - decayStart) / decaySamples;
        envelope = 1 - 0.5 * decayProgress; // decay to 0.5
      } else {
        envelope = 0.5;
      }
    }
    
    samples[i] = sample * envelope * volume;
  }
  
  return samples;
}

/**
 * Mixes two sample arrays (adds them with optional volume).
 */
function mixSamples(a, b, bVolume = 1) {
  const length = Math.max(a.length, b.length);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const sa = i < a.length ? a[i] : 0;
    const sb = i < b.length ? b[i] * bVolume : 0;
    result[i] = Math.max(-1, Math.min(1, sa + sb));
  }
  return result;
}

/**
 * Concatenates two sample arrays (plays them in sequence).
 */
function concatSamples(a, b) {
  const result = new Float32Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

// ─── Predefined Sounds ────────────────────────────────────────────────────────

const SOUNDS = {
  /**
   * Short square-wave beep - very attention-grabbing but slightly harsh.
   */
  beep: () => {
    return generateTone(880, 150, { waveType: 'square', volume: 0.4, attackMs: 2, releaseMs: 30 });
  },
  
  /**
   * Soft sine-wave ding - pleasant, not intrusive.
   */
  ding: () => {
    const fundamental = generateTone(880, 300, { waveType: 'sine', volume: 0.4, attackMs: 5, releaseMs: 200 });
    const overtone = generateTone(1320, 300, { waveType: 'sine', volume: 0.15, attackMs: 5, releaseMs: 200 });
    return mixSamples(fundamental, overtone);
  },
  
  /**
   * Ascending 3-note chime - musical, signals "stop and check".
   */
  chime: () => {
    const note1 = generateTone(523.25, 150, { waveType: 'sine', volume: 0.35, attackMs: 5, releaseMs: 100 }); // C5
    const note2 = generateTone(659.25, 150, { waveType: 'sine', volume: 0.35, attackMs: 5, releaseMs: 100 }); // E5
    const note3 = generateTone(783.99, 200, { waveType: 'sine', volume: 0.35, attackMs: 5, releaseMs: 150 }); // G5
    return concatSamples(concatSamples(note1, note2), note3);
  },
  
  /**
   * Very soft damped pop - least intrusive, good for frequent alerts.
   */
  'soft-pop': () => {
    return generateTone(660, 80, { waveType: 'sine', volume: 0.3, attackMs: 2, releaseMs: 60 });
  },
  
  /**
   * Short click - very subtle, like a keyboard click.
   */
  click: () => {
    return generateTone(2000, 40, { waveType: 'sine', volume: 0.2, attackMs: 1, releaseMs: 30 });
  },
  
  /**
   * Double beep - more urgent, signals "definitely wrong".
   */
  'double-beep': () => {
    const beep1 = generateTone(880, 80, { waveType: 'square', volume: 0.4, attackMs: 2, releaseMs: 30 });
    const gap = new Float32Array(Math.floor(SAMPLE_RATE * 0.05)); // 50ms gap
    const beep2 = generateTone(880, 80, { waveType: 'square', volume: 0.4, attackMs: 2, releaseMs: 30 });
    return concatSamples(concatSamples(beep1, gap), beep2);
  }
};

const SOUND_NAMES = Object.keys(SOUNDS);

// ─── Sound Player ─────────────────────────────────────────────────────────────

class SoundPlayer {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(os.tmpdir(), 'smartlangguard-sounds');
    this.enabled = options.enabled !== false;
    this.volume = options.volume || 1.0; // 0.0 to 1.0
    this.selectedSound = options.sound || 'ding';
    this.cache = new Map(); // soundName -> file path
    
    // Ensure cache dir exists
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (err) {
      // Cache is optional; we can fall back to temp files
    }
  }
  
  /**
   * Pre-generates and caches all sound files.
   */
  async preload() {
    for (const name of SOUND_NAMES) {
      await this._getSoundFile(name);
    }
  }
  
  /**
   * Gets (or generates + caches) the WAV file for a sound.
   */
  async _getSoundFile(name) {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    
    if (!SOUNDS[name]) {
      throw new Error(`Unknown sound: ${name}`);
    }
    
    // Generate the WAV data
    const samples = SOUNDS[name]();
    
    // Apply volume
    if (this.volume !== 1.0) {
      for (let i = 0; i < samples.length; i++) {
        samples[i] *= this.volume;
      }
    }
    
    const wavBuffer = floatSamplesToWav(samples);
    
    // Write to cache file
    const hash = crypto.createHash('sha256').update(wavBuffer).digest('hex').slice(0, 12);
    const filename = `slg-${name}-${hash}.wav`;
    const filepath = path.join(this.cacheDir, filename);
    
    try {
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, wavBuffer);
      }
      this.cache.set(name, filepath);
      return filepath;
    } catch (err) {
      // Fallback: use a temp file
      const tmpFile = path.join(os.tmpdir(), filename);
      fs.writeFileSync(tmpFile, wavBuffer);
      this.cache.set(name, tmpFile);
      return tmpFile;
    }
  }
  
  /**
   * Plays a sound. Returns a promise that resolves when playback starts.
   * 
   * @param {string} [soundName] - sound to play (defaults to selected)
   * @returns {Promise<void>}
   */
  async play(soundName) {
    if (!this.enabled) return;
    
    const name = soundName || this.selectedSound;
    if (name === 'off' || !SOUNDS[name]) return;
    
    const filepath = await this._getSoundFile(name);
    
    return this._playFile(filepath);
  }
  
  /**
   * Plays a WAV file using the OS-native player.
   */
  _playFile(filepath) {
    return new Promise((resolve) => {
      const platform = os.platform();
      let cmd, args;
      
      switch (platform) {
        case 'darwin':
          cmd = 'afplay';
          args = [filepath];
          break;
          
        case 'win32':
          // PowerShell with SoundPlayer
          cmd = 'powershell';
          args = [
            '-NoProfile',
            '-Command',
            `(New-Object Media.SoundPlayer '${filepath}').PlaySync()`
          ];
          break;
          
        case 'linux':
          // Try multiple players
          this._playLinux(filepath, resolve);
          return;
          
        default:
          // Unsupported - silently fail
          resolve();
          return;
      }
      
      const child = execFile(cmd, args, (err) => {
        if (err) {
          // Silently ignore playback errors
        }
        resolve();
      });
      
      // Don't wait for playback to complete - fire and forget
      child.unref();
      // Note: we resolve once in the callback above; do NOT resolve again here
      // as that would make the promise resolve before playback starts on some platforms
    });
  }
  
  /**
   * Linux: try multiple audio players.
   */
  _playLinux(filepath, resolve) {
    const players = [
      { cmd: 'paplay', args: [filepath] },
      { cmd: 'aplay', args: ['-q', filepath] },
      { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', filepath] },
      { cmd: 'play', args: [filepath] } // SoX
    ];
    
    const tryNext = (index) => {
      if (index >= players.length) {
        resolve();
        return;
      }
      
      const { cmd, args } = players[index];
      const child = execFile(cmd, args, (err) => {
        if (err) {
          // Player failed, try next
          tryNext(index + 1);
        }
      });
      child.unref();
      resolve();
    };
    
    tryNext(0);
  }
  
  /**
   * Sets the active sound.
   */
  setSound(name) {
    if (SOUNDS[name] || name === 'off') {
      this.selectedSound = name;
      return true;
    }
    return false;
  }
  
  /**
   * Returns list of available sounds.
   */
  static getAvailableSounds() {
    return [...SOUND_NAMES, 'off'];
  }
  
  /**
   * Generates a preview WAV buffer for a sound (without playing).
   * Useful for browser extensions where the AudioContext API is available.
   */
  static getSoundBuffer(name) {
    if (!SOUNDS[name]) return null;
    const samples = SOUNDS[name]();
    return floatSamplesToWav(samples);
  }
  
  /**
   * Returns the WAV buffer as a base64 string.
   * Useful for embedding in browser extensions.
   */
  static getSoundBase64(name) {
    const buffer = SoundPlayer.getSoundBuffer(name);
    if (!buffer) return null;
    return buffer.toString('base64');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

module.exports = {
  SoundPlayer,
  SOUNDS,
  SOUND_NAMES,
  floatSamplesToWav,
  generateTone,
  mixSamples,
  concatSamples
};
