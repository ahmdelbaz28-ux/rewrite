#!/usr/bin/env node
/**
 * Update all package versions to target version
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_VERSION = '0.1.5';
const ROOT = path.resolve(__dirname, '..');

// Update root
const rootPkgPath = path.join(ROOT, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
rootPkg.version = TARGET_VERSION;
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
console.log('Updated root package.json to ' + TARGET_VERSION);

// Update all packages
const packagesDir = path.join(ROOT, 'packages');
const dirs = fs.readdirSync(packagesDir);

for (const dir of dirs) {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = TARGET_VERSION;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('Updated ' + pkg.name + ' to ' + TARGET_VERSION);
  }
}

console.log('\nAll versions set to ' + TARGET_VERSION);
