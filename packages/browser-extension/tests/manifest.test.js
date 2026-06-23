/**
 * Smoke tests for the SmartLangGuard browser extension manifest.
 *
 * Verifies the manifest is valid MV3 and that the build script can
 * copy the extension tree into dist/ without losing any files.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const EXT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(EXT_DIR, 'manifest.json');

describe('Browser Extension Manifest', () => {
  let manifest;

  beforeAll(() => {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  });

  test('is Manifest V3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  test('has a non-empty name and description', () => {
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(typeof manifest.description).toBe('string');
    expect(manifest.description.length).toBeGreaterThan(0);
  });

  test('has a semver-style version', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('declares a service worker background script', () => {
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toMatch(/background\.js$/);
  });

  test('declares at least one content script', () => {
    expect(Array.isArray(manifest.content_scripts)).toBe(true);
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
  });

  test('declares an action popup', () => {
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_popup).toMatch(/popup\.html$/);
  });

  test('declares required icons', () => {
    expect(manifest.icons).toBeDefined();
    for (const size of ['16', '32', '48', '128']) {
      expect(manifest.icons[size]).toBeTruthy();
    }
  });

  test('requests only safe permissions', () => {
    const forbidden = ['<all_urls>', 'tabs', 'webRequest', 'webRequestBlocking'];
    const perms = manifest.permissions || [];
    for (const bad of forbidden) {
      expect(perms).not.toContain(bad);
    }
  });
});

describe('Browser Extension Build Script', () => {
  test('scripts/build.js and scripts/package.js exist', () => {
    expect(fs.existsSync(path.join(EXT_DIR, 'scripts', 'build.js'))).toBe(true);
    expect(fs.existsSync(path.join(EXT_DIR, 'scripts', 'package.js'))).toBe(true);
  });

  test('can build dist/ folder with all expected assets', () => {
    // eslint-disable-next-line global-require
    const { build, DIST_DIR } = require('../scripts/build');
    build();

    expect(fs.existsSync(path.join(DIST_DIR, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'src', 'background.js'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'src', 'content.js'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'src', 'popup.html'))).toBe(true);
    expect(fs.existsSync(path.join(DIST_DIR, 'icons', 'icon-128.png'))).toBe(true);

    // dist/manifest.json should still be valid JSON
    expect(() => JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'manifest.json'), 'utf-8'))).not.toThrow();
  });

  test('can package dist/ into a .zip', () => {
    // eslint-disable-next-line global-require
    const { packageZip } = require('../scripts/package');
    packageZip();

    const distDir = path.join(EXT_DIR, 'dist');
    const zips = fs.readdirSync(distDir).filter(f => f.endsWith('.zip'));
    expect(zips.length).toBe(1);
    expect(zips[0]).toMatch(/^smartlangguard-v\d+\.\d+\.\d+\.zip$/);

    const stat = fs.statSync(path.join(distDir, zips[0]));
    expect(stat.size).toBeGreaterThan(1024); // at least 1KB
  });
});
