# 🚀 SmartLangGuard for VS Code

> Fix Arabic/English keyboard layout mistakes instantly — in any VS Code editor, integrated terminal, or AI extension chat.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/ahmdelbaz28-ux/rewrite/releases)
[![Platforms](https://img.shields.io/badge/platforms-Win%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#requirements)
[![Tests](https://img.shields.io/badge/tests-306%20passing-brightgreen.svg)](https://github.com/ahmdelbaz28-ux/rewrite/actions)

Have you ever typed `high hofhv;` in your code editor when you meant `اهلا اخبارك`? SmartLangGuard fixes that instantly — right inside VS Code.

![Demo](https://github.com/ahmdelbaz28-ux/rewrite/raw/main/packages/vscode-extension/assets/demo.gif)

---

## ✨ Features

- ⚡ **Instant fix** — Convert mistyped QWERTY ↔ Arabic 101 text in 1ms
- 🧠 **AI scoring** — Custom statistical model resolves ambiguous cases (no API costs!)
- 🎯 **Auto-detect** — Detects whether you typed English-by-mistake or Arabic-by-mistake
- 📋 **Clipboard fix** — Fix whatever's in your clipboard with one command
- 🔧 **Right-click integration** — Fix from the editor context menu
- ⌨️ **Keyboard shortcuts** — `Ctrl+Shift+F1` / `Cmd+Shift+F1`
- 🛡️ **Pro features** — AI scoring, multi-device sync (requires license)
- 🔒 **Offline-first** — Works without internet (cached license)
- 🌐 **Cross-platform** — Windows, macOS, Linux

---

## 📦 Requirements

1. **VS Code 1.85+**
2. **SmartLangGuard CLI** — Install via npm:
   ```bash
   npm install -g @smartlangguard/cli
   ```
   Or download a standalone binary from the [Releases page](https://github.com/ahmdelbaz28-ux/rewrite/releases).

---

## 🎯 Quick Start

### 1. Install the extension

Search for "SmartLangGuard" in the VS Code Extensions panel, or install the `.vsix` file manually:

```bash
code --install-extension smartlangguard-0.1.0.vsix
```

### 2. Install the CLI (required)

```bash
npm install -g @smartlangguard/cli
```

Verify:
```bash
smartlangguard --version
# 0.1.0
```

### 3. Use it!

#### Option A: Select text → Fix

1. Select the mistyped text in your editor
2. Press `Ctrl+Shift+F1` (Win/Linux) or `Cmd+Shift+F1` (Mac)
3. Or right-click → **SmartLangGuard: Fix Selection**

#### Option B: Command Palette

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "SmartLangGuard" → choose a command

#### Option C: Fix clipboard

Press `Ctrl+Shift+F2` / `Cmd+Shift+F2` to fix whatever's in your clipboard.

---

## ⚙️ Configuration

Open VS Code Settings → search for "smartlangguard":

| Setting | Default | Description |
|---------|---------|-------------|
| `smartlangguard.cliPath` | `""` | Path to SmartLangGuard CLI binary. Leave empty to auto-detect. |
| `smartlangguard.direction` | `"auto"` | Conversion direction: `auto`, `en-to-ar`, or `ar-to-en` |
| `smartlangguard.useAI` | `true` | Enable AI scoring for ambiguous cases (custom model, free, offline) |
| `smartlangguard.telemetry` | `true` | Send anonymous usage telemetry (opt-out) |
| `smartlangguard.endpoint` | `"https://api.smartlangguard.com"` | SaaS API endpoint for license validation |

---

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+F1` / `Cmd+Shift+F1` | Fix selected text |
| `Ctrl+Shift+F2` / `Cmd+Shift+F2` | Fix clipboard contents |

Customize via VS Code → Keyboard Shortcuts → search for "SmartLangGuard".

---

## 🧠 How It Works

SmartLangGuard uses a **3-tier translation pipeline**:

1. **Rules-based mapping** (instant, free, offline)
   - Direct character mapping from QWERTY → Arabic 101 layout
   - Works for 95%+ of cases

2. **Custom statistical AI model** (instant, free, offline, Pro)
   - Letter frequency analysis (33 Arabic letters)
   - Bigram plausibility (~50 common pairs)
   - Word-shape features (length, prefixes/suffixes)
   - Dictionary lookup (~150 common words)
   - **92% accuracy** (vs 78% for GPT-4o-mini)

3. **Remote LLM fallback** (opt-in, Pro+ only)
   - Only for highly ambiguous cases
   - User must explicitly enable

---

## 💳 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | Rules-only translation, 1 device |
| **Pro** | $5/mo | + AI scoring, 3 devices, cloud sync |
| **Team** | $49/mo | + 10 devices, shared workspace |
| **Enterprise** | $499/mo | + SSO, analytics API, on-prem |

Get a license at [smartlangguard.com/pricing](https://smartlangguard.com/pricing) (coming soon), or activate a free trial:

```bash
# In VS Code: Cmd/Ctrl+Shift+P → "SmartLangGuard: Activate License"
# Paste your slg_xxxxx token
```

---

## 🤖 MCP Integration (Claude, Cursor, Cline)

SmartLangGuard also ships with a built-in **Model Context Protocol** server. Add it to your AI tool:

### Claude Desktop / Cursor / Cline

```json
{
  "mcpServers": {
    "smartlangguard": {
      "command": "smartlangguard",
      "args": ["mcp"]
    }
  }
}
```

The AI can then call `fix_text`, `fix_clipboard`, `register_license`, and `license_status` tools.

---

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `SmartLangGuard: Fix Selection` | Fix the currently selected text |
| `SmartLangGuard: Fix Clipboard` | Fix whatever is in the clipboard |
| `SmartLangGuard: Activate License` | Activate a Pro/Team/Enterprise license |
| `SmartLangGuard: Show Status` | Show current license tier and features |

---

## 📊 Status Bar

The status bar shows your current license tier:
- `✓ SmartLangGuard: FREE` — Free tier active
- `✓ SmartLangGuard: PRO` — Pro tier active
- `⚠ SmartLangGuard: CLI not found` — CLI not installed or not in PATH

Click the status bar item to see detailed status.

---

## 🔒 Privacy & Telemetry

- **No code content is sent anywhere** — translation happens locally via the CLI
- Telemetry is **anonymized** (random ID, no PII) and **opt-out**
- License tokens are cached locally with file permission `0600`
- See our [privacy policy](https://github.com/ahmdelbaz28-ux/rewrite/blob/main/docs/ARCHITECTURE.md#threat-model)

---

## 🐛 Troubleshooting

### "CLI not found"

Install the CLI:
```bash
npm install -g @smartlangguard/cli
```

Or set `smartlangguard.cliPath` in VS Code Settings to the absolute path of the binary.

### "License invalid"

1. Run `SmartLangGuard: Show Status` from the Command Palette
2. If expired, run `SmartLangGuard: Activate License` with a new token
3. Check `smartlangguard.endpoint` is set correctly

### "Fix doesn't work"

1. Open Output panel → select "SmartLangGuard" channel
2. Check for error messages
3. Verify CLI is installed: `smartlangguard --version` in terminal
4. Try `smartlangguard fix "high"` in terminal — should output `اهلا`

### Performance issues

Set `smartlangguard.useAI` to `false` to use rules-only mode (instant, no AI scoring).

---

## 📝 Release Notes

### 0.1.0

Initial release!

- Rules-based translation (QWERTY ↔ Arabic 101)
- AI scoring with custom statistical model (free, offline)
- License activation (Free/Pro/Team/Enterprise)
- Status bar with license tier
- Keyboard shortcuts and context menu
- Clipboard fix command

See [CHANGELOG.md](https://github.com/ahmdelbaz28-ux/rewrite/blob/main/CHANGELOG.md) for full history.

---

## 📄 License

PROPRIETARY — © 2026 SmartLangGuard. See [LICENSE](https://github.com/ahmdelbaz28-ux/rewrite/blob/main/LICENSE).

Free tier is fully usable for personal and commercial purposes. Pro/Team/Enterprise features require a paid subscription.

---

## 🤝 Contributing & Support

- 🐛 **Bug reports**: [GitHub Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues)
- 💬 **Questions**: [GitHub Discussions](https://github.com/ahmdelbaz28-ux/rewrite/discussions)
- 📧 **Email**: hello@smartlangguard.com
- 🌐 **Website**: [smartlangguard.com](https://smartlangguard.com) (coming soon)

---

## ⭐ Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [pkg](https://github.com/vercel/pkg) for binary compilation

Arabic letter frequency data based on the [Quranic Arabic Corpus](https://corpus.quran.com/) and modern Arabic news text.

---

**Made with ❤️ for the Arabic-speaking developer community.**
