#!/usr/bin/env node
/**
 * SmartLangGuard Browser Extension - Packaging Script
 *
 * Runs `build.js` first, then zips the dist/ folder into a
 * `.zip` archive ready to upload to the Chrome Web Store.
 *
 * Uses Node's built-in zlib + a minimal store-only zip writer so we
 * don't pull in a third-party zip dependency just to package a few
 * small files.
 *
 * Usage:
 *   node scripts/package.js
 *
 * @license PROPRIETARY
 */

'use strict';

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const { build, DIST_DIR, EXT_DIR } = require('./build');

function log(msg) {
  process.stdout.write(`[browser-ext package] ${msg}\n`);
}

function fail(msg, err) {
  process.stderr.write(`[browser-ext package] ✗ ${msg}\n`);
  if (err && err.stack) {
    process.stderr.write(err.stack + '\n');
  }
  process.exit(1);
}

// ─── Minimal ZIP writer (store + deflate) ─────────────────────────────────────
// CRC32 table
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date) {
  return (
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() / 2) & 0x1f)
  );
}

function dosDate(date) {
  return (
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f)
  );
}

function writeZip(files) {
  // files: [{ name, data: Buffer }]
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf-8');
    const compressed = zlib.deflateRawSync(file.data);
    const crc = crc32(file.data);
    const useDeflate = compressed.length < file.data.length;
    const stored = useDeflate ? compressed : file.data;
    const method = useDeflate ? 8 : 0;
    const now = new Date();

    // Local file header
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime(now), 10);
    localHeader.writeUInt16LE(dosDate(now), 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(stored.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra

    localParts.push(localHeader, nameBuf, stored);

    // Central directory record
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime(now), 12);
    centralHeader.writeUInt16LE(dosDate(now), 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(stored.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + stored.length;
  }

  const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
  const centralOffset = offset;

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function walkDir(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...walkDir(path.join(dir, entry.name), rel));
    } else {
      out.push({ name: rel, data: fs.readFileSync(path.join(dir, entry.name)) });
    }
  }
  return out;
}

function packageZip() {
  // 1. Build first
  build();

  // 2. Collect all files in dist/
  if (!fs.existsSync(DIST_DIR)) {
    fail('dist/ does not exist after build');
  }
  const files = walkDir(DIST_DIR);
  if (files.length === 0) {
    fail('No files found in dist/ to package');
  }

  // 3. Write the .zip
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST_DIR, 'manifest.json'), 'utf-8'));
  const zipName = `smartlangguard-v${manifest.version}.zip`;
  const zipPath = path.join(EXT_DIR, 'dist', zipName);
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.writeFileSync(zipPath, writeZip(files));

  log(`✓ Packaged ${files.length} files into dist/${zipName}`);
  log(`  Upload this file to the Chrome Web Store Developer Dashboard.`);
}

if (require.main === module) {
  try {
    packageZip();
  } catch (err) {
    fail('Unexpected error', err);
  }
}

module.exports = { packageZip };
