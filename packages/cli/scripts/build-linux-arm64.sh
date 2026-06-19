#!/usr/bin/env bash
# Build Linux arm64 binary using pkg
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
npx pkg . --targets node18-linux-arm64 --output dist/smartlangguard-linux-arm64
echo "✓ Built dist/smartlangguard-linux-arm64"
ls -lh dist/smartlangguard-linux-arm64
