#!/usr/bin/env bash
# Publish all SmartLangGuard packages to npm
# 
# Usage:
#   ./scripts/publish-npm.sh          # publish all
#   ./scripts/publish-npm.sh core     # publish only core
#   ./scripts/publish-npm.sh cli      # publish only cli
#
# PREREQUISITES:
#   1. npm account created at https://www.npmjs.com
#   2. npm organization 'smartlangguard' created
#   3. Run 'npm login' first
#   4. You must be a member of the 'smartlangguard' org

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}▶${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Check npm login
print_status "Checking npm login..."
if ! npm whoami 2>/dev/null; then
  print_error "Not logged in to npm. Run 'npm login' first."
  exit 1
fi

# Check organization membership
print_status "Checking organization membership..."
if ! npm org ls smartlangguard 2>/dev/null | grep -q "$(npm whoami)"; then
  print_warn "You are not a member of the 'smartlangguard' organization."
  print_warn "Create it at: https://www.npmjs.com/org/create"
  print_warn "Or ask an existing member to invite you."
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Packages to publish (in dependency order)
declare -a PACKAGES=("core" "mcp-server" "daemon" "cli")

# Filter to specific package if argument provided
if [ -n "$1" ]; then
  PACKAGES=("$1")
fi

print_status "Publishing packages: ${PACKAGES[*]}"
echo ""

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="packages/$pkg"
  PKG_NAME=$(node -p "require('./$PKG_DIR/package.json').name")
  PKG_VERSION=$(node -p "require('./$PKG_DIR/package.json').version")
  
  echo ""
  print_status "Publishing $PKG_NAME@$PKG_VERSION..."
  
  # Check if already published
  if npm view "$PKG_NAME@$PKG_VERSION" version 2>/dev/null | grep -q "$PKG_VERSION"; then
    print_warn "$PKG_NAME@$PKG_VERSION already published. Skipping."
    continue
  fi
  
  # Verify package builds correctly
  cd "$PKG_DIR"
  print_status "Running npm pack --dry-run to verify..."
  if ! npm pack --dry-run 2>&1 | grep -q "Tarball Contents"; then
    print_error "Package verification failed for $PKG_NAME"
    exit 1
  fi
  
  # Publish
  print_status "Running npm publish..."
  if npm publish --access public; then
    echo -e "${GREEN}✓ Published $PKG_NAME@$PKG_VERSION${NC}"
  else
    print_error "Failed to publish $PKG_NAME"
    exit 1
  fi
  
  cd "$REPO_ROOT"
done

echo ""
print_status "All packages published successfully!"
echo ""
echo "Verify with:"
echo "  npm view @smartlangguard/core"
echo "  npm view @smartlangguard/cli"
echo "  npm view @smartlangguard/mcp-server"
echo "  npm view @smartlangguard/daemon"
echo ""
echo "Test installation:"
echo "  npm install -g @smartlangguard/cli"
echo "  smartlangguard --version"
