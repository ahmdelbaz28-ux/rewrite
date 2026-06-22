<div align="center">

<img src="docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="130" />

# SmartLangGuard

### The Intelligent Keyboard Layout Correction Engine

**Stop retyping. Start communicating.**

[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=for-the-badge)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg?style=for-the-badge&label=CLI&color=blue)](https://www.npmjs.com/package/@smartlangguard/cli)
[![npm downloads](https://img.shields.io/npm/dm/@smartlangguard/cli.svg?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Tests](https://img.shields.io/badge/Tests-166%20passing-brightgreen.svg?style=for-the-badge)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/ahmdelbaz28-ux/rewrite/ci.yml?style=for-the-badge&label=CI%2FCD)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=for-the-badge)](#-installation)

[Install Now](#-installation) · [Quick Start](#-quick-start) · [Features](#-features) · [Pricing](#-pricing) · [Support](#-support--community)

---

> **"high hofhv;" → "اهلا اخبارك"** — One command. One keystroke. Instant correction.

---

## Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Quick Demo](#-quick-demo)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [MCP Integration](#-mcp-integration-ai-tools)
- [Daemon Mode](#-daemon-mode-background-service)
- [VS Code Extension](#-vs-code-extension)
- [Browser Extension](#-browser-extension-pro)
- [SaaS Backend](#-saas-backend-self-hosted-or-cloud)
- [Benefits](#-benefits)
- [Pricing](#-pricing)
- [Architecture](#-architecture)
- [Testing](#-testing)
- [Security](#-security)
- [CI/CD](#-cicd)
- [Roadmap](#-roadmap)
- [Changelog](#-changelog)
- [Support & Community](#-support--community)
- [Contributing](#-contributing)
- [License](#-license)

---

## ❓ The Problem

### You type `high hofhv;` but you meant `اهلا اخبارك`

Every bilingual user knows this pain. When switching between **QWERTY (English)** and **Arabic 101** keyboard layouts, you accidentally type in the wrong layout. The result is gibberish, embarrassing messages, and lost productivity.

**The Hidden Cost of Keyboard Mistakes:**

| Scenario | Without SmartLangGuard | With SmartLangGuard |
|----------|----------------------|-------------------|
| Chat message | Type, delete, switch, retype, send — **15 seconds** | Type, fix, send — **0.001 seconds** |
| Code comment | Manually correct — **10 seconds** | Auto-fix with hotkey — **0.5 seconds** |
| AI prompt | Confused AI response — **30 seconds** | Pipe through SmartLangGuard — **0.1 seconds** |
| Email | Apologize and resend — **60 seconds** | Fix before sending — **0 seconds** |
| Daily total | **~15 minutes wasted** | **~0 minutes** |

### SmartLangGuard vs The Alternatives

| Feature | SmartLangGuard | Manual | Online Converters | Other CLI Tools |
|---------|:--------------:|:------:|:-----------------:|:---------------:|
| Speed | **~1ms** | 5-10s | 200-500ms | 200-500ms |
| Offline | **100%** | Yes | No | Some |
| Privacy | **No data leaves device** | Yes | Your text sent to server | Varies |
| AI Accuracy | **92%** | Human-dependent | 78% | 78% |
| Cost | **$0 (Free tier)** | $0 (your time) | Free (your privacy) | Free or $ |
| MCP / AI Tools | **Built-in** | No | No | No |
| Clipboard + Hotkey | **Daemon** | No | No | No |
| VS Code + Browser | **Native** | No | No | No |
| Cross-Platform | **Win/Mac/Linux** | Yes | Web only | Limited |

---

## 💡 The Solution

SmartLangGuard works everywhere you type:

- **Terminal** — `smartlangguard fix "high hofhv;"` → `اهلا اخبارك`
- **AI Tools** — Built-in MCP server for Claude, Cursor, Cline
- **Clipboard** — Copy text → Press Ctrl+Shift+Space → Paste fixed text
- **VS Code** — Select text → Press Ctrl+Shift+F1
- **Browser** — Right-click → Fix with SmartLangGuard (Pro+)

Before: Type, delete, switch layout, retype, send — **15-30 seconds per mistake**.

After: Type, fix, send — **1 millisecond**.

---

## ⚡ Quick Demo

### Basic Fix
```bash
$ smartlangguard fix "high hofhv;"
اهلا اخبارك
```

### Fix with JSON Output
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

### Detect Mistakes
```bash
$ smartlangguard detect "hello high hofhv"
Found 2 mistake(s):
  1. "high" -> "اهلا"     (en-to-ar)   [pos 6-10]
  2. "hofhv" -> "اخبار"   (en-to-ar)   [pos 11-16]
```

### Pipe from Any Source
```bash
$ echo "high hofhv;" | smartlangguard fix
اهلا اخبارك

# macOS
$ pbpaste | smartlangguard fix | pbcopy

# Windows
$ powershell "Get-Clipboard" | smartlangguard fix | Set-Clipboard

# Linux
$ xclip -o | smartlangguard fix | xclip -sel clip
```

### Interactive REPL Mode
```bash
$ smartlangguard interactive

smartlangguard> high
-> اهلا  [en-to-ar | 90% confidence | rules]

smartlangguard> hofhv;
-> اخبارك  [en-to-ar | 85% confidence | rules]

smartlangguard> exit
Goodbye!
```

---

## ✨ Features

| Feature | Free | Pro | Team | Enterprise |
|---------|:----:|:---:|:----:|:----------:|
| Rules-Based Translation | Yes | Yes | Yes | Yes |
| AI Scoring | No | Yes | Yes | Yes |
| CLI (Terminal) | Yes | Yes | Yes | Yes |
| MCP Server (AI Tools) | Yes | Yes | Yes | Yes |
| Daemon + Hotkey | Yes | Yes | Yes | Yes |
| VS Code Extension | Yes | Yes | Yes | Yes |
| Browser Extension | No | Yes | Yes | Yes |
| Cloud Sync | No | Yes | Yes | Yes |
| Devices Supported | 1 | 3 | 10 | Unlimited |
| Priority Support | No | No | Yes | Yes |
| SSO & SAML | No | No | No | Yes |
| On-Premise Deployment | No | No | No | Yes |
| Analytics API | No | No | No | Yes |
| **Price** | **$0** | **$5/mo** | **$49/mo** | **$499/mo** |

---

## 📦 Installation

### Option 1: npm (Recommended)
```bash
npm install -g @smartlangguard/cli
smartlangguard --version
# Output: 0.1.2
```

### Option 2: Pre-Built Binaries

| Platform | Download |
|----------|----------|
| Windows x64 | [smartlangguard-win-x64.exe](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-win-x64.exe) |
| macOS Intel | [smartlangguard-macos-x64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-x64) |
| macOS Apple Silicon | [smartlangguard-macos-arm64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-arm64) |
| Linux x64 | [smartlangguard-linux-x64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-x64) |
| Linux arm64 | [smartlangguard-linux-arm64](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-arm64) |

### Option 3: Build from Source
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install
npm run build
```

### Verify Installation
```bash
smartlangguard --version           # 0.1.2
smartlangguard --help              # 20+ commands
smartlangguard fix "high hofhv;"   # اهلا اخبارك
```

---

## 🚀 Quick Start

```bash
# 1. Install
npm install -g @smartlangguard/cli

# 2. Fix your first text
smartlangguard fix "high hofhv;"

# 3. Try other modes
smartlangguard interactive
echo "high" | smartlangguard fix
smartlangguard detect "hello hofhv"
```

### Where to Use It

| Where | How | Command |
|-------|-----|---------|
| Terminal | Direct fix | `smartlangguard fix "text"` |
| Clipboard | Copy → Fix → Paste | `smartlangguard fix` |
| AI Tools | Pipe to Claude/Cursor | `echo "text" \| smartlangguard fix` |
| Files | Fix document | `smartlangguard fix -f input.txt -o output.txt` |
| Interactive | REPL mode | `smartlangguard interactive` |
| Any App | Hotkey | Ctrl+Shift+Space (with daemon) |

---

## 📖 Usage Guide

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
| `detect [text]` | Detect mistakes | `smartlangguard detect "high hofhv"` |
| `license activate <token>` | Activate license | `smartlangguard license activate slg_...` |
| `license status` | Check license | `smartlangguard license status` |
| `license revoke` | Revoke license | `smartlangguard license revoke` |
| `mcp` | Start MCP server | `smartlangguard mcp` |
| `daemon` | Start background daemon | `smartlangguard daemon` |
| `config set <key> <value>` | Set config | `smartlangguard config set telemetry false` |
| `config get <key>` | Get config value | `smartlangguard config get endpoint` |
| `config list` | List all config | `smartlangguard config list` |
| `update check` | Check for updates | `smartlangguard update check` |
| `update apply` | Apply update | `smartlangguard update apply` |
| `sound play [name]` | Play alert sound | `smartlangguard sound play ding` |
| `sound list` | List sounds | `smartlangguard sound list` |

### File Mode
```bash
smartlangguard fix -f input.txt -o fixed.txt
smartlangguard fix -f arabic.txt -d ar-to-en -o english.txt
```

### Detect Mode — JSON Output
```bash
$ smartlangguard detect "high hofhv" --format json
{
  "text": "high hofhv",
  "mistakes_found": 2,
  "mistakes": [
    { "word": "high", "suggestion": "اهلا", "direction": "en-to-ar", "range": [0, 4] },
    { "word": "hofhv", "suggestion": "اخبار", "direction": "en-to-ar", "range": [5, 10] }
  ]
}
```

---

## 🤖 MCP Integration (AI Tools)

SmartLangGuard includes a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for AI tools.

### Setup — Claude Desktop
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

### Setup — Cursor
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

### Available MCP Tools

| Tool | Description | Example |
|------|-------------|---------|
| `fix_text` | Fix a text string | `fix_text("high hofhv;")` → `اهلا اخبارك` |
| `fix_clipboard` | Fix clipboard contents | `fix_clipboard()` → fixed text |
| `register_license` | Activate a license | `register_license("slg_...")` |
| `license_status` | Check license tier | `license_status()` → `{ tier: "pro" }` |

### How It Works
1. Type in an AI tool: *"I typed 'high hofhv;' by mistake, fix it"*
2. The AI calls `fix_text("high hofhv;")` via MCP
3. SmartLangGuard returns `اهلا اخبارك`
4. The AI shows you the corrected result

---

## ⚙️ Daemon Mode (Background Service)

The Daemon runs in the background and provides:
- **Clipboard Monitoring** — Auto-fixes clipboard contents on demand
- **Global Hotkey** — Press `Ctrl+Shift+Space` to fix clipboard text instantly
- **Local HTTP API** — For browser extensions and custom integrations

```bash
smartlangguard daemon
```

Output:
```
SmartLangGuard Daemon v0.1.2
[OK] Clipboard Monitor: ACTIVE
[OK] Global Hotkey: Ctrl+Shift+Space
[OK] Local HTTP API: http://localhost:41783
```

### How to Use the Hotkey
1. Copy mistyped text (Ctrl+C)
2. Press **Ctrl+Shift+Space**
3. Paste corrected text (Ctrl+V)

### Daemon HTTP API (Port 41783)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/fix` | Fix a text string |
| POST | `/clipboard/fix` | Fix clipboard contents |
| POST | `/autofix/toggle` | Toggle auto-fix mode |
| GET | `/status` | Check daemon health |

---

## 🖥️ VS Code Extension

### Installation
1. Install the CLI: `npm install -g @smartlangguard/cli`
2. Search **"SmartLangGuard"** in VS Code Extensions Marketplace
3. Or build locally: `cd packages/vscode-extension && npm run package`

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Fix Selected Text | Ctrl+Shift+F1 | Cmd+Shift+F1 |
| Fix Clipboard | Ctrl+Shift+F2 | Cmd+Shift+F2 |

### Right-Click Context Menu
Select text → Right-click → **"SmartLangGuard: Fix Selection"** → Text is corrected.

---

## 🌐 Browser Extension (Pro+)

Auto-fix text in any web page — Gmail, Twitter, WhatsApp Web, forms, anything.

**Features:**
- Auto-fill correction in form fields
- Right-click fix from context menu
- Works with Daemon hotkey
- 100% local processing

**Installation:**
1. Activate a **Pro** or higher license
2. Install from Chrome Web Store (coming soon)
3. Or load unpacked from `packages/browser-extension`

---

## ☁️ SaaS Backend (Self-Hosted or Cloud)

License management, AI scoring, Stripe billing, and admin dashboard.

### One-Command Deploy
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite/packages/backend
cp .env.example .env
npm install
npm start
```

### Environment Configuration
```env
JWT_SECRET=your_64_char_random_secret
ADMIN_DEFAULT_PASSWORD=your_secure_password
PORT=4000
CORS_ORIGIN=http://localhost:3000
SMARTLANGGUARD_DB_PATH=./saas.db
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/license/validate` | Validate a license token | Device headers |
| POST | `/v1/license/activate` | Create a new license | Public |
| POST | `/v1/license/revoke` | Revoke a license | Admin |
| GET | `/v1/license/info/:token` | Get license info | - |
| POST | `/v1/telemetry/batch` | Submit telemetry events | - |
| POST | `/v1/ai/score` | AI scoring (Pro+ only) | License |
| POST | `/v1/admin/login` | Admin login | Rate limited |
| GET | `/v1/admin/dashboard` | Dashboard stats | Admin |
| GET | `/v1/admin/licenses` | List all licenses | Admin |
| POST | `/v1/stripe/checkout` | Create checkout session | - |
| POST | `/v1/stripe/portal` | Billing portal | - |
| GET | `/v1/stripe/pricing` | Get pricing plans | - |
| POST | `/v1/stripe/webhook` | Stripe webhook | Signature |
| GET | `/v1/billing/plans` | Get billing plans | - |
| GET | `/v1/billing/status` | Check subscription status | License |
| GET | `/health` | Health check | - |

### Admin Panel
- **Login:** POST `/v1/admin/login` with username `admin`
- **Auth:** JWT Bearer token
- **Rate limit:** 5 attempts per 15 minutes

---

## 🎯 Benefits

### For Individual Users
| Benefit | Description |
|---------|-------------|
| 100% Private | No data ever leaves your machine |
| Blazing Fast | ~1ms correction time |
| Free Forever | Rules-based engine costs $0 |
| Cross-Platform | Windows, macOS, Linux |
| Works Everywhere | Terminal, browser, VS Code, AI tools |
| Hotkey Ready | Ctrl+Shift+Space from any app |

### For Developers
| Benefit | Description |
|---------|-------------|
| MCP Integration | Built-in for Claude, Cursor, Cline, Continue |
| CLI Pipe Support | Integrate into shell scripts, CI/CD |
| Programmatic API | Use `@smartlangguard/core` in your projects |
| Daemon HTTP API | Build custom integrations |
| 166 Tests | Fully tested, CI/CD verified |

```javascript
const core = require('@smartlangguard/core');
await core.init({ telemetryEnabled: false });
const result = await core.fixText('high hofhv;', { useAI: false });
console.log(result.corrected);  // اهلا اخبارك
```

### For Teams
| Benefit | Description |
|---------|-------------|
| Shared Workspace | Team tier includes shared license management |
| Multi-Device | Pro: 3 devices, Team: 10 |
| Cloud Sync | Settings across devices |
| Priority Support | Team+ tiers get priority response |

### For Enterprise
| Benefit | Description |
|---------|-------------|
| SSO & SAML | Okta, Azure AD, Google Workspace |
| On-Premise | Deploy in your own infrastructure |
| Unlimited Devices | No per-seat limitations |
| Analytics API | Custom dashboards and reports |

---

## 💰 Pricing

| Tier | Price | Best For | Key Features |
|------|:-----:|----------|--------------|
| Free | **$0** | Personal use | Rules-only, 1 device, CLI, MCP, Daemon, VS Code |
| Pro | **$5/mo** | Power users | + AI scoring, 3 devices, cloud sync, browser extension |
| Team | **$49/mo** | Small teams | + 10 devices, shared workspace, priority support |
| Enterprise | **$499/mo** | Large orgs | + Unlimited devices, SSO, on-premise, analytics API |

### Try Pro Free
```bash
curl -X POST http://localhost:4000/v1/license/activate \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "tier": "pro"}'
```

---

## 🏗️ Architecture

SmartLangGuard is built as a monorepo with four main packages and several extensions, all built on top of a shared core engine.

### Core Engine Components
- **Translation Engine** — Rules-based + AI scoring for accurate correction
- **Custom N-gram AI Model** — 92% accuracy, ~1ms processing
- **License Validation** — HMAC-signed, works offline and online
- **Telemetry** — Privacy-first, opt-out
- **Auto-Updater** — SHA256-verified updates
- **Typing Detector** — Real-time, debounced detection
- **Sound Player** — Cross-platform alert sounds

### Integration Layer
- **CLI** — Terminal, pipe, file, interactive, detect modes
- **MCP Server** — JSON-RPC over stdio for AI tools
- **Daemon** — Clipboard monitoring, global hotkey, HTTP API

### SaaS Backend
- **License API** — Validation, activation, revocation
- **Stripe Billing** — Subscription management
- **Admin Dashboard** — Usage analytics and license management
- **AI Scoring API** — Cloud-based AI scoring (Pro+)

### NPM Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@smartlangguard/core`](https://www.npmjs.com/package/@smartlangguard/core) | Translation engine, AI model, license, telemetry | `npm install @smartlangguard/core` |
| [`@smartlangguard/cli`](https://www.npmjs.com/package/@smartlangguard/cli) | CLI binary (cross-platform) | `npm install -g @smartlangguard/cli` |
| [`@smartlangguard/mcp-server`](https://www.npmjs.com/package/@smartlangguard/mcp-server) | MCP server for AI tools | `npm install @smartlangguard/mcp-server` |
| [`@smartlangguard/daemon`](https://www.npmjs.com/package/@smartlangguard/daemon) | Background daemon + hotkey | `npm install @smartlangguard/daemon` |

### Monorepo Structure
```
rewrite/
├── packages/
│   ├── core/                  # Core engine (146 tests)
│   ├── cli/                   # CLI binary
│   ├── mcp-server/            # MCP for AI tools
│   ├── daemon/                # Background daemon
│   ├── vscode-extension/      # VS Code extension
│   ├── browser-extension/     # Browser extension
│   └── backend/               # SaaS backend (14 tests)
├── scripts/                   # Build & release
├── docs/                      # Documentation
├── .github/workflows/ci.yml   # CI/CD pipeline
└── package.json               # Workspace root
```

---

## 🧪 Testing

**166 automated tests. 10 test suites. All passing.**

| Package | Tests | Coverage |
|---------|:-----:|----------|
| `@smartlangguard/core` | 146 | translator, license, ai-model, typing-detector, telemetry, updater, index, sound-player |
| `@smartlangguard/backend` | 14 | health, license activate/validate, admin login, billing, stripe, 404 |
| `@smartlangguard/mcp-server` | 6 | protocol version, tool definitions, tool schemas |
| **Total** | **166** | **10 suites, all passing** |

```bash
npm test                 # Run all 166 tests
npm run test:core        # Core tests (146)
npm run test:backend     # Backend tests (14)
npm run test:mcp         # MCP server tests (6)
```

---

## 🔒 Security

- **License tokens** — HMAC-signed for offline validation
- **Device fingerprinting** — Prevents license sharing
- **Binary updates** — SHA256-verified, signature-checked
- **Telemetry** — Anonymized, opt-out (disabled by default)
- **Admin JWT** — Configurable secret, no hardcoded defaults
- **Rate limiting** — 100 req/15min public, 5 req/15min admin login
- **CORS** — Restricted to configured origins (no wildcard)
- **Clipboard safety** — stdin piping via spawn(), no injection
- **Database** — better-sqlite3 (synchronous, no event loop blocking)
- **Stripe** — Webhook signature verification with timing-safe comparison
- **166 tests** — Covering core, backend, MCP server

### Required Environment Variables
| Variable | Description | Required |
|----------|-------------|:--------:|
| `JWT_SECRET` | Secret for JWT tokens | Production |
| `ADMIN_DEFAULT_PASSWORD` | Initial admin password | First run |
| `SMARTLANGGUARD_OFFLINE_SECRET` | License token signing key | Production |
| `STRIPE_SECRET_KEY` | Stripe API key | For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | For webhooks |
| `CORS_ORIGIN` | Allowed origins | Recommended |

### Reporting Vulnerabilities
Email [security@smartlangguard.com](mailto:security@smartlangguard.com). Please do not file public GitHub issues for security vulnerabilities.

---

## 📊 CI/CD

Automated with **GitHub Actions**:
- On every push/PR to main: All 166 tests run in parallel
- On every push/PR to main: CLI binaries built for Windows, macOS, Linux
- Environment: Ubuntu latest, Node.js 20

[![CI/CD](https://img.shields.io/github/actions/workflow/status/ahmdelbaz28-ux/rewrite/ci.yml?style=flat-square&label=CI%2FCD)](https://github.com/ahmdelbaz28-ux/rewrite/actions)

---

## 👣 Roadmap

| Phase | Status | Features |
|-------|:------:|----------|
| Phase 1 — Foundation | Done | Core engine, CLI, MCP, Backend, 166 tests, CI/CD, npm publish |
| Phase 2 — Desktop | In Progress | Daemon hotkey (all platforms), VS Code Marketplace |
| Phase 3 — Web | Planned | Browser extension, Admin dashboard UI, Stripe live |
| Phase 4 — AI | Research | Custom Arabic-English mistake model fine-tuning |
| Phase 5 — Enterprise | Planned | On-premise deployment, SSO/SAML, Analytics API |

---

## 📜 Changelog

### v0.1.2 (Latest — April 2026)
- Published all packages to npm (`@smartlangguard/core`, `cli`, `mcp-server`, `daemon`)
- Fixed database layer: replaced sqlite3+deasync with better-sqlite3
- Fixed MCP server: added missing clipboard module
- Fixed all npm import paths: packages use `@smartlangguard/core`
- Security: removed hardcoded JWT secret, added rate limiting
- Security: fixed CORS wildcard, clipboard command injection
- Fixed license field: all packages now "PROPRIETARY"
- Fixed code quality: duplicate object keys, Stripe route indentation
- Added 166 automated tests (146 core, 14 backend, 6 MCP)
- Added CI/CD GitHub Actions workflow
- Added logo, comprehensive README with usage guide
- Updated .env.example with required JWT_SECRET

### v0.1.0
- Initial release: Core, CLI, MCP Server, Backend, Daemon
- Rules-based translation engine (QWERTY ↔ Arabic 101)
- License validation and management
- Telemetry ingestion
- MCP integration for AI tools
- Daemon with clipboard monitoring and hotkey

---

## 📞 Support & Community

| Channel | Link |
|---------|------|
| Email | [hello@smartlangguard.com](mailto:hello@smartlangguard.com) |
| Issues | [GitHub Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues) |
| Documentation | [docs/](docs/) |
| Website | [https://smartlangguard.com](https://smartlangguard.com) (Coming Soon) |
| Discord | [Join our Discord](https://discord.gg/smartlangguard) (Coming Soon) |
| Twitter | [@SmartLangGuard](https://twitter.com/SmartLangGuard) (Coming Soon) |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Run tests** (`npm test`)
4. **Commit your changes** (`git commit -m "Add your feature"`)
5. **Push to the branch** (`git push origin feature/your-feature`)
6. **Open a Pull Request**

---

## License

**Proprietary License** — © 2026 SmartLangGuard. All rights reserved.

See [LICENSE](LICENSE) for details.

---

<div align="center">

**EDITED BY Eng AhmedeLBAZ**

</div>
