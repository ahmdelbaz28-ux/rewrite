#!/usr/bin/env node
/**
 * Release script: tags the current version, creates a GitHub release,
 * and uploads the built binaries.
 * 
 * Usage: node scripts/release.js [patch|minor|major]
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const bumpType = process.argv[2] || 'patch';
const branch = process.argv[3] || 'gh-pages';

// 1. Bump version
console.log(`📌 Bumping ${bumpType} version...`);
execSync(`npm version ${bumpType} --no-git-tag-version`, { cwd: ROOT, stdio: 'inherit' });
const version = require(path.join(ROOT, 'package.json')).version;
console.log(`✓ Version: ${version}\n`);

// 2. Update all package versions
console.log('📦 Updating package versions...');
const packagesDir = path.join(ROOT, 'packages');
for (const pkg of fs.readdirSync(packagesDir)) {
  const pkgJsonPath = path.join(packagesDir, pkg, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    pkgJson.version = version;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
    console.log(`  ✓ ${pkgJson.name}`);
  }
}

// 3. Build
console.log('\n🔨 Building...');
execSync('node scripts/build-all.js', { cwd: ROOT, stdio: 'inherit' });

// 4. Commit and tag
console.log('\n📝 Committing release...');
execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
execSync(`git commit -m "release: v${version}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`git tag v${version}`, { cwd: ROOT, stdio: 'inherit' });

// 5. Push
console.log('\n🚀 Pushing...');
execSync('git push origin ' + branch, { cwd: ROOT, stdio: 'inherit' });
execSync(`git push origin v${version}`, { cwd: ROOT, stdio: 'inherit' });

// 6. Create GitHub release (requires gh CLI)
console.log('\n📦 Creating GitHub release...');
try {
  // Include windows-hook binary if it exists
  const distDir = path.join(ROOT, 'packages', 'cli', 'dist');
  const files = fs.readdirSync(distDir)
    .filter(f => !f.endsWith('.json') && !f.endsWith('.sha256'))
    .map(f => path.join(distDir, f));
  
  // Also include windows-hook binary
  const hookExe = path.join(ROOT, 'packages', 'windows-hook', 'KeyHook', 'bin', 'Release', 'net8.0', 'SmartLangGuard.KeyHook.exe');
  if (fs.existsSync(hookExe)) {
    files.push(hookExe);
  }
  
  // Extract release notes from CHANGELOG.md for the current version
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  let releaseNotes = '';
  if (fs.existsSync(changelogPath)) {
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    const versionHeader = `## [${version}]`;
    const startIdx = changelog.indexOf(versionHeader);
    if (startIdx !== -1) {
      const afterHeader = changelog.slice(startIdx + versionHeader.length);
      const endIdx = afterHeader.search(/^## \[.*\]/m);
      if (endIdx !== -1) {
        releaseNotes = afterHeader.slice(0, endIdx).trim();
      } else {
        releaseNotes = afterHeader.trim();
      }
    }
  }
  // Append demo video placeholder
  const demoVideoUrl = 'https://www.youtube.com/watch?v=YOUR_DEMO_VIDEO_ID';
  releaseNotes = `## Release ${version}\n\n` + releaseNotes + `\n\nDemo video: ${demoVideoUrl}`;
  // Write notes to a temporary file for gh CLI
  const notesFile = path.join(ROOT, 'release-notes.tmp.md');
  fs.writeFileSync(notesFile, releaseNotes);

  execSync(
    `gh release create v${version} ${files.join(' ')} ` +
    `--title "v${version}" ` +
    `--notes-file "${notesFile}"`,
    { cwd: ROOT, stdio: 'inherit' }
  );
  console.log('✓ Release created');
  // Cleanup temporary notes file
  try { fs.unlinkSync(notesFile); } catch (_) {}
} catch (err) {
  console.error('⚠ Failed to create GitHub release. Install gh CLI and authenticate.');
  console.error('  Then run: gh release create v' + version);
}

console.log(`\n✅ Release v${version} complete!`);
