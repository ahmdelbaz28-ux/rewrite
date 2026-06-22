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
| 7 | **Browser** (Pro+) | Chrome, Edge, Brave | 1. Buy Pro license<br>2. Install extension | — | Select text on any webpage → right-click → Fix |
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
| AI scoring | — | ✅ |
| Browser Extension | — | ✅ |
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
