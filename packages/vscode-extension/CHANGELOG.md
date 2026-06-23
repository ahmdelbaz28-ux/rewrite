# Change Log

All notable changes to the SmartLangGuard VS Code extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Real-time fix-on-type (debounced)
- Inline suggestions (ghost text)
- Multi-cursor support
- Status bar quick actions menu

## [0.1.0] — 2026-06-19

### Added
- **Initial release!** 🎉
- Rules-based translation engine (QWERTY ↔ Arabic 101 layout mapping)
- Auto-detect conversion direction (English-by-mistake vs Arabic-by-mistake)
- AI scoring with custom statistical model (letter frequency, bigrams, word shape, dictionary lookup)
- License activation UI (Free / Pro / Team / Enterprise tiers)
- Status bar showing current license tier
- Commands:
  - `SmartLangGuard: Fix Selection`
  - `SmartLangGuard: Fix Clipboard`
  - `SmartLangGuard: Activate License`
  - `SmartLangGuard: Show Status`
- Keyboard shortcuts:
  - `Ctrl+Shift+F1` / `Cmd+Shift+F1` — Fix Selection
  - `Ctrl+Shift+F2` / `Cmd+Shift+F2` — Fix Clipboard
- Editor context menu integration
- Configuration settings:
  - `smartlangguard.cliPath` — manual CLI binary path
  - `smartlangguard.direction` — auto / en-to-ar / ar-to-en
  - `smartlangguard.useAI` — enable AI scoring
  - `smartlangguard.telemetry` — opt-out telemetry
  - `smartlangguard.endpoint` — SaaS API endpoint
- Output channel for debugging
- Low-confidence fix warning with Undo option

### Technical
- Wraps the SmartLangGuard CLI binary (auto-detected or manual path)
- Requires `@smartlangguard/cli` v0.1.0+ to be installed
- Compatible with VS Code 1.85+
- Cross-platform: Windows, macOS, Linux
- 100% offline-capable (with cached license)
