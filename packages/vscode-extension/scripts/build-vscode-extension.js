#!/usr/bin/env node
/**
 * SmartLangGuard VS Code Extension - Build Script
 *
 * Compiles the TypeScript sources in src/ to out/ and (optionally)
 * packages a .vsix using @vscode/vsce if it is available.
 *
 * This script is intentionally portable - it must NOT contain any
 * absolute paths. Previously the package.json `package` script pointed
 * at /home/z/my-project/scripts/build-vscode-extension.js which only
 * existed on one developer's machine and broke the build for everyone
 * else (and on CI).
 *
 * Usage:
 *   node scripts/build-vscode-extension.js            # compile only
 *   node scripts/build-vscode-extension.js --vsix      # compile + package .vsix
 *
 * @license PROPRIETARY
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const EXT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(EXT_DIR, 'out');

function log(msg) {
  process.stdout.write(`[build-vscode-ext] ${msg}\n`);
}

function fail(msg, err) {
  process.stderr.write(`[build-vscode-ext] ✗ ${msg}\n`);
  if (err && err.stack) {
    process.stderr.write(err.stack + '\n');
  }
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: EXT_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts
  });
  if (result.status !== 0) {
    fail(`${cmd} ${args.join(' ')} exited with status ${result.status}`);
  }
  return result;
}

// ─── Step 1: Compile TypeScript ───────────────────────────────────────────────

function compile() {
  log('Compiling TypeScript (tsc -p ./)...');
  // Prefer the local node_modules/.bin/tsc, fall back to npx.
  const localTsc = path.join(EXT_DIR, 'node_modules', '.bin', 'tsc');
  if (fs.existsSync(localTsc)) {
    run(localTsc, ['-p', './']);
  } else {
    run('npx', ['--yes', 'tsc', '-p', './']);
  }
  if (!fs.existsSync(path.join(OUT_DIR, 'extension.js'))) {
    fail('Compilation finished but out/extension.js was not produced');
  }
  log('✓ TypeScript compiled to out/');
}

// ─── Step 2: Package .vsix (optional, requires --vsix) ────────────────────────

function packageVsix() {
  log('Packaging .vsix with vsce...');
  const localVsce = path.join(EXT_DIR, 'node_modules', '.bin', 'vsce');
  if (fs.existsSync(localVsce)) {
    run(localVsce, ['package', '--no-dependencies', '--allow-star-activation']);
  } else {
    run('npx', ['--yes', '@vscode/vsce', 'package', '--no-dependencies', '--allow-star-activation']);
  }
  log('✓ .vsix package created');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const wantVsix = process.argv.includes('--vsix');

  if (!fs.existsSync(path.join(EXT_DIR, 'package.json'))) {
    fail('No package.json found in extension directory');
  }

  compile();
  if (wantVsix) {
    packageVsix();
  }
  log('Build complete.');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    fail('Unexpected error', err);
  }
}

module.exports = { compile, packageVsix };
