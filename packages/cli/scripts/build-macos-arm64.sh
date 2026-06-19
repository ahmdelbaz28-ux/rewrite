#!/usr/bin/env bash
# Build macOS arm64 binary using @yao-pkg/pkg (active fork of pkg)
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
npx --yes @yao-pkg/pkg@5.16.1 . --targets node18-macos-arm64 --output dist/smartlangguard-macos-arm64
echo "✓ Built dist/smartlangguard-macos-arm64"
ls -lh dist/smartlangguard-macos-arm64
