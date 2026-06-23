# 📤 SmartLangGuard - npm Publishing Guide

This guide walks you through publishing all SmartLangGuard packages to npm.

**Estimated time:** 15-20 minutes (one-time setup), then 2 minutes per release.

---

## ✅ Prerequisites

### 1. Create npm account

1. Go to https://www.npmjs.com/signup
2. Create account with your email
3. Verify email

### 2. Create npm organization `smartlangguard`

1. Go to https://www.npmjs.com/org/create
2. Organization name: **`smartlangguard`** (must be exactly this)
3. Plan: **Free** (unlimited public packages for scoped orgs)
4. Click **Create organization**

> ⚠️ The organization name MUST be `smartlangguard` because all packages use the `@smartlangguard/*` scope.

### 3. Login from terminal

```bash
npm login
```

Enter:
- Username
- Password
- Email
- OTP (if 2FA enabled)

Verify:
```bash
npm whoami
# Should output your username
```

---

## 📦 Packages to Publish

| Package | npm Name | Description |
|---------|----------|-------------|
| `packages/core` | `@smartlangguard/core` | Core translation engine, license, telemetry |
| `packages/mcp-server` | `@smartlangguard/mcp-server` | MCP server for AI tools |
| `packages/daemon` | `@smartlangguard/daemon` | Background daemon |
| `packages/cli` | `@smartlangguard/cli` | CLI tool (depends on core + mcp-server) |

> **Backend** is `private: true` and not published (self-hosted only).

---

## 🚀 Publishing (One Command)

### Option A: Automated script

```bash
./scripts/publish-npm.sh
```

The script:
1. Verifies npm login
2. Checks organization membership
3. Publishes packages in dependency order (core → mcp-server → daemon → cli)
4. Skips already-published versions
5. Verifies each package with `npm pack --dry-run` first

### Option B: Manual (step-by-step)

```bash
# 1. Verify you're logged in
npm whoami

# 2. Publish core first (others depend on it)
cd packages/core
npm publish --access public
cd ../..

# 3. Publish mcp-server
cd packages/mcp-server
npm publish --access public
cd ../..

# 4. Publish daemon
cd packages/daemon
npm publish --access public
cd ../..

# 5. Publish CLI last (depends on core + mcp-server)
cd packages/cli
npm publish --access public
cd ../..
```

---

## ✅ Verify Publication

After publishing, verify each package is live:

```bash
# Check package info
npm view @smartlangguard/core
npm view @smartlangguard/cli
npm view @smartlangguard/mcp-server
npm view @smartlangguard/daemon

# Or check specific version
npm view @smartlangguard/core@0.1.0
```

You should see package metadata including version, description, and files.

---

## 🧪 Test Installation

```bash
# Install CLI globally
npm install -g @smartlangguard/cli

# Verify
smartlangguard --version
# Output: 0.1.0

# Test fix command
echo "high" | smartlangguard fix --no-ai
# Output: اهla

# Test detect command
smartlangguard detect "high hofhv;"
# Output: Found 2 mistake(s)

# Uninstall
npm uninstall -g @smartlangguard/cli
```

---

## 🔄 Updating Packages (Future Releases)

When you make changes and want to publish a new version:

### 1. Bump version

```bash
# In each package directory:
cd packages/core
npm version patch  # 0.1.0 → 0.1.1
# or
npm version minor  # 0.1.0 → 0.2.0
# or
npm version major  # 0.1.0 → 1.0.0
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag

### 2. Update dependent packages

If you bumped `core`, update the dependency in `cli`, `mcp-server`, `daemon`:

```bash
cd packages/cli
npm install @smartlangguard/core@latest
```

### 3. Publish

```bash
./scripts/publish-npm.sh
```

### 4. Push tags

```bash
git push origin main --tags
```

---

## 🐛 Troubleshooting

### "You need a paid account to publish scoped packages"

This is **wrong** - npm allows free scoped packages IF:
- The organization is on the **Free** plan
- You use `--access public` when publishing

Make sure:
```bash
npm publish --access public
```

### "You do not have permission to publish"

You're not a member of the `smartlangguard` organization. Either:
1. Create the org at https://www.npmjs.com/org/create
2. Or ask an existing member to invite you

### "Package already exists"

The version was already published. Bump the version:
```bash
npm version patch
npm publish --access public
```

### "402 Payment Required"

Scoped packages require `--access public`:
```bash
npm publish --access public
```

### "Cannot find module '@smartlangguard/core'"

The package wasn't published yet, or the version doesn't match. Check:
```bash
npm view @smartlangguard/core versions
```

---

## 📊 Package Sizes (verified)

| Package | Tarball Size | Files |
|---------|--------------|-------|
| `@smartlangguard/core` | 23.8 KB | 12 |
| `@smartlangguard/cli` | 5.5 KB | 4 |
| `@smartlangguard/mcp-server` | 4.5 KB | 5 |
| `@smartlangguard/daemon` | 6.3 KB | 6 |

All packages are small and contain only essential files (no tests, no configs, no source maps).

---

## 🔒 Security Notes

- **2FA**: Enable two-factor authentication on your npm account
- **Tokens**: For CI/CD, use `npm token create --read-only` for read, `--publish` for publish
- **Never commit `.npmrc`** with tokens to git
- **Audit**: Run `npm audit` regularly in each package

---

## 📈 Post-Publication Checklist

After publishing:

- [ ] Verify `npm view @smartlangguard/core` shows correct info
- [ ] Test `npm install -g @smartlangguard/cli` works
- [ ] Test `smartlangguard --version` outputs `0.1.0`
- [ ] Test `echo "high" | smartlangguard fix` outputs `اهla`
- [ ] Update GitHub README with npm badges
- [ ] Tweet/announce the npm publication
- [ ] Create GitHub release with `git tag v0.1.0 && git push origin v0.1.0`

---

## 🎯 Next Steps After npm Publication

Once packages are on npm:

1. **Create GitHub Release** (triggers `release.yml` workflow):
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Publish VS Code Extension** (see `packages/vscode-extension/PUBLISH-GUIDE.md`)

3. **Publish Browser Extension** (Chrome Web Store - $5 one-time fee)

4. **Deploy SaaS Backend** (Railway/Render/Vercel)
