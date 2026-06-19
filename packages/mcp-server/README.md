# @smartlangguard/mcp-server

> SmartLangGuard MCP Server - Integration with Claude Desktop, Cursor, Cline, and other AI tools via Model Context Protocol.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://www.npmjs.com/package/@smartlangguard/mcp-server)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)

## Installation

```bash
npm install -g @smartlangguard/mcp-server
```

Or use the CLI directly (recommended):
```bash
npm install -g @smartlangguard/cli
smartlangguard mcp  # starts the MCP server
```

## Usage

### Claude Desktop / Cursor / Cline

Add to your MCP config:

```json
{
  "mcpServers": {
    "smartlangguard": {
      "command": "smartlangguard-mcp",
      "args": []
    }
  }
}
```

Or using the CLI:
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

## Available Tools

| Tool | Description |
|------|-------------|
| `fix_text` | Fix mistyped text |
| `fix_clipboard` | Fix current clipboard contents |
| `register_license` | Activate a license token |
| `license_status` | Check current license tier |

## Example

In Claude/Cursor chat:
> "I typed 'high hofhv;' by mistake. Use smartlangguard to fix it."

The AI will call the `fix_text` tool and return `اهلا اخبارك`.

## License

UNLICENSED - © 2026 SmartLangGuard.

## Links

- [GitHub](https://github.com/ahmdelbaz28-ux/rewrite)
- [Documentation](https://github.com/ahmdelbaz28-ux/rewrite#readme)
