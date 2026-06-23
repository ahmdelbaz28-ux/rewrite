/**
 * Build smoke test for the SmartLangGuard admin dashboard.
 *
 * Verifies that `vite build` produces a deployable dist/ directory
 * with the expected assets. We don't run the full React testing
 * library setup here because that would require jsdom + additional
 * dependencies - we just want to catch build regressions.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const PKG_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PKG_DIR, 'dist');

function findVite() {
  const local = path.join(PKG_DIR, 'node_modules', '.bin', 'vite');
  if (fs.existsSync(local)) return local;
  const root = path.resolve(PKG_DIR, '..', '..', 'node_modules', '.bin', 'vite');
  if (fs.existsSync(root)) return root;
  return null;
}

function findViteConfig() {
  // Vite config can be vite.config.js, vite.config.ts, vite.config.mjs
  for (const ext of ['js', 'ts', 'mjs']) {
    const p = path.join(PKG_DIR, `vite.config.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

describe('Admin Dashboard Build', () => {
  beforeAll(() => {
    if (fs.existsSync(DIST_DIR)) {
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
  });

  test('vite is installed (locally or at workspace root)', () => {
    expect(findVite()).not.toBeNull();
  });

  test('vite.config.{js,ts,mjs} exists', () => {
    expect(findViteConfig()).not.toBeNull();
  });

  test('all source pages exist', () => {
    const required = ['App.jsx', 'main.jsx', 'index.css', 'index.html'];
    for (const file of required) {
      expect(fs.existsSync(path.join(PKG_DIR, 'src', file)) || fs.existsSync(path.join(PKG_DIR, file))).toBe(true);
    }
  });

  test('all page components exist', () => {
    const pages = ['Dashboard.jsx', 'Licenses.jsx', 'Login.jsx', 'Settings.jsx', 'Telemetry.jsx', 'Billing.jsx'];
    for (const page of pages) {
      expect(fs.existsSync(path.join(PKG_DIR, 'src', 'pages', page))).toBe(true);
    }
  });

  test('API client and auth modules exist', () => {
    expect(fs.existsSync(path.join(PKG_DIR, 'src', 'api', 'client.js'))).toBe(true);
    expect(fs.existsSync(path.join(PKG_DIR, 'src', 'api', 'auth.jsx'))).toBe(true);
  });

  test('vite build produces dist/index.html', () => {
    const vite = findVite();
    const result = spawnSync(vite, ['build', '--logLevel', 'error'], {
      cwd: PKG_DIR,
      encoding: 'utf-8',
      timeout: 120000,
      shell: true
    });

    if (result.status !== 0) {
      console.error('vite stdout:', result.stdout);
      console.error('vite stderr:', result.stderr);
    }
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(DIST_DIR, 'index.html'))).toBe(true);
  }, 180000);

  test('vite build produces hashed JS bundle in dist/assets/', () => {
    const assetsDir = path.join(DIST_DIR, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);
    const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
    // Hashed bundle should match index-*.js
    expect(jsFiles.some(f => /^index-[^.]+\.js$/.test(f))).toBe(true);
  });

  test('vite build produces hashed CSS bundle in dist/assets/', () => {
    const assetsDir = path.join(DIST_DIR, 'assets');
    const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  test('dist/index.html references the hashed JS bundle', () => {
    const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
    expect(html).toMatch(/<script[^>]+src="\/assets\/index-[^"]+\.js"/);
  });
});
