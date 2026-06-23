/**
 * Compilation smoke test for the SmartLangGuard VS Code extension.
 *
 * Verifies that `tsc -p ./` produces a valid `out/extension.js` bundle
 * and that the compiled module exports the expected `activate` and
 * `deactivate` functions.
 *
 * This test does NOT load VS Code itself - it only checks that the
 * TypeScript compiles cleanly and the resulting CommonJS module has
 * the right shape.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const EXT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(EXT_DIR, 'out');

function findTsc() {
  const local = path.join(EXT_DIR, 'node_modules', '.bin', 'tsc');
  if (fs.existsSync(local)) return local;
  // Fall back to the workspace-root node_modules/.bin/tsc
  const root = path.resolve(EXT_DIR, '..', '..', 'node_modules', '.bin', 'tsc');
  if (fs.existsSync(root)) return root;
  return null;
}

describe('VS Code Extension Compilation', () => {
  beforeAll(() => {
    // Clean any stale build output
    if (fs.existsSync(OUT_DIR)) {
      fs.rmSync(OUT_DIR, { recursive: true, force: true });
    }
  }, 30000);

  test('tsc compiles src/extension.ts without errors', () => {
    const tsc = findTsc();
    expect(tsc).not.toBeNull();

    const result = spawnSync(tsc, ['-p', './'], {
      cwd: EXT_DIR,
      encoding: 'utf-8',
      shell: process.platform === 'win32'
    });

    if (result.status !== 0) {
      console.error('tsc stdout:', result.stdout);
      console.error('tsc stderr:', result.stderr);
    }
    expect(result.status).toBe(0);
  }, 60000);

  test('produces out/extension.js', () => {
    expect(fs.existsSync(path.join(OUT_DIR, 'extension.js'))).toBe(true);
  });

  test('compiled module exports activate and deactivate', () => {
    // VS Code's `vscode` module is not available outside the editor, so
    // we can't fully activate the extension. We can however check that
    // the compiled file at least parses and references the expected
    // exported function names.
    const compiled = fs.readFileSync(path.join(OUT_DIR, 'extension.js'), 'utf-8');
    expect(compiled).toMatch(/exports\.activate/);
    expect(compiled).toMatch(/exports\.deactivate/);
  });

  test('package.json scripts reference portable paths (no /home/z/...)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'package.json'), 'utf-8'));
    const scripts = Object.values(pkg.scripts || {}).join(' ');
    expect(scripts).not.toMatch(/\/home\/[a-z]+\//);
  });

  test('scripts/build-vscode-extension.js exists', () => {
    expect(fs.existsSync(path.join(EXT_DIR, 'scripts', 'build-vscode-extension.js'))).toBe(true);
  });
});
