<div align="center">

<img src="docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="100" />

# SmartLangGuard

**English → Arabic keyboard layout fixer — instant, offline, private.**

`high hofhv;` → `اهلا اخبارك` in ~1ms.

[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg?style=flat-square&label=CLI&color=blue)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Tests](https://img.shields.io/badge/Tests-180%20passing-brightgreen.svg?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/Node-18%2B-339933.svg?style=flat-square&logo=node.js)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Win%20|%20macOS%20|%20Linux-lightgrey.svg?style=flat-square)](#-installation)

</div>

---

## Quick Start (30 seconds)

```bash
# 1. Install
npm install -g @smartlangguard/cli

# 2. Fix your first text
smartlangguard fix "high hofhv;"
# → اهلا اخبارك

# 3. Verify
smartlangguard --version   # → 0.1.3
```

**No npm?** Download a binary from [Releases](https://github.com/ahmdelbaz28-ux/rewrite/releases).

---

## Usage

After installing, these commands work anywhere:

### Fix Text
```bash
smartlangguard fix "high"                 # → اهلا
echo "high hofhv;" | smartlangguard fix   # pipe from anywhere
smartlangguard fix -f input.txt -o fixed.txt  # files
smartlangguard fix --format json "high"   # JSON with score
```

### Detect Mistakes
```bash
smartlangguard detect "hello high hofhv"
# Found 2 mistake(s):
#   1. "high" → "اهلا"  (en-to-ar)
#   2. "hofhv" → "اخبار" (en-to-ar)
```

### Interactive Mode (chat-like)
```bash
smartlangguard interactive
# smartlangguard> high
# → اهلا  [en-to-ar | 90%]
```

### Daemon + Hotkey (use from ANY app)
```bash
smartlangguard daemon
# Starts background service with:
#   • Global Hotkey: Ctrl+Shift+Space
#   • Clipboard monitor
#   • Local API: http://localhost:41783
```
**Workflow:** Copy text → `Ctrl+Shift+Space` → Paste fixed text. Works in Word, Chrome, WhatsApp, VS Code — any app.

```bash
# Options
smartlangguard daemon --no-clipboard   # disable clipboard monitor
smartlangguard daemon --no-hotkey      # disable global hotkey
```

### AI Tools (MCP)
Add to Claude Desktop / Cursor config:
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
Then AI assistants can fix text automatically.

---

## All Commands

| Command | Description |
|---------|-------------|
| `fix [text]` | Fix mistyped text |
| `fix -f <file> -o <file>` | Fix files |
| `fix --format json` | JSON output with score |
| `fix -d ar-to-en` | Force direction |
| `detect [text]` | Find mistakes without fixing |
| `interactive` | Chat-like REPL mode |
| `daemon` | Background service + hotkey |
| `mcp` | MCP server for AI tools |
| `license activate <token>` | Activate license |
| `license status` | Check license tier |
| `config set <k> <v>` | Set config |
| `update check` | Check for updates |
| `sound play <name>` | Play alert sound |

---

## Features by Tier

| Feature | Free | Pro ($5/mo) | Team ($49/mo) |
|---------|:----:|:-----------:|:--------------:|
| Rules-based translation | ✅ | ✅ | ✅ |
| AI scoring | — | ✅ | ✅ |
| CLI + MCP + Daemon | ✅ | ✅ | ✅ |
| Global Hotkey | ✅ | ✅ | ✅ |
| VS Code Extension | ✅ | ✅ | ✅ |
| Browser Extension | — | ✅ | ✅ |
| Cloud Sync | — | ✅ | ✅ |
| Max devices | 1 | 3 | 10 |

---

## VS Code Extension

1. Install CLI: `npm install -g @smartlangguard/cli`
2. In VS Code: Extensions → search "SmartLangGuard" → Install
3. Select text → `Ctrl+Shift+F1` (Win) / `Cmd+Shift+F1` (Mac)

Or right-click → **"SmartLangGuard: Fix Selection"**

---

## Programmatic API (Node.js)

```js
const core = require('@smartlangguard/core');
await core.init({ telemetryEnabled: false });
const result = await core.fixText('high hofhv;');
console.log(result.corrected); // اهلا اخبارك
```

---

## Testing

```bash
npm test                 # all 180 tests
npx jest --verbose       # detailed output
```

---

## License

Proprietary — © 2026 SmartLangGuard. See [LICENSE](LICENSE).

---

<div align="center">

**Powered by AI, Built for Developers.**  
[Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues) · [Email](mailto:hello@smartlangguard.com)

</div>
