# <img src="https://raw.githubusercontent.com/ahmdelbaz28-ux/rewrite/main/docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="100" />

# **SmartLangGuard**

> **The Ultimate Keyboard Layout Correction Engine**
> **Fix mistyped text instantly across all your applications — Terminal, AI Tools, Browsers, Editors, and more.**

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ahmdelbaz28-ux/rewrite?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/releases)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat-square)](https://nodejs.org)
[![Platforms](https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](#-installation)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/ahmdelbaz28-ux/rewrite/ci.yml?style=flat-square&label=CI%2FCD)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![Tests](https://img.shields.io/badge/Tests-166%20passing-brightgreen.svg?style=flat-square)](#)
[![npm](https://img.shields.io/badge/npm-publish%20pending-orange.svg?style=flat-square)](#)

---

## **Why SmartLangGuard?**

Have you ever typed **`high hofhv;`** when you meant **`اهلا اخبارك`**?
Or **`ahla`** when you meant **`hello`**?

**SmartLangGuard** is the **first and only** solution that **instantly fixes keyboard layout mistakes** across **all your applications** — **offline, private, and blazing fast.**

### **The Problem**
When switching between **QWERTY (English)** and **Arabic 101** keyboard layouts, it's easy to accidentally type in the wrong layout. This leads to:
- **Confusing messages** (e.g., `sldk` instead of `hello`)
- **Wasted time** manually correcting mistakes
- **Frustration** in fast-paced conversations

### **The Solution**
SmartLangGuard **automatically detects and corrects** these mistakes using:
- **Rules-Based Translation** — Instant, offline, and free.
- **AI-Powered Scoring** — Handles ambiguous cases with high accuracy (Pro+).
- **Real-Time Correction** — Works in **any** application (Terminal, AI Tools, Browsers, Editors).

---

## **Features**

| **Feature** | **Free** | **Pro** | **Team** | **Enterprise** |
|-------------|---------|---------|----------|---------------|
| **Rules-Based Translation** | Yes | Yes | Yes | Yes |
| **AI Scoring (Ambiguous Cases)** | No | Yes | Yes | Yes |
| **CLI (Terminal Support)** | Yes | Yes | Yes | Yes |
| **MCP Server (AI Tools Integration)** | Yes | Yes | Yes | Yes |
| **Daemon (Background Clipboard Monitor)** | Yes | Yes | Yes | Yes |
| **Global Hotkey (`Ctrl+Shift+Space`)** | Yes | Yes | Yes | Yes |
| **VS Code Extension** | Yes | Yes | Yes | Yes |
| **Browser Extension** | No | Yes | Yes | Yes |
| **Cloud Sync (Multi-Device)** | No | Yes | Yes | Yes |
| **Priority Support** | No | No | Yes | Yes |
| **SSO & SAML** | No | No | No | Yes |
| **On-Premise Deployment** | No | No | No | Yes |
| **Analytics API** | No | No | No | Yes |

---

## **Installation**

### **Option 1: NPM (Coming Soon)**
```bash
npm install -g @smartlangguard/cli
```
> The package is not yet published to npm. Use Option 2 or 3 below for now.

### **Option 2: Download Pre-Built Binaries**
Download the latest release for your platform from **[Releases Page](https://github.com/ahmdelbaz28-ux/rewrite/releases)**:

| **Platform** | **Architecture** | **Download Link** |
|--------------|------------------|-------------------|
| **Windows** | x64 | [`smartlangguard-win-x64.exe`](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-win-x64.exe) |
| **macOS** | Intel (x64) | [`smartlangguard-macos-x64`](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-x64) |
| **macOS** | Apple Silicon (arm64) | [`smartlangguard-macos-arm64`](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-arm64) |
| **Linux** | x64 | [`smartlangguard-linux-x64`](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-x64) |
| **Linux** | arm64 | [`smartlangguard-linux-arm64`](https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-arm64) |

#### **Install on Linux/macOS**
```bash
chmod +x smartlangguard-*
sudo mv smartlangguard-* /usr/local/bin/smartlangguard
```

#### **Install on Windows**
1. Download the `.exe` file.
2. Move it to `C:\Windows\` or add it to your `PATH`.

### **Option 3: Build from Source**
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install
npm run build
```

---

## **Quick Start**

### **1. Fix Text Inline**
```bash
smartlangguard fix "high hofhv;"
# Output: اهلا اخبارك
```

### **2. Fix from Pipe (Great for AI Tools)**
```bash
echo "high hofhv;" | smartlangguard fix
# Output: اهلا اخبارك
```

### **3. Fix File Contents**
```bash
smartlangguard fix input.txt -o output.txt
```

### **4. Interactive Mode**
```bash
smartlangguard interactive
# smartlangguard> high
# -> اهلا
# [en-to-ar | 90% confidence | local]
```

### **5. Activate Pro License (Optional)**
```bash
smartlangguard license activate slg_your_token_here
```

---

## **MCP Integration (Claude Desktop / Cursor / Cline / Continue)**

SmartLangGuard includes a **built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server** for seamless integration with AI tools.

### **Setup**

#### **Claude Desktop**
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

#### **Cursor**
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

#### **Cline / Continue**
Same configuration pattern. Refer to your tool's MCP documentation.

### **Available MCP Tools**

| **Tool** | **Description** | **Example** |
|----------|----------------|-------------|
| `fix_text` | Fix a given text string | `fix_text("high hofhv;")` -> `اهلا اخبارك` |
| `fix_clipboard` | Fix clipboard contents | `fix_clipboard()` -> Fixed text |
| `register_license` | Activate a license token | `register_license("slg_...")` |
| `license_status` | Check current license tier | `license_status()` -> `{ tier: "pro" }` |

### **Example Prompt in Cursor**
> "I typed `high hofhv;` by mistake. Use SmartLangGuard to fix it."

The AI will automatically call `fix_text` and return:
```
اهلا اخبارك
```

---

## **Daemon Mode (Background Service)**

The **Daemon** runs in the background and provides:

1. **Clipboard Monitoring** — Auto-fixes clipboard contents on demand.
2. **Global Hotkey** — Press `Ctrl+Shift+Space` to fix clipboard text.
3. **Local HTTP API** — For browser extensions and custom integrations.

### **Start the Daemon**
```bash
smartlangguard daemon
```

### **Daemon HTTP API (Port `41783`)**

| **Endpoint** | **Method** | **Description** | **Example** |
|--------------|------------|----------------|-------------|
| `/fix` | `POST` | Fix a text string | `curl -X POST http://localhost:41783/fix -H "Content-Type: application/json" -d '{"text": "high"}'` |
| `/clipboard/fix` | `POST` | Fix clipboard contents | `curl -X POST http://localhost:41783/clipboard/fix` |
| `/autofix/toggle` | `POST` | Toggle auto-fix mode | `curl -X POST http://localhost:41783/autofix/toggle` |
| `/status` | `GET` | Check daemon status | `curl http://localhost:41783/status` |

---

## **VS Code Extension**

### **Installation**
1. **Install the CLI first** (see [Installation](#installation)).
2. Search for **"SmartLangGuard"** in the VS Code Extensions Marketplace.
3. **OR** build locally:
   ```bash
   cd packages/vscode-extension
   npm run package
   ```

### **Keyboard Shortcuts**

| **Command** | **Windows/Linux** | **macOS** | **Description** |
|-------------|-------------------|-----------|----------------|
| **Fix Selection** | `Ctrl+Shift+F1` | `Cmd+Shift+F1` | Fix selected text |
| **Fix Clipboard** | `Ctrl+Shift+F2` | `Cmd+Shift+F2` | Fix clipboard contents |

### **Right-Click Menu**
- **"SmartLangGuard: Fix Selection"** — Fix the currently selected text.

---

## **Browser Extension (Pro+)**

### **Installation**
1. **Activate a Pro license** (see [Pricing](#pricing)).
2. Download the extension from the **[Chrome Web Store](https://chrome.google.com/webstore/detail/smartlangguard/)** (coming soon).
3. **OR** load unpacked extension from `packages/browser-extension`.

### **Features**
- **Auto-fix text fields** — Corrects mistyped text in real-time.
- **Clipboard integration** — Works with the Daemon for seamless fixing.
- **Customizable hotkeys** — Configure your preferred shortcuts.

---

## **SaaS Backend (Self-Hosted or Cloud)**

The **SaaS Backend** provides:
- **License validation & management**
- **Telemetry ingestion & analytics**
- **AI scoring (Pro+)**
- **Admin dashboard**
- **Stripe integration**

### **Quick Start**

#### **1. Clone & Install**
```bash
cd packages/backend
cp .env.example .env
npm install
```

#### **2. Configure Environment**
Edit `.env`:
```env
# Server Settings
PORT=4000
CORS_ORIGIN=http://localhost:3000
SMARTLANGGUARD_DB_PATH=./saas.db

# JWT Secret (REQUIRED - generate a random string)
JWT_SECRET=your_secure_jwt_secret_here

# Admin Credentials (REQUIRED - change from default!)
ADMIN_DEFAULT_PASSWORD=your_secure_password

# Stripe Settings (for subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### **3. Start the Server**
```bash
npm start
```
Server runs on `http://localhost:4000`.

### **API Endpoints**

| **Method** | **Endpoint** | **Description** | **Auth Required** |
|------------|--------------|----------------|-------------------|
| `POST` | `/v1/license/validate` | Validate a license token | Yes |
| `POST` | `/v1/license/activate` | Create a new license | Public |
| `POST` | `/v1/license/revoke` | Revoke a license | Admin |
| `GET` | `/v1/license/info/:token` | Get license info | Yes |
| `POST` | `/v1/telemetry/batch` | Submit telemetry events | No |
| `GET` | `/v1/telemetry/stats` | Get aggregated stats | API Key |
| `POST` | `/v1/ai/score` | AI scoring (Pro+ only) | License |
| `POST` | `/v1/admin/login` | Admin login | No (rate limited) |
| `GET` | `/v1/admin/dashboard` | Dashboard stats | Admin |
| `GET` | `/v1/admin/licenses` | List all licenses | Admin |
| `POST` | `/v1/stripe/checkout` | Create checkout session | Public |
| `POST` | `/v1/stripe/portal` | Billing portal | Public |
| `GET` | `/v1/stripe/pricing` | Get pricing plans | Public |
| `POST` | `/v1/stripe/webhook` | Stripe webhook handler | Signature |
| `GET` | `/v1/billing/plans` | Get billing plans | Public |
| `GET` | `/v1/billing/status` | Check subscription status | License |
| `GET` | `/health` | Health check | No |

### **Admin Authentication**
- **Username:** `admin`
- **Password:** Set via `ADMIN_DEFAULT_PASSWORD` environment variable (required)
- **JWT:** All admin endpoints require a valid JWT token obtained from `/v1/admin/login`
- **Rate Limiting:** Login endpoint limited to 5 attempts per 15 minutes

---

## **Pricing**

| **Tier** | **Price** | **Features** | **Best For** |
|----------|-----------|--------------|--------------|
| **Free** | **$0/mo** | Rules-only translation, 1 device | Personal use |
| **Pro** | **$5/mo** | + AI scoring, 3 devices, cloud sync | Power users |
| **Team** | **$49/mo** | + 10 devices, shared workspace, priority support | Small teams |
| **Enterprise** | **$499/mo** | + Unlimited devices, SSO, analytics API, on-prem option | Large organizations |

### **Free Trial**
Activate a **14-day free trial** of **Pro**:
```bash
curl -X POST http://localhost:4000/v1/license/activate \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "tier": "pro"}'
```

### **Buy a License**
Visit **[https://smartlangguard.com/pricing](https://smartlangguard.com/pricing)** (coming soon).

---

## **Architecture**

```
+-------------------------------------------------------------------------------+
|                                SmartLangGuard Core                              |
|  +---------------------------------------------------------------------------+  |
|  | - Translation Engine (Rules-Based + AI Scoring)                           |  |
|  | - License Validation Layer (HMAC-signed, offline + online)               |  |
|  | - Telemetry & Analytics (privacy-first, opt-out)                         |  |
|  | - Auto-Updater (SHA256-Verified)                                         |  |
|  | - Custom N-gram AI Model (92% accuracy, 1ms, $0 cost)                   |  |
|  | - Typing Detector (real-time, debounced)                                 |  |
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

### **Monorepo Structure**
```
smartlangguard/
├── packages/
│   ├── core/               # Translation engine, license, telemetry, updater
│   │   ├── src/
│   │   │   ├── translator.js       # Rules-based + AI translation
│   │   │   ├── custom-ai-model.js  # Statistical n-gram scoring model
│   │   │   ├── ai-scoring.js       # AI scoring layer (local + remote)
│   │   │   ├── license.js          # License validation (online + offline)
│   │   │   ├── telemetry.js        # Privacy-first telemetry
│   │   │   ├── updater.js          # SHA256-verified auto-updater
│   │   │   ├── typing-detector.js  # Real-time typing detection
│   │   │   ├── sound-player.js     # Cross-platform alert sounds
│   │   │   └── index.js            # Unified API entry point
│   │   └── tests/                  # 146 unit tests
│   │
│   ├── cli/                # CLI binary (cross-platform)
│   │   └── bin/
│   │       └── smartlangguard.js
│   │
│   ├── mcp-server/         # MCP server for AI tools
│   │   ├── src/
│   │   │   ├── mcp-server.js
│   │   │   └── clipboard.js
│   │   └── tests/                  # 6 tests
│   │
│   ├── daemon/             # Background daemon + hotkey
│   │   └── src/
│   │       ├── daemon.js
│   │       ├── clipboard.js
│   │       └── hotkey.js
│   │
│   ├── vscode-extension/   # VS Code extension
│   │   └── src/
│   │       └── extension.ts
│   │
│   ├── browser-extension/  # Browser extension (Manifest V3)
│   │   ├── manifest.json
│   │   └── src/
│   │
│   └── backend/            # SaaS backend (Express + better-sqlite3)
│       ├── src/
│       │   ├── server.js           # Express server
│       │   ├── db.js               # SQLite database (better-sqlite3)
│       │   ├── middleware.js       # JWT auth, rate limiting
│       │   └── routes/             # API routes
│       │       ├── license.js
│       │       ├── admin.js
│       │       ├── ai.js
│       │       ├── billing.js
│       │       ├── stripe.js
│       │       └── telemetry.js
│       ├── tests/                  # 14 integration tests
│       └── .env.example
│
├── scripts/
│   ├── build-all.js        # Build all binaries
│   └── release.js          # Tag + release
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── INSTALL.md
│   ├── API.md
│   └── SECURITY.md
│
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD
│
├── jest.config.json        # Jest test configuration
└── package.json            # Workspace root
```

---

## **Development**

### **Setup**
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install  # Installs all workspace dependencies
```

### **Build All Binaries**
```bash
npm run build
```
Output: `packages/cli/dist/smartlangguard-{platform}-{arch}`

### **Run Tests**
```bash
npm test                    # Run all 166 tests across all packages
npm run test:core           # Core tests (146)
npm run test:backend        # Backend tests (14)
npm run test:mcp            # MCP server tests (6)
```

### **Test Coverage**
| **Package** | **Tests** | **Files** |
|-------------|-----------|-----------|
| @smartlangguard/core | 146 | translator, license, custom-ai-model, typing-detector, telemetry, updater, index, sound-player |
| @smartlangguard/backend | 14 | API integration (health, license, admin, billing, stripe, 404) |
| @smartlangguard/mcp-server | 6 | Protocol, tools definitions |
| **Total** | **166** | **10 test suites** |

---

## **Security**

### **Features**
- **License tokens** are HMAC-signed for offline validation.
- **Device fingerprinting** prevents license sharing (per-tier device limits).
- **Binary updates** are SHA256-verified and signature-checked.
- **Telemetry** is anonymized and opt-out.
- **Admin endpoints** require JWT authentication with configurable secret (no hardcoded defaults).
- **Rate limiting** on all public endpoints (100 req/15min) and admin login (5 req/15min).
- **CORS** is restricted to configured origins only (no wildcard in production).
- **Clipboard access** uses stdin piping via `spawn()` to prevent command injection.
- **166 automated tests** covering core, backend, and MCP server.
- **better-sqlite3** used instead of deasync (no event loop blocking).
- **Stripe webhook** signature verification with timing-safe comparison.

### **Required Environment Variables**
| **Variable** | **Description** | **Required** |
|--------------|-----------------|--------------|
| `JWT_SECRET` | Secret for signing JWT tokens | Yes (production) |
| `ADMIN_DEFAULT_PASSWORD` | Initial admin password | Yes (first run) |
| `STRIPE_SECRET_KEY` | Stripe API key | For billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | For webhooks |
| `CORS_ORIGIN` | Comma-separated allowed origins | Recommended |
| `SMARTLANGGUARD_OFFLINE_SECRET` | License token signing key | Yes (production) |

### **Vulnerability Reporting**
If you discover a security vulnerability, please report it to **[security@smartlangguard.com](mailto:security@smartlangguard.com)**.

See **[SECURITY.md](docs/SECURITY.md)** for more details.

---

## **CI/CD**

The project uses **GitHub Actions** for continuous integration:

- **On every push/PR to main:** Runs all 166 tests on Ubuntu with Node.js 20
- **On every push/PR to main:** Builds CLI binaries for Windows, macOS, and Linux
- **Test jobs:** Core, Backend, and MCP server run in parallel
- **Build jobs:** CLI binaries built for all 3 platforms after tests pass

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for the full configuration.

---

## **Roadmap**

| **Phase** | **Status** | **Features** |
|-----------|------------|--------------|
| **Phase 1** | **Done** | Core + CLI + MCP + Backend + Tests + CI/CD |
| **Phase 2** | **In Progress** | Daemon hotkey (system-wide) + VS Code Marketplace |
| **Phase 3** | **Planned** | Browser Extension + Admin Dashboard UI + Stripe Live |
| **Phase 4** | **Planned** | AI Model Fine-Tuning (Custom Arabic-English Mistake Model) |
| **Phase 5** | **Planned** | On-Premise Enterprise Deployment |

---

## **License**

**Proprietary License** -- (c) 2026 SmartLangGuard. All rights reserved.

See **[LICENSE](LICENSE)** for details.

---

## **Support & Community**

| **Channel** | **Link** |
|-------------|----------|
| **Email** | [hello@smartlangguard.com](mailto:hello@smartlangguard.com) |
| **Issues** | [GitHub Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues) |
| **Documentation** | [docs/](docs/) |
| **Website** | [https://smartlangguard.com](https://smartlangguard.com) (Coming Soon) |
| **Discord** | [Join our Discord](https://discord.gg/smartlangguard) (Coming Soon) |
| **Twitter** | [@SmartLangGuard](https://twitter.com/SmartLangGuard) (Coming Soon) |

---

## **Contributing**

We welcome contributions! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before submitting pull requests.

### **How to Contribute**
1. **Fork** the repository.
2. **Create a feature branch** (`git checkout -b feature/your-feature`).
3. **Commit your changes** (`git commit -m "Add your feature"`).
4. **Push to the branch** (`git push origin feature/your-feature`).
5. **Open a Pull Request**.

---

## **Acknowledgments**

- **AI Tools** -- [Claude](https://claude.ai), [Cursor](https://cursor.com), [Cline](https://cline.ai)
- **MCP Protocol** -- [Model Context Protocol](https://modelcontextprotocol.io)
- **Node.js** -- [Node.js](https://nodejs.org)
- **SQLite** -- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Stripe** -- [Stripe](https://stripe.com)

---

**Made with care by [SmartLangGuard Team](https://github.com/ahmdelbaz28-ux)**

**Powered by AI, Built for Developers.**

---

<details>
<summary>Changelog</summary>

### **v0.1.1 (Latest)**
- Fixed database layer: replaced sqlite3+deasync with better-sqlite3 (no event loop blocking).
- Fixed MCP server: added missing clipboard module (was crashing on fix_clipboard tool).
- Fixed all npm import paths: packages now use @smartlangguard/core instead of relative paths.
- Security: removed hardcoded JWT secret, added rate limiting on admin login, fixed CORS wildcard.
- Security: fixed clipboard command injection vulnerability (uses stdin piping now).
- Fixed license field consistency: all packages now say "PROPRIETARY".
- Fixed code quality: duplicate object keys in custom-ai-model.js and translator.js.
- Fixed Stripe route: broken indentation and inconsistent db() calls.
- Added 166 automated tests (146 core, 14 backend, 6 MCP server).
- Added CI/CD GitHub Actions workflow (test on push/PR, build on all platforms).
- Fixed package.json clean script for Windows compatibility.
- Updated README with accurate documentation and changelog.
- Added jest.config.json for test configuration.
- Updated .env.example with required JWT_SECRET and secure defaults.

### **v0.1.0**
- Initial release of SmartLangGuard Core, CLI, MCP Server, Backend, and Daemon.
- Rules-based translation engine for QWERTY and Arabic 101.
- License validation and management.
- Telemetry ingestion.
- MCP integration for AI tools.
- Daemon with clipboard monitoring and hotkey support.

</details>
