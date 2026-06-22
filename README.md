<div align="center">

<img src="docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="100" />

# SmartLangGuard

**English → Arabic keyboard layout fixer — instant, offline, private.**

`high hofhv;` → `اهلا اخبارك` in ~1ms.

[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg?style=flat-square&label=CLI&color=blue)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Tests](https://img.shields.io/badge/Tests-180%20passing-brightgreen.svg?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Win%20|%20macOS%20|%20Linux-lightgrey.svg?style=flat-square)](#-installation)

</div>

---

## Quick Start

```bash
npm install -g @smartlangguard/cli          # install (30 sec)
smartlangguard fix "high hofhv;"             # → اهلا اخبارك
```

---

## All Methods — Install, Run & Use

| # | Method | Where it works | Install (once) | Run | Use (every day) |
|:-:|--------|---------------|----------------|-----|-----------------|
| 1 | **Terminal** | Command Prompt, PowerShell, Bash | `npm install -g @smartlangguard/cli` | `smartlangguard fix "high"` | Type command → get fixed text instantly |
| 2 | **Clipboard Hotkey** ⭐ | **Any app** — Word, Chrome, WhatsApp, Telegram, VS Code, Slack | `npm install -g @smartlangguard/cli` | `smartlangguard daemon` (keep open) | Copy text → `Ctrl+Shift+Space` → Paste fixed |
| 3 | **Chat Mode** | Terminal (like talking to a bot) | `npm install -g @smartlangguard/cli` | `smartlangguard interactive` | Type text → get fix → repeat. Type `exit` to quit |
| 4 | **Pipe** | Scripts, AI tools, automation | `npm install -g @smartlangguard/cli` | `echo "high" \| smartlangguard fix` | Send text in → get fixed text out |
| 5 | **File** | Any text file (.txt, .md, etc.) | `npm install -g @smartlangguard/cli` | `smartlangguard fix -f file.txt -o fixed.txt` | One command fixes entire file |
| 6 | **VS Code** | VS Code editor | 1. `npm install -g @smartlangguard/cli`<br>2. Extensions → search "SmartLangGuard" → Install | — | Select text → `Ctrl+Shift+F1` or right-click → Fix Selection |
| 7 | **Browser** ⭐ | Chrome, Edge, Brave | See [Browser Extension](#-browser-extension) section | `smartlangguard daemon` (keep open) | Select text → right-click → Fix Selection, or `Ctrl+Shift+L` on any page |
| 8 | **AI Tools (MCP)** | Claude Desktop, Cursor, Cline | `npm install -g @smartlangguard/cli` + add config (see below) | — | AI fixes text automatically when you ask |
| 9 | **Node.js API** | Your own JavaScript code | `npm install @smartlangguard/core` | `require('@smartlangguard/core')` | `core.fixText('high')` → `{ corrected: 'اهلا' }` |
| 10 | **Binary** (no npm) | Any computer without Node.js | Download `.exe` / binary from [Releases](https://github.com/ahmdelbaz28-ux/rewrite/releases) | `./smartlangguard fix "high"` | Same as Terminal method |

> ⭐ **For non-coders:** Method 2 (Clipboard Hotkey) is the easiest — install once, then use `Ctrl+Shift+Space` in any app.

### MCP Config (for Method 8)

Add to your AI tool's config file:

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

---

---

## 🌐 Browser Extension

Fix keyboard layout mistakes on any webpage. Works with Chrome, Edge, and Brave.

### How it works

The browser extension talks to the daemon (background service) running on your computer.
All fixing happens **locally** — no data leaves your machine.

### Step-by-step installation

#### 1. Install the CLI (one time)

```bash
npm install -g @smartlangguard/cli
```

> If you don't have Node.js, download it from [nodejs.org](https://nodejs.org) first.

#### 2. Start the daemon

```bash
smartlangguard daemon
```

Keep this terminal window open. You should see:

```
+--------------------------------------------+
|  SmartLangGuard Daemon v0.1.3              |
+--------------------------------------------+
|  + Local API: http://localhost:41783       |
+--------------------------------------------+
```

#### 3. Load the extension in your browser

**Chrome:**
1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Navigate to the `packages/browser-extension` folder and select it
5. The SmartLangGuard icon appears in your toolbar ✓

**Edge:**
1. Open Edge and go to `edge://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `packages/browser-extension` folder

**Brave:**
1. Open Brave and go to `brave://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `packages/browser-extension` folder

> The extension folder is at `packages/browser-extension` inside the project.
> If you cloned the repo, run `git clone https://github.com/ahmdelbaz28-ux/rewrite.git`
> and use the folder from there.

### How to use it

| Action | How |
|--------|-----|
| Fix selected text | Select text on any page → Right-click → **SmartLangGuard: Fix Selection** |
| Quick shortcut | Select text → Press `Ctrl+Shift+L` |
| Fix clipboard | Press `Ctrl+Shift+K` to fix whatever is in your clipboard |
| Fix last word typed | Press `Ctrl+Shift+Backspace` (while typing in a text box) |
| Open popup | Click the SmartLangGuard icon in your browser toolbar |
| Open settings | Click the icon → click **Settings** |

### Popup features

- **Fix text**: Type or paste text into the popup and click **Fix**
- **Auto-fix on paste**: Turn on to automatically fix text when you paste
- **Real-time detection**: Get an alert when you type in the wrong keyboard layout
- **Alert sound**: Choose a sound that plays when a mistake is detected

### What if the icon shows "Daemon offline"?

1. Make sure `smartlangguard daemon` is running in a terminal
2. Click the extension icon → it should show "Daemon running"
3. If still offline, restart the daemon and refresh the page

---

## All Commands

| Command | What it does |
|---------|-------------|
| `fix "text"` | Fix text |
| `fix -f in.txt -o out.txt` | Fix file |
| `fix --format json "text"` | Fix with JSON result |
| `fix -d ar-to-en "اهلا"` | Force Arabic → English |
| `detect "text"` | Find mistakes (no fix) |
| `interactive` | Chat-like mode |
| `daemon` | Background hotkey + clipboard |
| `mcp` | MCP server for AI |
| `license activate <token>` | Activate license |
| `license status` | Check license |
| `config set <key> <val>` | Change settings |
| `update check` | Check for update |
| `sound play <name>` | Play alert sound |

---

## Features

| Feature | Free | Pro ($5/mo) |
|---------|:----:|:-----------:|
| Fix text | ✅ | ✅ |
| CLI + Daemon + Hotkey | ✅ | ✅ |
| VS Code Extension | ✅ | ✅ |
| Browser Extension | ✅ | ✅ |
| AI scoring | — | ✅ |
| Devices | 1 | 3 |

---

## Programmatic API

```js
const core = require('@smartlangguard/core');
await core.init({ telemetryEnabled: false });
const result = await core.fixText('high hofhv;');
console.log(result.corrected); // اهلا اخبارك
```

---

## Testing

```bash
npm test               # 180 tests
npx jest --verbose     # detailed
```

---

## License

Proprietary — © 2026 SmartLangGuard.

[Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues) · [Email](mailto:hello@smartlangguard.com)
