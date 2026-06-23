# @smartlangguard/daemon

> SmartLangGuard Daemon - Background clipboard monitor + global hotkey for fixing keyboard layout mistakes.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://www.npmjs.com/package/@smartlangguard/daemon)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)

## Installation

```bash
npm install -g @smartlangguard/daemon
```

Or use the CLI directly (recommended):
```bash
npm install -g @smartlangguard/cli
smartlangguard daemon  # starts the daemon
```

## Usage

```bash
# Start daemon
smartlangguard-daemon

# Or via CLI
smartlangguard daemon
```

## Features

- **Clipboard Monitor** - Auto-fixes clipboard contents (1s polling)
- **Global Hotkey** - `Ctrl+Shift+Space` fixes current clipboard
- **Local HTTP API** - On port 41783 for browser extensions
- **OS Notifications** - Cross-platform notifications

## HTTP API (port 41783)

```bash
# Fix a string
curl -X POST http://localhost:41783/fix \
  -H "Content-Type: application/json" \
  -d '{"text": "high"}'

# Fix current clipboard
curl -X POST http://localhost:41783/clipboard/fix

# Get daemon status
curl http://localhost:41783/status
```

## Platform Notes

- **macOS**: Requires Accessibility permission for hotkey
- **Linux**: Requires `xclip`/`xsel`/`wl-clipboard` + `xbindkeys`
- **Windows**: Uses PowerShell for clipboard + hotkey

## License

UNLICENSED - © 2026 SmartLangGuard.

## Links

- [GitHub](https://github.com/ahmdelbaz28-ux/rewrite)
- [Documentation](https://github.com/ahmdelbaz28-ux/rewrite#readme)
