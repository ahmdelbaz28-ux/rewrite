# 📤 SmartLangGuard VS Code Extension — Publishing Guide

This guide walks you through publishing the SmartLangGuard VS Code extension to the [VS Code Marketplace](https://marketplace.visualstudio.com/).

**Estimated time:** 15-20 minutes (one-time setup), then 2 minutes per release.

---

## ✅ Prerequisites (already done)

The following are already prepared in this repo:

- ✅ `package.json` with all required Marketplace fields (publisher, repository, license, etc.)
- ✅ `README.md` formatted for Marketplace display
- ✅ `CHANGELOG.md` with version history
- ✅ `LICENSE` file (PROPRIETARY)
- ✅ Icon (256x256 PNG at `assets/icon.png`)
- ✅ `.vscodeignore` to exclude dev files
- ✅ Compiled `out/extension.js`
- ✅ Built `.vsix` package at `packages/vscode-extension/dist/smartlangguard-0.1.0.vsix` (81.8 KB)
- ✅ Passed 115 verification checks

---

## 📋 Step-by-Step Publishing Process

### Step 1: Create a Microsoft / Azure DevOps account

The VS Code Marketplace uses Azure DevOps for authentication.

1. Go to https://azure.microsoft.com/en-us/products/devops
2. Click "Start free"
3. Sign in with a Microsoft account (or create one)
4. You'll be redirected to your Azure DevOps organization

> **Note:** If you already have a GitHub account, you can use it to sign in to Azure DevOps.

---

### Step 2: Create a Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. Sign in with your Microsoft account
3. In the top-right corner, click your profile picture → **User settings** → **Personal access tokens**
4. Click **New Token**
5. Fill in:
   - **Name:** `vsce-publish-smartlangguard`
   - **Organization:** `All accessible organizations` *(critical — must be this, not just one org)*
   - **Expiration:** 1 year (or whatever you prefer)
   - **Scopes:** Click "Show all scopes" at the bottom, then find **Marketplace** → **Acquire** (check the box)
6. Click **Create**
7. **Copy the token immediately** — you won't be able to see it again

> ⚠️ **Store this token securely.** It's the only credential needed to publish updates.

---

### Step 3: Create the "smartlangguard" publisher

You must create a publisher with the ID `smartlangguard` (this matches the `publisher` field in `package.json`).

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with the same Microsoft account
3. Click **Create publisher**
4. Fill in:
   - **Publisher ID:** `smartlangguard` *(must be exactly this)*
   - **Name:** `SmartLangGuard`
   - **Description:** `Cross-platform keyboard layout mistake fixer for Arabic/English`
5. Save

---

### Step 4: Install vsce (if not installed)

```bash
npm install -g @vscode/vsce
```

Verify:
```bash
vsce --version
# 3.x.x
```

---

### Step 5: Login with your PAT

```bash
cd packages/vscode-extension
vsce login smartlangguard
```

When prompted, paste your PAT from Step 2.

You should see:
```
Personal Access Token for publisher 'smartlangguard': [hidden]
✔ Logged in as smartlangguard
```

> The PAT is stored in `~/.vsce` (or `%APPDATA%\vsce` on Windows) for future use.

---

### Step 6: (Optional) Test the .vsix locally first

Before publishing, install the .vsix in your local VS Code to verify it works:

```bash
code --install-extension packages/vscode-extension/dist/smartlangguard-0.1.0.vsix
```

Then:
1. Reload VS Code
2. Open a file with mistyped text (e.g., `high hofhv;`)
3. Select it → press `Ctrl+Shift+F1`
4. Should be replaced with `اهلا اخبارك`

If it works, you're ready to publish.

---

### Step 7: Publish! 🚀

```bash
cd packages/vscode-extension
vsce publish
```

You should see:
```
This extension consists of 11 files, with a total size of 81.8 KB.
Publishing 'smartlangguard.smartlangguard@0.1.0'...
✔ Extension published!
URL: https://marketplace.visualstudio.com/items?itemName=smartlangguard.smartlangguard
```

**That's it!** The extension is now live on the Marketplace.

---

## 🔄 Updating the Extension (Future Releases)

When you make changes and want to publish a new version:

### 1. Bump the version

```bash
cd packages/vscode-extension

# Patch (0.1.0 → 0.1.1) for bug fixes
vsce publish patch

# Minor (0.1.0 → 0.2.0) for new features
vsce publish minor

# Major (0.1.0 → 1.0.0) for breaking changes
vsce publish major
```

`vsce publish` automatically:
- Bumps `package.json` version
- Commits the change
- Creates a git tag (`v0.1.1`)
- Builds the .vsix
- Publishes to Marketplace
- Pushes the commit + tag (if you have push access)

### 2. Update CHANGELOG.md

Add a new section to `CHANGELOG.md`:

```markdown
## [0.1.1] — 2026-06-20

### Fixed
- Status bar not updating after license activation
- CLI path detection on Windows
```

Commit and push the changelog separately.

---

## 📊 Marketplace Management

### View your extension

- **URL:** https://marketplace.visualstudio.com/items?itemName=smartlangguard.smartlangguard
- **Management:** https://marketplace.visualstudio.com/manage/publishers/smartlangguard

### Update README (without new version)

To update only the README without a new version:

```bash
vsce publish --update-readme
```

### Unpublish

To remove the extension from the Marketplace:

```bash
vsce unpublish smartlangguard.smartlangguard
```

> ⚠️ Unpublishing makes the extension unavailable, but existing installs keep working. Re-publishing with the same version is not allowed — you must bump the version.

---

## 🎯 Marketing Checklist

After publishing, do these to maximize visibility:

- [ ] Add a demo GIF/screenshot to the README
- [ ] Submit to https://www.reddit.com/r/vscode/
- [ ] Submit to https://news.ycombinator.com/show
- [ ] Share in Arabic developer Discord/Telegram groups
- [ ] Write a Twitter/X thread showing the problem → solution
- [ ] Add badges to GitHub README (downloads, rating, version)
- [ ] Create a Product Hunt launch
- [ ] Add to awesome-vscode list via PR

---

## 🐛 Troubleshooting

### "ERROR: PAT not authorized"

- Make sure your PAT was created with **All accessible organizations** scope
- Make sure **Marketplace → Acquire** permission is checked
- Try logging in again: `vsce logout smartlangguard && vsce login smartlangguard`

### "ERROR: Publisher not found"

You need to create the publisher first (Step 3 above). The publisher ID must EXACTLY match `package.json`'s `publisher` field.

### "ERROR: Extension already exists"

You can't publish the same version twice. Bump the version:
```bash
vsce publish patch  # 0.1.0 → 0.1.1
```

### "ERROR: README.md not found"

Make sure you're running `vsce publish` from inside `packages/vscode-extension/`, not the repo root.

### "Package contains sensitive information"

Use the build script we created:
```bash
node /home/z/my-project/scripts/build-vscode-extension.js
# Then publish the .vsix file directly:
vsce publish packages/vscode-extension/dist/smartlangguard-0.1.0.vsix
```

### "ERROR: Cannot find module 'vscode'"

You need to install dev dependencies:
```bash
cd packages/vscode-extension
npm install
npm run compile
```

---

## 📦 Files Ready for Publishing

| File | Purpose | Location |
|------|---------|----------|
| `.vsix` package | The publishable artifact | `packages/vscode-extension/dist/smartlangguard-0.1.0.vsix` |
| `package.json` | Marketplace metadata | `packages/vscode-extension/package.json` |
| `README.md` | Marketplace page content | `packages/vscode-extension/README.md` |
| `CHANGELOG.md` | Version history | `packages/vscode-extension/CHANGELOG.md` |
| `LICENSE` | Legal | `packages/vscode-extension/LICENSE` |
| Icon (256x256) | Marketplace thumbnail | `packages/vscode-extension/assets/icon.png` |

---

## 🎉 Final Checklist Before You Click Publish

- [ ] Azure DevOps account created
- [ ] PAT created with **All accessible organizations** + **Marketplace → Acquire**
- [ ] Publisher `smartlangguard` created at https://marketplace.visualstudio.com/manage
- [ ] `vsce login smartlangguard` succeeded
- [ ] Tested `.vsix` locally with `code --install-extension`
- [ ] README.md looks good (preview it in VS Code's Markdown preview)
- [ ] CHANGELOG.md has the 0.1.0 entry
- [ ] All 115 verification tests pass (`node /home/z/my-project/scripts/test-vscode-extension.js`)

Then:
```bash
cd packages/vscode-extension
vsce publish
```

**Welcome to the VS Code Marketplace! 🚀**
