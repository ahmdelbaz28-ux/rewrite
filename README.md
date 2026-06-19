# 🚀 SmartLangGuard

> **Cross-platform keyboard layout mistake fixer** — works in any terminal, AI tool, browser, or text editor.

[![License: UNLICENSED](https://img.shields.io/badge/License-UNLICENSED-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg)](https://www.npmjs.com/package/@smartlangguard/cli)
[![npm downloads](https://img.shields.io/npm/dm/@smartlangguard/cli.svg)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Node](https://img.shields.io/badge/Node-18%2B-green.svg)](https://nodejs.org)
[![Platforms](https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#installation)

Have you ever typed `high hofhv;` but meant `اهلا اخبارك`? Or wrote `اهلا` when you meant `hello`? SmartLangGuard fixes that instantly — in **any** application.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔧 **Rules-based translation** | Instant, offline, free. Maps mistyped QWERTY keys to Arabic 101 layout. |
| 🧠 **AI scoring** | Uses LLM for ambiguous cases (Pro tier). High accuracy on edge cases. |
| 🖥️ **CLI** | Pipe, file, or interactive mode. Works in any terminal, REPL, SSH session. |
| 🤖 **MCP Server** | Native integration with Claude Desktop, Cursor, Cline, Continue, etc. |
| 👻 **Daemon** | Background clipboard monitor + global hotkey (`Ctrl+Shift+Space`). |
| 🧩 **VS Code Extension** | Wraps the CLI — works inside the editor. |
| 🌐 **Browser Extension** | (Coming soon) Wraps the daemon. |
| ☁️ **SaaS Backend** | License validation, telemetry, AI scoring, admin dashboard. |
| 🔒 **License tiers** | Free / Pro / Team / Enterprise with feature gating. |
| 🔄 **Auto-updater** | Signed, SHA256-verified differential updates. |

---

## 📦 Installation

### Option 1: NPM (global)

```bash
npm install -g @smartlangguard/cli
```

### Option 2: Download Binary

Download the latest release for your platform from the [Releases page](https://github.com/ahmdelbaz28-ux/rewrite/releases):

- **Windows**: `smartlangguard-win-x64.exe`
- **macOS (Intel)**: `smartlangguard-macos-x64`
- **macOS (Apple Silicon)**: `smartlangguard-macos-arm64`
- **Linux (x64)**: `smartlangguard-linux-x64`
- **Linux (arm64)**: `smartlangguard-linux-arm64`

```bash
# Linux/macOS
chmod +x smartlangguard-*
sudo mv smartlangguard-* /usr/local/bin/smartlangguard

# Windows
# Add to PATH or move to C:\Windows\
```

### Option 3: Build from Source

```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install
npm run build
```

---

## 🎯 Quick Start

### 1. Fix text inline

```bash
smartlangguard fix "high hofhv;"
# Output: اهلا اخبارك
```

### 2. Fix from pipe (great for AI tools)

```bash
echo "high hofhv;" | smartlangguard fix
# Output: اهلا اخبارك
```

### 3. Fix file contents

```bash
smartlangguard fix input.txt -o output.txt
```

### 4. Interactive mode

```bash
smartlangguard interactive
# smartlangguard> high
# → اهلا
#   [en-to-ar | 90% confidence | local]
```

### 5. Activate Pro license (optional)

```bash
smartlangguard license activate slg_your_token_here
```

---

## 🤖 MCP Integration (Claude Desktop / Cursor / Cline)

SmartLangGuard ships with a built-in [Model Context Protocol](https://modelcontextprotocol.io) server. Add it to your AI tool's config:

### Claude Desktop (`claude_desktop_config.json`)

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

### Cursor (`~/.cursor/mcp.json`)

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

### Cline / Continue / etc.

Same config pattern. See your tool's MCP docs.

### Available MCP Tools

Once registered, the AI tool can call:

- **`fix_text`** — Fix a given text string
- **`fix_clipboard`** — Fix whatever's currently in the system clipboard
- **`register_license`** — Activate a license token
- **`license_status`** — Check current license tier

**Example prompt in Cursor:**
> "I typed 'high hofhv;' by mistake. Use smartlangguard to fix it."

The AI will call the `fix_text` tool and return `اهلا اخبارك`.

---

## 👻 Daemon Mode (Background)

The daemon runs in the background and provides:

1. **Clipboard monitoring** — auto-fixes clipboard contents on demand
2. **Global hotkey** — press `Ctrl+Shift+Space` to fix whatever's in your clipboard
3. **Local HTTP API** — for browser extensions to call

```bash
smartlangguard daemon
```

### Daemon HTTP API (port 41783)

```bash
# Fix a text string
curl -X POST http://localhost:41783/fix \
  -H "Content-Type: application/json" \
  -d '{"text": "high"}'

# Fix current clipboard
curl -X POST http://localhost:41783/clipboard/fix

# Toggle auto-fix mode
curl -X POST http://localhost:41783/autofix/toggle

# Check status
curl http://localhost:41783/status
```

---

## 🧩 VS Code Extension

1. Install the CLI first (see above)
2. Search for "SmartLangGuard" in VS Code extensions marketplace
3. Or build locally: `cd packages/vscode-extension && npm run package`

**Keyboard shortcuts:**
- `Ctrl+Shift+F1` (Win/Linux) / `Cmd+Shift+F1` (Mac) — Fix selection
- `Ctrl+Shift+F2` / `Cmd+Shift+F2` — Fix clipboard

Right-click in any editor → "SmartLangGuard: Fix Selection"

---

## ☁️ SaaS Backend

The SaaS backend provides license validation, telemetry, AI scoring, and admin dashboard.

### Quick start

```bash
cd packages/backend
cp .env.example .env
npm install
npm start
```

Server runs on `http://localhost:4000`.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/license/validate` | Validate a license token |
| `POST` | `/v1/license/activate` | Create a new license |
| `POST` | `/v1/license/revoke` | Revoke a license |
| `GET`  | `/v1/license/info/:token` | Get license info |
| `POST` | `/v1/telemetry/batch` | Submit telemetry events |
| `GET`  | `/v1/telemetry/stats` | Get aggregated stats (API key) |
| `POST` | `/v1/ai/score` | AI scoring (Pro+ only) |
| `POST` | `/v1/admin/login` | Admin login |
| `GET`  | `/v1/admin/dashboard` | Dashboard stats (admin) |
| `GET`  | `/v1/admin/licenses` | List all licenses (admin) |
| `POST` | `/v1/stripe/webhook` | Stripe subscription webhooks |

### Default admin credentials

- Username: `admin`
- Password: `admin123` (change immediately in production)

---

## 💳 Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | Rules-only translation, 1 device |
| **Pro** | $5/mo | + AI scoring, 3 devices, cloud sync |
| **Team** | $49/mo | + 10 devices, shared workspace, priority support |
| **Enterprise** | $499/mo | + Unlimited devices, SSO, analytics API, on-prem option |

Buy a license at `https://smartlangguard.com/pricing` (coming soon) or activate a free trial:

```bash
curl -X POST http://localhost:4000/v1/license/activate \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "tier": "pro"}'
```

---

## 🏗️ Architecture

```
                    ┌──────────────────────────┐
                    │  SmartLangGuard Core     │
                    │  (Node.js binary)        │
                    │  • Translation Engine    │
                    │  • AI Dictionary Scoring │
                    │  • License Layer         │
                    │  • Telemetry             │
                    │  • Auto-Updater          │
                    └──────────────────────────┘
                       ↑       ↑        ↑       ↑
                  ┌────┴──┐ ┌──┴──┐ ┌───┴──┐ ┌──┴──────┐
                  │ CLI   │ │ MCP │ │Daemon│ │ VS Code │
                  │       │ │Srv  │ │      │ │  Ext    │
                  └───────┘ └─────┘ └──────┘ └─────────┘
                                            ↓
                                    ┌──────────────┐
                                    │   SaaS API   │
                                    │ (Express +   │
                                    │  SQLite +    │
                                    │  Stripe)     │
                                    └──────────────┘
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed design.

---

## 🛠️ Development

### Monorepo structure

```
smartlangguard/
├── packages/
│   ├── core/              # Translation engine, license, telemetry
│   ├── cli/               # CLI binary (cross-platform)
│   ├── mcp-server/        # MCP server for AI tools
│   ├── daemon/            # Background daemon + hotkey
│   ├── vscode-extension/  # VS Code wrapper
│   └── backend/           # SaaS backend (Express + SQLite)
├── scripts/
│   ├── build-all.js       # Build all binaries
│   └── release.js         # Tag + release
├── docs/
│   ├── ARCHITECTURE.md
│   ├── INSTALL.md
│   ├── API.md
│   └── BETA.md
└── package.json           # Workspace root
```

### Setup

```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install  # Installs all workspace deps
```

### Run tests

```bash
npm test
```

### Build all binaries

```bash
npm run build
```

Output: `packages/cli/dist/smartlangguard-{platform}-{arch}`

---

## 🔒 Security

- **License tokens** are HMAC-signed for offline validation
- **Device fingerprinting** prevents license sharing (per-tier device limits)
- **Binary updates** are SHA256-verified and signature-checked
- **Telemetry** is anonymized and opt-out
- **Admin endpoints** require JWT auth
- **Rate limiting** on all public endpoints

See [SECURITY.md](docs/SECURITY.md) for vulnerability reporting.

---

## 🗺️ Roadmap

- [x] Phase 1: Core + CLI + MCP + Backend
- [ ] Phase 2: Daemon hotkey (system-wide) + VS Code marketplace
- [ ] Phase 3: Browser extension + Admin dashboard UI + Stripe live
- [ ] Phase 4: AI model fine-tuning (custom Arabic English-mistake model)
- [ ] Phase 5: On-premise Enterprise deployment

---

## 📄 License

PROPRIETARY — © 2026 SmartLangGuard. All rights reserved.

See [LICENSE](LICENSE) for details. Source code is provided for transparency and contribution; commercial use requires a license.

---

## 💬 Support

- 📧 Email: hello@smartlangguard.com
- 🐛 Issues: [GitHub Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues)
- 📖 Docs: [docs/](docs/)
- 🌐 Website: https://smartlangguard.com (coming soon)
