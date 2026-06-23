# @smartlangguard/cli

> SmartLangGuard CLI - Fix Arabic/English keyboard layout mistakes from terminal.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://www.npmjs.com/package/@smartlangguard/cli)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)

## Installation

```bash
npm install -g @smartlangguard/cli
```

This installs the `smartlangguard` (and `slg`) command globally.

## Quick Start

```bash
# Fix a string
smartlangguard fix "high hofhv;"
# Output: اهلا اخبارك

# Fix from pipe
echo "high" | smartlangguard fix
# Output: اهلا

# Interactive REPL mode
smartlangguard interactive

# Activate license (optional)
smartlangguard license activate slg_your_token_here

# Start MCP server (for Claude/Cursor integration)
smartlangguard mcp

# Start background daemon
smartlangguard daemon
```

## Commands

| Command | Description |
|---------|-------------|
| `fix [text]` | Fix mistyped text (string, pipe, or file) |
| `interactive` | Start interactive REPL mode |
| `license activate <token>` | Activate a license |
| `license status` | Show current license tier |
| `update check` | Check for available updates |
| `update apply` | Download and apply update |
| `mcp` | Start MCP server (stdio) for AI tools |
| `daemon` | Start background daemon (clipboard + hotkey) |
| `sound play [name]` | Play an alert sound |
| `detect [text]` | Detect layout mistakes in text |

## MCP Integration

Add to your Claude Desktop / Cursor config:

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

## License

UNLICENSED - © 2026 SmartLangGuard. Free tier for personal/commercial use. Pro features require subscription.

## Links

- [GitHub](https://github.com/ahmdelbaz28-ux/rewrite)
- [Documentation](https://github.com/ahmdelbaz28-ux/rewrite#readme)
- [Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues)
