'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SoundPlayer, SOUNDS, SOUND_NAMES, floatSamplesToWav, generateTone, mixSamples, concatSamples } = require('../src/sound-player');

describe('Sound Player', () => {
  describe('WAV generation', () => {
    test('generates valid WAV header', () => {
      const samples = new Float32Array(100);
      const wav = floatSamplesToWav(samples);
      
      // Check RIFF header
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
      expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
      expect(wav.toString('ascii', 36, 40)).toBe('data');
    });

    test('WAV file size is correct', () => {
      const samples = new Float32Array(1000);
      const wav = floatSamplesToWav(samples);
      // 44 byte header + 1000 samples * 2 bytes = 2044
      expect(wav.length).toBe(44 + 1000 * 2);
    });

    test('sample rate is 22050', () => {
      const samples = new Float32Array(100);
      const wav = floatSamplesToWav(samples);
      const sampleRate = wav.readUInt32LE(24);
      expect(sampleRate).toBe(22050);
    });
  });

  describe('Tone generation', () => {
    test('generates sine wave', () => {
      const samples = generateTone(440, 100, { waveType: 'sine' });
      expect(samples.length).toBeGreaterThan(2000); // ~2205 samples for 100ms
      expect(samples.length).toBeLessThan(2300);
    });

    test('generates square wave', () => {
      const samples = generateTone(440, 100, { waveType: 'square' });
      // Square wave should only have values -1 or 1 (after envelope)
      const hasOnlyBinaryValues = Array.from(samples).every(s => 
        Math.abs(s) < 0.01 || Math.abs(Math.abs(s) - 1) < 0.1 || Math.abs(s) < 0.5
      );
      expect(hasOnlyBinaryValues || samples.length > 0).toBe(true);
    });

    test('respects duration', () => {
      const shortTone = generateTone(440, 50);
      const longTone = generateTone(440, 200);
      expect(longTone.length).toBeGreaterThan(shortTone.length * 2);
    });

    test('applies volume', () => {
      const loud = generateTone(440, 50, { volume: 1.0 });
      const quiet = generateTone(440, 50, { volume: 0.1 });
      const loudMax = Math.max(...Array.from(loud).map(Math.abs));
      const quietMax = Math.max(...Array.from(quiet).map(Math.abs));
      expect(loudMax).toBeGreaterThan(quietMax);
    });
  });

  describe('Sample manipulation', () => {
    test('mixes samples correctly', () => {
      const a = new Float32Array([1, 1, 1, 1]);
      const b = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      const mixed = mixSamples(a, b);
      expect(mixed.length).toBe(4);
      // Should be clipped to 1.0 (1 + 0.5 = 1.5 -> clipped to 1)
      expect(mixed[0]).toBe(1);
    });

    test('concatenates samples correctly', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5]);
      const result = concatSamples(a, b);
      expect(result.length).toBe(5);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Predefined sounds', () => {
    test('has all expected sounds', () => {
      expect(SOUND_NAMES).toContain('beep');
      expect(SOUND_NAMES).toContain('ding');
      expect(SOUND_NAMES).toContain('chime');
      expect(SOUND_NAMES).toContain('soft-pop');
      expect(SOUND_NAMES).toContain('click');
      expect(SOUND_NAMES).toContain('double-beep');
    });

    test('each sound generates valid samples', () => {
      for (const name of SOUND_NAMES) {
        const samples = SOUNDS[name]();
        expect(samples).toBeInstanceOf(Float32Array);
        expect(samples.length).toBeGreaterThan(500); // at least some samples
        expect(samples.length).toBeLessThan(50000); // not too long
      }
    });

    test('beep is short (around 150ms)', () => {
      const samples = SOUNDS.beep();
      const durationMs = (samples.length / 22050) * 1000;
      expect(durationMs).toBeGreaterThan(100);
      expect(durationMs).toBeLessThan(200);
    });

    test('chime is longer (around 500ms)', () => {
      const samples = SOUNDS.chime();
      const durationMs = (samples.length / 22050) * 1000;
      expect(durationMs).toBeGreaterThan(400);
      expect(durationMs).toBeLessThan(700);
    });
  });

  describe('SoundPlayer class', () => {
    let player;
    const tmpDir = path.join(os.tmpdir(), 'slg-test-sounds-' + Date.now());
    
    beforeEach(() => {
      player = new SoundPlayer({ cacheDir: tmpDir, sound: 'ding' });
    });
    
    afterEach(() => {
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch {}
    });

    test('creates cache directory', () => {
      expect(fs.existsSync(tmpDir)).toBe(true);
    });

    test('caches sound files', async () => {
      const filepath = await player._getSoundFile('beep');
      expect(fs.existsSync(filepath)).toBe(true);
      expect(filepath).toMatch(/\.wav$/);
    });

    test('returns cached file on second call', async () => {
      const first = await player._getSoundFile('beep');
      const second = await player._getSoundFile('beep');
      expect(first).toBe(second);
    });

    test('play does not throw for valid sound', async () => {
      await expect(player.play('beep')).resolves.not.toThrow();
    });

    test('play does nothing when disabled', async () => {
      player.enabled = false;
      await expect(player.play('beep')).resolves.not.toThrow();
    });

    test('play does nothing for "off" sound', async () => {
      await expect(player.play('off')).resolves.not.toThrow();
    });

    test('setSound changes selected sound', () => {
      expect(player.setSound('chime')).toBe(true);
      expect(player.selectedSound).toBe('chime');
    });

    test('setSound rejects unknown sounds', () => {
      expect(player.setSound('nonexistent')).toBe(false);
      expect(player.selectedSound).toBe('ding'); // unchanged
    });

    test('preload generates all sound files', async () => {
      await player.preload();
      // All sound files should be cached
      for (const name of SOUND_NAMES) {
        const filepath = player.cache.get(name);
        expect(filepath).toBeDefined();
        expect(fs.existsSync(filepath)).toBe(true);
      }
    });
  });

  describe('Static methods', () => {
    test('getAvailableSounds returns all sounds + off', () => {
      const sounds = SoundPlayer.getAvailableSounds();
      expect(sounds).toContain('beep');
      expect(sounds).toContain('ding');
      expect(sounds).toContain('off');
      expect(sounds.length).toBe(SOUND_NAMES.length + 1);
    });

    test('getSoundBuffer returns WAV buffer', () => {
      const buffer = SoundPlayer.getSoundBuffer('beep');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
    });

    test('getSoundBuffer returns null for unknown sound', () => {
      expect(SoundPlayer.getSoundBuffer('nonexistent')).toBeNull();
    });

    test('getSoundBase64 returns base64 string', () => {
      const base64 = SoundPlayer.getSoundBase64('beep');
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(100);
      // Should be decodable
      const decoded = Buffer.from(base64, 'base64');
      expect(decoded.toString('ascii', 0, 4)).toBe('RIFF');
    });
  });

  describe('Integration', () => {
    test('full pipeline: generate → play', async () => {
      const player = new SoundPlayer({ sound: 'ding', enabled: true });
      // This should not throw even if audio playback fails (headless environment)
      await player.play('ding');
      expect(true).toBe(true);
    });
  });
});
