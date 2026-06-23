#!/usr/bin/env node
/**
 * Build script for SmartLangGuard VS Code Extension
 * Compiles TypeScript and prepares the extension for packaging
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const EXT_DIR = path.join(ROOT, 'packages', 'vscode-extension');

console.log('Building SmartLangGuard VS Code Extension...');

// Step 1: Compile TypeScript
console.log('  → Compiling TypeScript...');
try {
  execSync('npx tsc -p ./', { cwd: EXT_DIR, stdio: 'inherit' });
  console.log('  ✓ TypeScript compiled successfully');
} catch (err) {
  console.error('  ✗ TypeScript compilation failed');
  process.exit(1);
}

// Step 2: Verify output directory exists
const outDir = path.join(EXT_DIR, 'out');
if (!fs.existsSync(outDir)) {
  console.error('  ✗ Output directory not found after compilation');
  process.exit(1);
}

// Step 3: Copy core module if needed
const corePkg = path.join(ROOT, 'packages', 'core');
if (fs.existsSync(corePkg)) {
  console.log('  → Core package available for extension');
}

console.log('✓ VS Code extension build complete!');
console.log('  Run "vsce package" in packages/vscode-extension/ to create .vsix');
