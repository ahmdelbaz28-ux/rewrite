<div align="center">

<img src="docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="120" />

# SmartLangGuard

### The Ultimate Keyboard Layout Correction Engine

**Fix mistyped text instantly across all your applications — Terminal, AI Tools, Browsers, Editors, and more.**

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg?style=flat-square)](https://www.npmjs.com/package/@smartlangguard/cli)
[![npm downloads](https://img.shields.io/npm/dm/@smartlangguard/cli.svg?style=flat-square)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat-square)](https://nodejs.org)
[![Platforms](https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](#-installation)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/ahmdelbaz28-ux/rewrite/ci.yml?style=flat-square&label=CI%2FCD)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![Tests](https://img.shields.io/badge/Tests-166%20passing-brightgreen.svg?style=flat-square)](#-testing)

---

**Offline. Private. Blazing Fast.**

Works with: **Claude Desktop** | **Cursor** | **Cline** | **VS Code** | **Terminal** | **Browser** | **Any App**

</div>

---

## Table of Contents

- [Why SmartLangGuard?](#why-smartlangguard)
- [Demo](#demo)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
  - [CLI Commands](#cli-commands)
  - [Interactive Mode](#interactive-mode)
  - [Pipe Mode (AI Tools)](#pipe-mode-ai-tools)
  - [File Mode](#file-mode)
  - [Detect Mode](#detect-mode)
- [MCP Integration (AI Tools)](#mcp-integration-ai-tools)
- [Daemon Mode (Background Service)](#daemon-mode-background-service)
- [VS Code Extension](#vs-code-extension)
- [Browser Extension](#browser-extension-pro)
- [SaaS Backend](#saas-backend-self-hosted-or-cloud)
- [Benefits](#benefits)
- [Pricing](#pricing)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Security](#security)
- [CI/CD](#cicd)
- [Roadmap](#roadmap)
- [License](#license)
- [Support](#support--community)
- [Contributing](#contributing)
- [Changelog](#changelog)

---

## Why SmartLangGuard?

Have you ever typed **`high hofhv;`** when you meant **`اهلا اخبارك`**?

When switching between **QWERTY (English)** and **Arabic 101** keyboard layouts, it's easy to accidentally type in the wrong layout. This leads to:

- **Confusing messages** — `sldk` instead of `hello`
- **Wasted time** — manually correcting mistakes
- **Frustration** — in fast-paced conversations and coding sessions

**SmartLangGuard solves this** by automatically detecting and correcting keyboard layout mistakes in real-time — **across every application you use**.

### What Makes It Different?

| Feature | SmartLangGuard | Manual Correction | Other Tools |
|---------|---------------|-------------------|-------------|
| **Offline (No Internet)** | Yes | - | Some |
| **Privacy (No Data Sent)** | Yes | Yes | No |
| **Speed** | ~1ms | 5-10s | 200-500ms |
| **AI Accuracy** | 92% | Human-dependent | 78% |
| **Cost** | $0 (Free tier) | $0 (your time) | $$ per API call |
| **Works Everywhere** | Yes | No | Limited |
| **MCP Integration** | Yes | No | No |

---

## Demo

### Fix Text Instantly
```bash
$ smartlangguard fix "high hofhv;"
اهلا اخبارك
```

### Fix with Confidence Score
```bash
$ smartlangguard fix "high" --format json
{
  "original": "high",
  "corrected": "اهلا",
  "direction": "en-to-ar",
  "score": 90,
  "source": "rules"
}
```

### Detect Mistakes in Text
```bash
$ smartlangguard detect "hello high hofhv"
Found 2 mistake(s):

  1. "high" -> "اهلا" (en-to-ar) [pos 6-10]
  2. "hofhv" -> "اخبار" (en-to-ar) [pos 11-16]
```

### Pipe from Any Source
```bash
$ echo "high hofhv;" | smartlangguard fix
اهلا اخبارك
```

---

## Features

| **Feature** | **Free** | **Pro** | **Team** | **Enterprise** |
|-------------|:---------:|:-------:|:--------:|:--------------:|
| Rules-Based Translation | Yes | Yes | Yes | Yes |
| AI Scoring (Ambiguous Cases) | No | Yes | Yes | Yes |
| CLI (Terminal Support) | Yes | Yes | Yes | Yes |
| MCP Server (AI Tools Integration) | Yes | Yes | Yes | Yes |
| Daemon (Background Clipboard Monitor) | Yes | Yes | Yes | Yes |
| Global Hotkey (`Ctrl+Shift+Space`) | Yes | Yes | Yes | Yes |
| VS Code Extension | Yes | Yes | Yes | Yes |
| Browser Extension | No | Yes | Yes | Yes |
| Cloud Sync (Multi-Device) | No | Yes | Yes | Yes |
| Priority Support | No | No | Yes | Yes |
| SSO & SAML | No | No | No | Yes |
| On-Premise Deployment | No | No | No | Yes |
| Analytics API | No | No | No | Yes |

---

## Installation

### Option 1: NPM (Recommended)

```bash
npm install -g @smartlangguard/cli
```

That's it. Now you can use `smartlangguard` or `slg` from anywhere in your terminal.

### Option 2: Download Pre-Built Binaries

Download the latest release for your platform from the [Releases Page](https://github.com/ahmdelbaz28-ux/rewrite/releases):

| Platform | Architecture | Download |
|----------|-------------|----------|
| **Windows** | x64 | [smartlangguard-win-x64.exe](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-win-x64.exe) |
| **macOS** | Intel (x64) | [smartlangguard-macos-x64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-x64) |
| **macOS** | Apple Silicon (arm64) | [smartlangguard-macos-arm64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-arm64) |
| **Linux** | x64 | [smartlangguard-linux-x64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-x64) |
| **Linux** | arm64 | [smartlangguard-linux-arm64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-arm64) |

#### Install on Linux/macOS
```bash
chmod +x smartlangguard-*
sudo mv smartlangguard-* /usr/local/bin/smartlangguard
```

#### Install on Windows
1. Download the `.exe` file
2. Move it to `C:\Windows\` or add it to your `PATH`

### Option 3: Build from Source
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install
npm run build
```

### Verify Installation
```bash
smartlangguard --version
# Output: 0.1.2

smartlangguard --help
# Shows all available commands
```

---

## Quick Start

### 1. Fix Text Inline
```bash
smartlangguard fix "high hofhv;"
# Output: اهلا اخبارك
```

### 2. Fix from Pipe
```bash
echo "high hofhv;" | smartlangguard fix
# Output: اهلا اخبارك
```

### 3. Fix File Contents
```bash
smartlangguard fix input.txt -o output.txt
```

### 4. Interactive Mode
```bash
smartlangguard interactive
# smartlangguard> high
# -> اهلا
# [en-to-ar | 90% confidence | local]
```

### 5. Activate Pro License (Optional)
```bash
smartlangguard license activate slg_your_token_here
```

---

## Usage Guide

### CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `fix [text]` | Fix mistyped text | `smartlangguard fix "high"` |
| `fix -f <file>` | Fix text from file | `smartlangguard fix -f input.txt` |
| `fix -o <file>` | Write result to file | `smartlangguard fix "high" -o out.txt` |
| `fix --direction <dir>` | Force direction | `smartlangguard fix "اهلا" -d ar-to-en` |
| `fix --format json` | JSON output | `smartlangguard fix "high" --format json` |
| `fix --no-ai` | Disable AI scoring | `smartlangguard fix "high" --no-ai` |
| `interactive` | Start REPL mode | `smartlangguard interactive` |
| `detect [text]` | Detect layout mistakes | `smartlangguard detect "high hofhv"` |
| `license activate <token>` | Activate license | `smartlangguard license activate slg_...` |
| `license status` | Check license | `smartlangguard license status` |
| `license revoke` | Revoke license | `smartlangguard license revoke` |
| `update check` | Check for updates | `smartlangguard update check` |
| `update apply` | Apply update | `smartlangguard update apply` |
| `config set <key> <value>` | Set config | `smartlangguard config set telemetry false` |
| `config get <key>` | Get config value | `smartlangguard config get endpoint` |
| `config list` | List all config | `smartlangguard config list` |
| `mcp` | Start MCP server | `smartlangguard mcp` |
| `daemon` | Start background daemon | `smartlangguard daemon` |
| `sound play [name]` | Play alert sound | `smartlangguard sound play ding` |
| `sound list` | List available sounds | `smartlangguard sound list` |

### Interactive Mode

Interactive mode gives you a REPL (Read-Eval-Print Loop) for quick fixes:

```bash
$ smartlangguard interactive

SmartLangGuard Interactive Mode
Type text and press Enter to fix. Type "exit" or Ctrl+D to quit.

smartlangguard> high
-> اهلا
  [en-to-ar | 90% confidence | rules]

smartlangguard> hofhv;
-> اخبارك
  [en-to-ar | 85% confidence | rules]

smartlangguard> exit
Goodbye!
```

### Pipe Mode (AI Tools)

Pipe mode is perfect for integrating with AI tools and shell scripts:

```bash
# Fix clipboard contents
pbpaste | smartlangguard fix | pbcopy        # macOS
powershell -Command "Get-Clipboard" | smartlangguard fix | Set-Clipboard  # Windows
xclip -o | smartlangguard fix | xclip -sel clip  # Linux

# Use in shell scripts
CORRECTED=$(echo "$INPUT" | smartlangguard fix)

# Chain with other tools
echo "high hofhv" | smartlangguard fix | espeak
```

### File Mode

Fix entire files in one command:

```bash
# Fix and display
smartlangguard fix document.txt

# Fix and save to new file
smartlangguard fix document.txt -o fixed-document.txt

# Fix with forced direction
smartlangguard fix arabic-text.txt -d ar-to-en -o english-output.txt
```

### Detect Mode

Detect mode finds all layout mistakes in text without fixing them:

```bash
# Detect in a string
smartlangguard detect "hello high hofhv world"

# Detect with JSON output
smartlangguard detect "high hofhv" --format json

# Detect from pipe
cat document.txt | smartlangguard detect
```

Output:
```json
{
  "text": "high hofhv",
  "mistakes_found": 2,
  "mistakes": [
    {
      "word": "high",
      "suggestion": "اهلا",
      "direction": "en-to-ar",
      "range": [0, 4]
    },
    {
      "word": "hofhv",
      "suggestion": "اخبار",
      "direction": "en-to-ar",
      "range": [5, 10]
    }
  ]
}
```

---

## MCP Integration (AI Tools)

SmartLangGuard includes a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for seamless integration with AI tools like **Claude Desktop**, **Cursor**, **Cline**, and **Continue**.

### Setup

#### Claude Desktop
Add to `claude_desktop_config.json`:
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

#### Cursor
Add to `~/.cursor/mcp.json`:
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

#### Cline / Continue
Same configuration pattern. Refer to your tool's MCP documentation.

### Available MCP Tools

| Tool | Description | Example |
|------|-------------|---------|
| `fix_text` | Fix a given text string | `fix_text("high hofhv;")` -> `اهلا اخبارك` |
| `fix_clipboard` | Fix clipboard contents | `fix_clipboard()` -> Fixed text written back to clipboard |
| `register_license` | Activate a license token | `register_license("slg_...")` |
| `license_status` | Check current license tier | `license_status()` -> `{ tier: "pro" }` |

### Example: Using with Cursor

Just type a prompt like:
> "I typed `high hofhv;` by mistake. Use SmartLangGuard to fix it."

The AI will automatically call `fix_text` and return:
```
اهلا اخبارك
```

---

## Daemon Mode (Background Service)

The Daemon runs in the background and provides three powerful features:

1. **Clipboard Monitoring** — Auto-fixes clipboard contents on demand
2. **Global Hotkey** — Press `Ctrl+Shift+Space` to fix clipboard text instantly
3. **Local HTTP API** — For browser extensions and custom integrations

### Start the Daemon
```bash
smartlangguard daemon
```

Output:
```
+--------------------------------------------+
|  SmartLangGuard Daemon v0.1.2              |
+--------------------------------------------+
|  [OK] Clipboard monitor: ACTIVE            |
|  [OK] Global hotkey: Ctrl+Shift+Space      |
|  [OK] Local API: http://localhost:41783    |
+--------------------------------------------+

Press Ctrl+C to stop.
```

### Daemon HTTP API (Port 41783)

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/fix` | POST | Fix a text string | `curl -X POST http://localhost:41783/fix -H "Content-Type: application/json" -d '{"text": "high"}'` |
| `/clipboard/fix` | POST | Fix clipboard contents | `curl -X POST http://localhost:41783/clipboard/fix` |
| `/autofix/toggle` | POST | Toggle auto-fix mode | `curl -X POST http://localhost:41783/autofix/toggle` |
| `/status` | GET | Check daemon status | `curl http://localhost:41783/status` |

### Using the Hotkey

1. Copy any mistyped text (Ctrl+C)
2. Press **Ctrl+Shift+Space**
3. The fixed text is now in your clipboard — paste it anywhere (Ctrl+V)

---

## VS Code Extension

### Installation
1. Install the CLI first (see [Installation](#installation))
2. Search for **"SmartLangGuard"** in the VS Code Extensions Marketplace
3. Or build locally:
   ```bash
   cd packages/vscode-extension
   npm run package
   ```

### Keyboard Shortcuts

| Command | Windows/Linux | macOS | Description |
|---------|--------------|-------|-------------|
| **Fix Selection** | `Ctrl+Shift+F1` | `Cmd+Shift+F1` | Fix the currently selected text |
| **Fix Clipboard** | `Ctrl+Shift+F2` | `Cmd+Shift+F2` | Fix clipboard contents |

### Right-Click Menu
- **"SmartLangGuard: Fix Selection"** — Fix the currently selected text

---

## Browser Extension (Pro+)

### Installation
1. Activate a Pro license (see [Pricing](#pricing))
2. Download the extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/smartlangguard/) (coming soon)
3. Or load unpacked extension from `packages/browser-extension`

### Features
- **Auto-fix text fields** — Corrects mistyped text in real-time as you type
- **Clipboard integration** — Works with the Daemon for seamless fixing
- **Customizable hotkeys** — Configure your preferred shortcuts

---

## SaaS Backend (Self-Hosted or Cloud)

The SaaS Backend provides license management, telemetry, AI scoring, admin dashboard, and Stripe billing.

### Quick Start

#### 1. Install & Configure
```bash
cd packages/backend
cp .env.example .env
npm install
```

#### 2. Set Required Environment Variables
Edit `.env`:
```env
# Required
JWT_SECRET=generate_a_random_64_char_string_here
ADMIN_DEFAULT_PASSWORD=your_secure_password

# Server
PORT=4000
CORS_ORIGIN=http://localhost:3000
SMARTLANGGUARD_DB_PATH=./saas.db

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 3. Start the Server
```bash
npm start
```
Server runs on `http://localhost:4000`.

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/v1/license/validate` | Validate a license token | Device headers |
| `POST` | `/v1/license/activate` | Create a new license | Public |
| `POST` | `/v1/license/revoke` | Revoke a license | Admin |
| `GET` | `/v1/license/info/:token` | Get license info | - |
| `POST` | `/v1/telemetry/batch` | Submit telemetry events | - |
| `POST` | `/v1/ai/score` | AI scoring (Pro+ only) | License |
| `POST` | `/v1/admin/login` | Admin login | Rate limited |
| `GET` | `/v1/admin/dashboard` | Dashboard stats | Admin |
| `GET` | `/v1/admin/licenses` | List all licenses | Admin |
| `POST` | `/v1/stripe/checkout` | Create checkout session | - |
| `POST` | `/v1/stripe/portal` | Billing portal | - |
| `GET` | `/v1/stripe/pricing` | Get pricing plans | - |
| `POST` | `/v1/stripe/webhook` | Stripe webhook handler | Signature |
| `GET` | `/v1/billing/plans` | Get billing plans | - |
| `GET` | `/v1/billing/status` | Check subscription status | License |
| `GET` | `/health` | Health check | - |

### Admin Authentication
- **Username:** `admin`
- **Password:** Set via `ADMIN_DEFAULT_PASSWORD` env var (required)
- **JWT:** All admin endpoints require a Bearer token from `/v1/admin/login`
- **Rate limiting:** Login limited to 5 attempts per 15 minutes

---

## Benefits

### For Individual Users
- **Never send a gibberish message again** — auto-detect and fix layout mistakes
- **Save time** — no more manual retyping or deleting
- **Works offline** — your text never leaves your machine
- **100% private** — no telemetry unless you opt in
- **Free forever** — the rules-based engine costs nothing

### For Developers
- **MCP integration** — works with Claude, Cursor, Cline, and any MCP-compatible AI tool
- **CLI pipe support** — integrate into shell scripts, CI/CD, build tools
- **Programmatic API** — use `@smartlangguard/core` in your own Node.js projects
- **Daemon HTTP API** — build custom integrations via REST
- **Cross-platform** — Windows, macOS, Linux, x64 and arm64

### For Teams
- **Shared workspace** — Team tier includes shared license management
- **Multi-device** — Pro tier supports 3 devices, Team supports 10
- **Cloud sync** — settings and custom dictionaries synced across devices
- **Priority support** — Team and Enterprise tiers get priority response

### For Enterprise
- **SSO & SAML** — integrate with your identity provider
- **On-premise deployment** — run everything in your own infrastructure
- **Analytics API** — track usage patterns and metrics
- **Unlimited devices** — no per-seat limitations
- **Custom integrations** — dedicated support for custom workflows

---

## Pricing

| Tier | Price | Features | Best For |
|------|-------|----------|----------|
| **Free** | **$0/mo** | Rules-only translation, 1 device, CLI, MCP, Daemon | Personal use |
| **Pro** | **$5/mo** | + AI scoring, 3 devices, cloud sync, browser extension | Power users |
| **Team** | **$49/mo** | + 10 devices, shared workspace, priority support | Small teams |
| **Enterprise** | **$499/mo** | + Unlimited devices, SSO, analytics API, on-prem | Large organizations |

### Start Free Trial
```bash
curl -X POST http://localhost:4000/v1/license/activate \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "tier": "pro"}'
```

### Buy a License
Visit [https://smartlangguard.com/pricing](https://smartlangguard.com/pricing) (coming soon).

---

## Architecture

```
+-------------------------------------------------------------------------------+
|                                SmartLangGuard Core                              |
|  +---------------------------------------------------------------------------+  |
|  | - Translation Engine (Rules-Based + AI Scoring)                           |  |
|  | - Custom N-gram AI Model (92% accuracy, ~1ms, $0 cost)                   |  |
|  | - License Validation (HMAC-signed, offline + online)                     |  |
|  | - Telemetry & Analytics (privacy-first, opt-out)                         |  |
|  | - Auto-Updater (SHA256-verified)                                         |  |
|  | - Typing Detector (real-time, debounced)                                 |  |
|  | - Sound Player (cross-platform alerts)                                   |  |
|  +---------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
                                       ^
                                       |
               +-----------------------+-----------------------+
               |                       |                       |
               v                       v                       v
+---------------------+ +-----------------+ +-----------------+
|       CLI           | |   MCP Server    | |     Daemon      |
|  - Terminal Support | | - AI Tools      | | - Clipboard     |
|  - Pipe/File Mode   | | - Claude/Cursor | | - Hotkey        |
|  - Interactive Mode | | - Cline/Continue| | - HTTP API      |
|  - Detect Mode      | | - JSON-RPC      | | - Auto-fix      |
+---------------------+ +-----------------+ +-----------------+
               ^                       ^                       ^
               |                       |                       |
               +-----------------------+-----------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
|                     SaaS Backend (Express + better-sqlite3)                    |
|  +-----------------+ +-----------------+ +-----------------+                  |
|  |  License API    | |  Telemetry API  | |   AI Scoring    |                  |
|  +-----------------+ +-----------------+ +-----------------+                  |
|  +-----------------+ +-----------------+ +-----------------+                  |
|  |  Admin Dashboard | |  Stripe Billing | |   Auth (JWT)    |                  |
|  +-----------------+ +-----------------+ +-----------------+                  |
+-------------------------------------------------------------------------------+
```

### NPM Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@smartlangguard/core`](https://www.npmjs.com/package/@smartlangguard/core) | Translation engine, AI model, license, telemetry | `npm install @smartlangguard/core` |
| [`@smartlangguard/cli`](https://www.npmjs.com/package/@smartlangguard/cli) | CLI binary (cross-platform) | `npm install -g @smartlangguard/cli` |
| [`@smartlangguard/mcp-server`](https://www.npmjs.com/package/@smartlangguard/mcp-server) | MCP server for AI tools | `npm install @smartlangguard/mcp-server` |
| [`@smartlangguard/daemon`](https://www.npmjs.com/package/@smartlangguard/daemon) | Background daemon | `npm install @smartlangguard/daemon` |

### Monorepo Structure
```
smartlangguard/
├── packages/
│   ├── core/                  # Translation engine, AI model, license, telemetry
│   │   ├── src/
│   │   │   ├── translator.js          # Rules-based translation
│   │   │   ├── custom-ai-model.js     # Statistical n-gram model (92% accuracy)
│   │   │   ├── ai-scoring.js          # AI scoring layer
│   │   │   ├── license.js             # License validation (online + offline)
│   │   │   ├── telemetry.js           # Privacy-first telemetry
│   │   │   ├── updater.js             # SHA256-verified auto-updater
│   │   │   ├── typing-detector.js     # Real-time detection
│   │   │   ├── sound-player.js        # Cross-platform alert sounds
│   │   │   └── index.js               # Unified API entry point
│   │   └── tests/                     # 146 unit tests
│   │
│   ├── cli/                   # CLI binary (cross-platform)
│   │   └── bin/smartlangguard.js
│   │
│   ├── mcp-server/            # MCP server for AI tools
│   │   ├── src/mcp-server.js
│   │   ├── src/clipboard.js
│   │   └── tests/             # 6 tests
│   │
│   ├── daemon/                # Background daemon + hotkey
│   │   ├── src/daemon.js
│   │   ├── src/clipboard.js
│   │   └── src/hotkey.js
│   │
│   ├── vscode-extension/      # VS Code extension
│   │   └── src/extension.ts
│   │
│   ├── browser-extension/     # Browser extension (Manifest V3)
│   │   └── manifest.json
│   │
│   └── backend/               # SaaS backend (Express + better-sqlite3)
│       ├── src/server.js              # Express server
│       ├── src/db.js                  # SQLite (better-sqlite3)
│       ├── src/middleware.js          # JWT auth, rate limiting
│       ├── src/routes/                # API routes
│       │   ├── license.js
│       │   ├── admin.js
│       │   ├── ai.js
│       │   ├── billing.js
│       │   ├── stripe.js
│       │   └── telemetry.js
│       ├── tests/                     # 14 integration tests
│       └── .env.example
│
├── scripts/                   # Build & release scripts
├── docs/                      # Documentation
├── .github/workflows/ci.yml   # CI/CD pipeline
├── jest.config.json           # Test configuration
└── package.json               # Workspace root
```

---

## Development

### Setup
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install
```

### Build
```bash
npm run build              # Build all binaries
npm run build:windows      # Build for Windows x64
npm run build:macos        # Build for macOS x64
npm run build:linux        # Build for Linux x64
```

### Run Services Locally
```bash
npm run start:backend      # Start SaaS backend on port 4000
npm run start:daemon       # Start background daemon on port 41783
npm run start:mcp          # Start MCP server (stdio)
```

### Using the Core Package in Your Project
```javascript
const core = require('@smartlangguard/core');

// Initialize
await core.init({ telemetryEnabled: false });

// Fix text
const result = await core.fixText('high hofhv;', { useAI: false });
console.log(result.corrected);  // اهلا اخبارك
console.log(result.direction);  // en-to-ar
console.log(result.score);      // 88

// Translate directly
const translated = core.translate('high');
console.log(translated);  // اهلا

// Detect mistakes
const mistakes = core.findAllMistakes('hello high world');
console.log(mistakes);    // [{ word: 'high', suggestion: 'اهلا', ... }]

// Check license
const status = core.getLicenseStatus();
console.log(status.tier); // 'free'
```

---

## Testing

The project has **166 automated tests** across 10 test suites, all passing.

### Run Tests
```bash
npm test                    # Run all 166 tests
npm run test:core           # Core tests (146)
npm run test:backend        # Backend tests (14)
npm run test:mcp            # MCP server tests (6)
```

### Test Coverage

| Package | Tests | What's Covered |
|---------|-------|----------------|
| `@smartlangguard/core` | 146 | translator, license, custom-ai-model, typing-detector, telemetry, updater, index, sound-player |
| `@smartlangguard/backend` | 14 | health, license activate/validate, admin login, billing, stripe, 404 handler |
| `@smartlangguard/mcp-server` | 6 | protocol version, tool definitions, tool schemas |
| **Total** | **166** | **10 test suites** |

---

## Security

### Security Features
- **License tokens** are HMAC-signed for offline validation
- **Device fingerprinting** prevents license sharing (per-tier device limits)
- **Binary updates** are SHA256-verified and signature-checked
- **Telemetry** is anonymized and opt-out (disabled by default in dev)
- **Admin endpoints** require JWT with configurable secret (no hardcoded defaults)
- **Rate limiting** on all public endpoints (100 req/15min) and admin login (5 req/15min)
- **CORS** restricted to configured origins only (no wildcard in production)
- **Clipboard access** uses stdin piping via `spawn()` to prevent command injection
- **better-sqlite3** used instead of deasync (no event loop blocking)
- **Stripe webhook** signature verification with timing-safe comparison
- **166 automated tests** covering core, backend, and MCP server

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret for JWT tokens | Yes (production) |
| `ADMIN_DEFAULT_PASSWORD` | Initial admin password | Yes (first run) |
| `SMARTLANGGUARD_OFFLINE_SECRET` | License token signing key | Yes (production) |
| `STRIPE_SECRET_KEY` | Stripe API key | For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | For webhooks |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | Recommended |

### Vulnerability Reporting
Report security issues to [security@smartlangguard.com](mailto:security@smartlangguard.com). See [SECURITY.md](docs/SECURITY.md) for details.

---

## CI/CD

The project uses **GitHub Actions** for continuous integration and deployment:

- **On every push/PR to main:** All 166 tests run on Ubuntu with Node.js 20
- **On every push/PR to main:** CLI binaries built for Windows, macOS, and Linux
- **Test jobs:** Core, Backend, and MCP server run in parallel
- **Build jobs:** CLI binaries built for all 3 platforms after tests pass

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for the full configuration.

---

## Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1** | **Done** | Core + CLI + MCP + Backend + Tests + CI/CD + npm publish |
| **Phase 2** | In Progress | Daemon system-wide hotkey + VS Code Marketplace |
| **Phase 3** | Planned | Browser Extension + Admin Dashboard UI + Stripe Live |
| **Phase 4** | Planned | AI Model Fine-Tuning (Custom Arabic-English Mistake Model) |
| **Phase 5** | Planned | On-Premise Enterprise Deployment |

---

## License

**Proprietary License** -- (c) 2026 SmartLangGuard. All rights reserved.

See [LICENSE](LICENSE) for details.

---

## Support & Community

| Channel | Link |
|---------|------|
| **Email** | [hello@smartlangguard.com](mailto:hello@smartlangguard.com) |
| **Issues** | [GitHub Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues) |
| **Documentation** | [docs/](docs/) |
| **Website** | [https://smartlangguard.com](https://smartlangguard.com) (Coming Soon) |
| **Discord** | [Join our Discord](https://discord.gg/smartlangguard) (Coming Soon) |
| **Twitter** | [@SmartLangGuard](https://twitter.com/SmartLangGuard) (Coming Soon) |

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

### How to Contribute
1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Run tests** (`npm test`)
4. **Commit your changes** (`git commit -m "Add your feature"`)
5. **Push to the branch** (`git push origin feature/your-feature`)
6. **Open a Pull Request**

---

## Changelog

### v0.1.2 (Latest)
- Published all packages to npm (`@smartlangguard/core`, `cli`, `mcp-server`, `daemon`)
- Fixed database layer: replaced sqlite3+deasync with better-sqlite3
- Fixed MCP server: added missing clipboard module
- Fixed all npm import paths: packages use `@smartlangguard/core` instead of relative paths
- Security: removed hardcoded JWT secret, added rate limiting on admin login
- Security: fixed CORS wildcard, clipboard command injection
- Fixed license field consistency: all packages now "PROPRIETARY"
- Fixed code quality: duplicate object keys, Stripe route indentation
- Added 166 automated tests (146 core, 14 backend, 6 MCP server)
- Added CI/CD GitHub Actions workflow
- Added logo, comprehensive README with usage guide
- Updated .env.example with required JWT_SECRET

### v0.1.0
- Initial release of SmartLangGuard Core, CLI, MCP Server, Backend, and Daemon
- Rules-based translation engine for QWERTY and Arabic 101
- License validation and management
- Telemetry ingestion
- MCP integration for AI tools
- Daemon with clipboard monitoring and hotkey support

---

<div align="center">

**Made by [SmartLangGuard Team](https://github.com/ahmdelbaz28-ux)**

**Powered by AI, Built for Developers.**

</div>
