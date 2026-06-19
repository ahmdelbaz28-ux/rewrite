# Changelog

All notable changes to SmartLangGuard are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Browser extension (Chrome + Firefox)
- Admin dashboard UI (React)
- Stripe Checkout integration (live)
- Mobile companion app (iOS + Android)

---

## [0.1.0] — 2026-06-19

### Added — Phase 1 (Core + CLI + MCP + Backend)

#### Core (`@smartlangguard/core`)
- **Translation engine**: rules-based QWERTY↔Arabic 101 mapping
- **AI scoring**: hybrid local dictionary + remote LLM (Pro tier)
- **License layer**: online validation + offline HMAC-signed tokens
- **Device fingerprinting**: hostname + platform + MAC + CPU hash
- **Telemetry**: batched, anonymized, opt-out
- **Auto-updater**: SHA256 + RSA signature verification

#### CLI (`@smartlangguard/cli`)
- `smartlangguard fix [text]` — string, pipe, or file input
- `smartlangguard interactive` — REPL mode
- `smartlangguard license activate|status|revoke`
- `smartlangguard update check|apply`
- `smartlangguard config set|get|list`
- `smartlangguard mcp` — start MCP server
- `smartlangguard daemon` — start background daemon
- Output formats: `text`, `json`, `text-with-meta`
- `--direction auto|en-to-ar|ar-to-en`
- `--no-ai` flag for rules-only mode

#### MCP Server (`@smartlangguard/mcp-server`)
- JSON-RPC over stdio (MCP spec 2024-11-05)
- Tools: `fix_text`, `fix_clipboard`, `register_license`, `license_status`
- Compatible with Claude Desktop, Cursor, Cline, Continue

#### Daemon (`@smartlangguard/daemon`)
- Clipboard monitor (1s polling)
- Global hotkey support (Ctrl+Shift+Space)
  - macOS: requires Accessibility permission
  - Windows: PowerShell + user32.dll
  - Linux: xbindkeys config
- Local HTTP API on port 41783:
  - `POST /fix` — fix a string
  - `POST /clipboard/fix` — fix clipboard
  - `POST /autofix/toggle` — toggle auto-fix mode
  - `GET /status` — daemon status
- OS-native notifications (osascript / PowerShell / notify-send)

#### VS Code Extension
- Wraps the CLI binary
- Commands: Fix Selection, Fix Clipboard, Activate License, Show Status
- Status bar showing current license tier
- Keyboard shortcuts: Ctrl+Shift+F1 / Cmd+Shift+F1
- Context menu integration
- Settings: `cliPath`, `direction`, `useAI`, `telemetry`

#### SaaS Backend (`@smartlangguard/backend`)
- Express + SQLite (better-sqlite3)
- License endpoints: validate, activate, revoke, info
- Telemetry: batch ingestion + analytics API
- AI scoring endpoint (Pro+ only)
- Admin endpoints: login, dashboard, license management
- Stripe webhook handler (subscriptions)
- Security: helmet, CORS, rate limiting (100 req/15min), JWT admin auth
- Default admin: username `admin`, password `admin123`

#### Build & Release
- `scripts/build-all.js` — builds binaries for all platforms
- `scripts/release.js` — version bump, build, tag, push, GitHub release
- `pkg` targets: Windows x64, macOS x64/arm64, Linux x64/arm64
- SHA256 checksums + signed update manifest (`latest.json`)

#### Documentation
- README.md (full overview + quick start)
- docs/INSTALL.md (detailed install guide per platform)
- docs/ARCHITECTURE.md (system design + threat model)
- docs/API.md (full SaaS API reference)
- docs/BETA.md (beta program plan)

### Security
- HMAC-signed offline license tokens
- Device fingerprinting with per-tier device limits
- SHA256 + RSA signature on binary updates
- Anonymized telemetry (no PII, opt-out)
- Rate limiting on all public endpoints
- JWT admin auth with 24h expiry

### Known Limitations
- macOS hotkey requires Accessibility permission (manual grant)
- Linux Wayland clipboard support is limited
- AI scoring only supports Arabic↔English (more languages in v1.0)
- No mobile support yet
- Browser extension not yet implemented (Phase 3)

---

## Version History

- **0.1.0** (2026-06-19) — Phase 1: Core + CLI + MCP + Backend
- **0.0.1** (2026-06-19) — Initial concept (VS Code extension only)
