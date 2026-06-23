/**
 * Smoke tests for the SmartLangGuard CLI.
 *
 * These tests spawn the actual CLI entry point (bin/smartlangguard.js)
 * as a child process and verify it produces correct output for the
 * core commands: --version, --help, fix (stdin), fix (arg), and detect.
 *
 * We intentionally run the CLI as a subprocess rather than importing
 * the source directly so we exercise the real argv parsing and exit
 * codes that end-users will see.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', 'bin', 'smartlangguard.js');
const PKG = require('../package.json');

function runCli(args = [], opts = {}) {
  return spawnSync(process.execPath, [CLI_BIN, ...args], {
    encoding: 'utf-8',
    timeout: 15000,
    ...opts
  });
}

function pipeStdin(input, args = []) {
  return spawnSync(process.execPath, [CLI_BIN, ...args], {
    input,
    encoding: 'utf-8',
    timeout: 15000
  });
}

describe('CLI entry point', () => {
  test('bin/smartlangguard.js exists and is a Node script', () => {
    expect(fs.existsSync(CLI_BIN)).toBe(true);
    const src = fs.readFileSync(CLI_BIN, 'utf-8');
    expect(src.startsWith('#!')).toBe(true);
  });

  test('--version prints the package version', () => {
    const res = runCli(['--version']);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe(PKG.version);
  });

  test('-V (short flag) also prints the version', () => {
    const res = runCli(['-V']);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe(PKG.version);
  });

  test('--help prints usage information and exits 0', () => {
    const res = runCli(['--help']);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Usage:/);
    expect(res.stdout).toMatch(/fix/);
    expect(res.stdout).toMatch(/interactive/);
    expect(res.stdout).toMatch(/license/);
  });
});

describe('CLI fix command', () => {
  test('fixes "high hofhv;" piped via stdin', () => {
    const res = pipeStdin('high hofhv;', ['fix', '--no-ai']);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe('اهلا اخبارك');
  });

  test('fixes text passed as a positional argument', () => {
    const res = runCli(['fix', 'high', '--no-ai']);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe('اهلا');
  });

  test('--format json returns valid JSON with corrected/direction fields', () => {
    const res = runCli(['fix', 'high', '--no-ai', '--format', 'json']);
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.corrected).toBe('اهلا');
    expect(parsed.direction).toBeTruthy();
    expect(typeof parsed.score).toBe('number');
  });

  test('--format text-with-meta includes direction and confidence', () => {
    const res = runCli(['fix', 'high', '--no-ai', '--format', 'text-with-meta']);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/اهلا/);
    expect(res.stdout).toMatch(/direction:/);
    expect(res.stdout).toMatch(/confidence:/);
  });

  test('respects --direction en-to-ar', () => {
    const res = runCli(['fix', 'high', '--no-ai', '--direction', 'en-to-ar']);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe('اهلا');
  });

  test('exits with error when no input provided and stdin is a TTY', () => {
    // Provide an empty string as input - the CLI should treat this as no input
    const res = pipeStdin('', ['fix', '--no-ai']);
    expect(res.status).not.toBe(0);
  });

  test('--file reads from a file and fixes the contents', () => {
    const tmpFile = path.join(__dirname, 'tmp-input.txt');
    fs.writeFileSync(tmpFile, 'high hofhv;', 'utf-8');
    try {
      const res = runCli(['fix', '--no-ai', '--file', tmpFile]);
      expect(res.status).toBe(0);
      expect(res.stdout.trim()).toBe('اهلا اخبارك');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('--output writes the result to a file', () => {
    const tmpIn = path.join(__dirname, 'tmp-in.txt');
    const tmpOut = path.join(__dirname, 'tmp-out.txt');
    fs.writeFileSync(tmpIn, 'high', 'utf-8');
    try {
      const res = runCli(['fix', '--no-ai', '--file', tmpIn, '--output', tmpOut]);
      expect(res.status).toBe(0);
      expect(fs.readFileSync(tmpOut, 'utf-8').trim()).toBe('اهلا');
    } finally {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    }
  });
});

describe('CLI detect command', () => {
  test('detects mistakes in "high hofhv;" and reports them', () => {
    const res = runCli(['detect', 'high hofhv;']);
    expect(res.status).toBe(0);
    // detect prints either JSON or text. Either way it should mention
    // that at least one mistake was found.
    expect(res.stdout.toLowerCase()).toMatch(/mistake|found|1/);
  });

  test('--format json returns valid JSON for detect', () => {
    const res = runCli(['detect', 'high hofhv;', '--format', 'json']);
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed).toHaveProperty('mistakes_found');
    expect(parsed.mistakes_found).toBeGreaterThan(0);
  });
});
