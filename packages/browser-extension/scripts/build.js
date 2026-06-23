#!/usr/bin/env node
/**
 * SmartLangGuard Browser Extension - Build Script
 *
 * Copies the extension source tree into dist/ and produces a loadable
 * Chrome MV3 extension folder. No bundler is needed because the extension
 * uses plain ES modules + content scripts that run natively in the browser.
 *
 * Previously, package.json referenced `scripts/build.js` and
 * `scripts/package.js` but neither file existed, which broke
 * `npm run build` and `npm run package` for everyone.
 *
 * Usage:
 *   node scripts/build.js              # build into dist/
 *   node scripts/package.js            # build + zip into dist/*.zip
 *
 * @license PROPRIETARY
 */

'use strict';

const path = require('path');
const fs = require('fs');

const EXT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(EXT_DIR, 'dist');

// Files & directories that must ship inside the extension.
const ASSETS = ['manifest.json', 'icons', 'src'];

// Files that must NOT ship inside the extension.
const EXCLUDE = new Set(['node_modules', 'dist', 'scripts', 'package.json', 'README.md', '.DS_Store']);

function log(msg) {
  process.stdout.write(`[browser-ext build] ${msg}\n`);
}

function fail(msg, err) {
  process.stderr.write(`[browser-ext build] ✗ ${msg}\n`);
  if (err && err.stack) {
    process.stderr.write(err.stack + '\n');
  }
  process.exit(1);
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (EXCLUDE.has(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  if (!fs.existsSync(path.join(EXT_DIR, 'manifest.json'))) {
    fail('manifest.json not found - run this script from the browser-extension package');
  }

  log(`Cleaning ${DIST_DIR}...`);
  rmrf(DIST_DIR);
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const asset of ASSETS) {
    const src = path.join(EXT_DIR, asset);
    if (!fs.existsSync(src)) {
      fail(`Required asset missing: ${asset}`);
    }
    const dest = path.join(DIST_DIR, asset);
    log(`Copying ${asset}...`);
    copyRecursive(src, dest);
  }

  // Sanity check: manifest must be valid JSON.
  try {
    JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'manifest.json'), 'utf-8'));
  } catch (err) {
    fail('dist/manifest.json is not valid JSON', err);
  }

  log(`✓ Built extension into ${path.relative(EXT_DIR, DIST_DIR)}/`);
}

if (require.main === module) {
  try {
    build();
  } catch (err) {
    fail('Unexpected error', err);
  }
}

module.exports = { build, DIST_DIR, EXT_DIR };
