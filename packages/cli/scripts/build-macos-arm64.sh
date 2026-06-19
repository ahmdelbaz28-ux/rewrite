#!/usr/bin/env bash
# Build macOS arm64 binary using pkg
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
npx pkg . --targets node18-macos-arm64 --output dist/smartlangguard-macos-arm64
echo "✓ Built dist/smartlangguard-macos-arm64"
ls -lh dist/smartlangguard-macos-arm64
