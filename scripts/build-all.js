#!/usr/bin/env node
/**
 * Build script: builds all binaries for all platforms.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const CLI_DIR = path.join(ROOT, 'packages', 'cli');
const DIST_DIR = path.join(CLI_DIR, 'dist');

console.log('╔════════════════════════════════════════════╗');
console.log('║   SmartLangGuard Build Pipeline             ║');
console.log('╚════════════════════════════════════════════╝\n');

// 1. Install deps
console.log('📦 Installing dependencies...');
execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
console.log('✓ Dependencies installed\n');

// 2. Run tests
console.log('🧪 Running tests...');
try {
  execSync('npm test --workspace @smartlangguard/core', { cwd: ROOT, stdio: 'inherit' });
  console.log('✓ Tests passed\n');
} catch (err) {
  console.error('✗ Tests failed');
  process.exit(1);
}

// 3. Create dist directory
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 4. Build binaries
const targets = [
  { name: 'win-x64', target: 'node18-win-x64', ext: '.exe' },
  { name: 'macos-x64', target: 'node18-macos-x64', ext: '' },
  { name: 'macos-arm64', target: 'node18-macos-arm64', ext: '' },
  { name: 'linux-x64', target: 'node18-linux-x64', ext: '' },
  { name: 'linux-arm64', target: 'node18-linux-arm64', ext: '' }
];

for (const { name, target, ext } of targets) {
  console.log(`🔨 Building ${name}...`);
  try {
    execSync(`npx @yao-pkg/pkg . --targets ${target} --output dist/smartlangguard-${name}${ext}`, {
      cwd: CLI_DIR,
      stdio: 'inherit'
    });
    console.log(`✓ ${name} built\n`);
  } catch (err) {
    console.error(`✗ Failed to build ${name}: ${err.message}`);
    // Continue with other platforms
  }
}

// 5. Generate checksums
console.log('🔐 Generating SHA256 checksums...');
const checksums = {};
const files = fs.readdirSync(DIST_DIR);
for (const file of files) {
  if (file === 'checksums.sha256') continue;
  const filePath = path.join(DIST_DIR, file);
  if (fs.statSync(filePath).isFile()) {
    const hashCmd = process.platform === 'darwin' ? `shasum -a 256 "${filePath}"` : `sha256sum "${filePath}"`;
    const hash = execSync(hashCmd, { encoding: 'utf8' }).split(' ')[0];
    checksums[file] = hash;
  }
}

const checksumFile = path.join(DIST_DIR, 'checksums.sha256');
let checksumContent = '';
for (const [file, hash] of Object.entries(checksums)) {
  checksumContent += `${hash}  ${file}\n`;
}
fs.writeFileSync(checksumFile, checksumContent);
console.log('✓ Checksums written to dist/checksums.sha256\n');

// 6. Generate manifest
const manifest = {
  version: require(path.join(ROOT, 'package.json')).version,
  files: Object.entries(checksums).map(([file, hash]) => ({
    file,
    sha256: hash,
    url: `https://github.com/ahmdelbaz28-ux/rewrite/releases/download/v${require(path.join(ROOT, 'package.json')).version}/${file}`
  })),
  generated_at: new Date().toISOString()
};

fs.writeFileSync(
  path.join(DIST_DIR, 'latest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('✓ Update manifest written to dist/latest.json\n');

console.log('╔════════════════════════════════════════════╗');
console.log('║   ✓ Build complete!                         ║');
console.log(`║   Output: ${DIST_DIR.padEnd(34)}║`);
console.log('╚════════════════════════════════════════════╝');
