#!/usr/bin/env bash
# Build Linux arm64 binary using @yao-pkg/pkg (active fork of pkg)
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
npx --yes @yao-pkg/pkg@5.16.1 . --targets node18-linux-arm64 --output dist/smartlangguard-linux-arm64
echo "✓ Built dist/smartlangguard-linux-arm64"
ls -lh dist/smartlangguard-linux-arm64
