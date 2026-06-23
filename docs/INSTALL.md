# Installation Guide — SmartLangGuard

## Prerequisites

- **Node.js 18+** (only if installing via npm; binaries are standalone)
- **Operating System**: Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+, Debian 11+, Fedora 35+, or equivalent)
- **Disk space**: 50MB for the binary, 5MB for config

---

## Option 1: NPM (recommended for developers)

```bash
npm install -g @smartlangguard/cli
```

Verify installation:

```bash
smartlangguard --version
# Output: 0.1.0
```

---

## Option 2: Standalone Binary (recommended for end users)

### Windows

1. Download `smartlangguard-win-x64.exe` from [Releases](https://github.com/ahmdelbaz28-ux/rewrite/releases)
2. Rename to `smartlangguard.exe`
3. Move to a folder in your PATH (e.g., `C:\Users\YourName\bin\`)
4. Or add the folder to PATH:
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\YourName\bin", "User")
   ```

### macOS

```bash
# Download (Intel)
curl -L -o smartlangguard https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-x64

# Or (Apple Silicon)
curl -L -o smartlangguard https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-macos-arm64

# Make executable and install
chmod +x smartlangguard
sudo mv smartlangguard /usr/local/bin/

# Verify
smartlangguard --version
```

**Note**: macOS Gatekeeper may block the binary. To bypass:
```bash
xattr -d com.apple.quarantine /usr/local/bin/smartlangguard
```

### Linux

```bash
# Download (x64)
curl -L -o smartlangguard https://github.com/ahmdelbaz28-ux/rewrite/releases/latest/download/smartlangguard-linux-x64

# Make executable and install
chmod +x smartlangguard
sudo mv smartlangguard /usr/local/bin/

# Verify
smartlangguard --version
```

For clipboard support on Linux, install one of:
```bash
# Debian/Ubuntu
sudo apt install xclip
# or
sudo apt install xsel

# Wayland users
sudo apt install wl-clipboard
```

For hotkey support on Linux, install `xbindkeys`:
```bash
sudo apt install xbindkeys
```

---

## Option 3: Build from Source

```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite

# Install dependencies
npm install

# Build all binaries
npm run build

# Binaries are in packages/cli/dist/
ls packages/cli/dist/
# smartlangguard-win-x64.exe
# smartlangguard-macos-x64
# smartlangguard-macos-arm64
# smartlangguard-linux-x64
# smartlangguard-linux-arm64
# checksums.sha256
# latest.json
```

---

## Post-Install Setup

### 1. (Optional) Activate a license

```bash
smartlangguard license activate slg_your_token_here
```

Without a license, SmartLangGuard runs in Free tier (rules-only, no AI scoring).

### 2. (Optional) Configure endpoint

By default, SmartLangGuard connects to `http://localhost:4000` (local SaaS). To use the production endpoint:

```bash
smartlangguard config set endpoint https://api.smartlangguard.com
```

### 3. (Optional) Disable telemetry

```bash
smartlangguard config set telemetry false
```

### 4. (Optional) Test the installation

```bash
echo "high hofhv;" | smartlangguard fix
# Should output: اهلا اخبارك
```

---

## Platform-Specific Notes

### Windows

- **Hotkey support**: requires PowerShell (built-in)
- **Clipboard**: uses PowerShell `Get-Clipboard` / `Set-Clipboard`
- **Antivirus**: may flag `pkg`-compiled binaries. Add an exclusion if needed.

### macOS

- **Hotkey support**: requires Accessibility permission
  - System Settings → Privacy & Security → Accessibility → Add Terminal/iTerm
- **Clipboard**: uses `pbpaste` / `pbcopy` (built-in)
- **Universal binary**: download the matching arch (Intel vs Apple Silicon)

### Linux

- **Hotkey support**: requires `xbindkeys` (or `sxhkd`)
- **Clipboard**: requires `xclip`, `xsel`, or `wl-clipboard` (Wayland)
- **Notifications**: requires `libnotify-bin` (`notify-send`)

---

## VS Code Extension

1. Install the CLI first (above)
2. Open VS Code → Extensions → Search "SmartLangGuard"
3. Install
4. Reload VS Code
5. Use `Ctrl+Shift+F1` (Win/Linux) or `Cmd+Shift+F1` (Mac) on selected text

---

## MCP Integration (Claude Desktop / Cursor)

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop. You should see `smartlangguard` in the tools list.

### Cursor

Edit `~/.cursor/mcp.json`:

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

Restart Cursor.

---

## SaaS Backend (self-hosted)

```bash
cd packages/backend
cp .env.example .env

# Edit .env:
# - Set JWT_SECRET to a long random string
# - Set ADMIN_DEFAULT_PASSWORD
# - Configure STRIPE_* keys (optional)

npm install
npm start
```

Server runs on `http://localhost:4000`.

---

## Troubleshooting

### "command not found: smartlangguard"

- Check that the binary is in your PATH
- Run `which smartlangguard` (Linux/macOS) or `where smartlangguard` (Windows)
- For npm install: ensure npm's global bin is in PATH (`npm config get prefix`)

### "Permission denied"

- Linux/macOS: `chmod +x /usr/local/bin/smartlangguard`
- Windows: run PowerShell as Administrator

### "License invalid"

- Run `smartlangguard license status` to check
- Verify the token format: `slg_xxxxxxxxxxxxxxxxxxxxxxxx`
- Check that the SaaS backend is reachable: `smartlangguard config get endpoint`

### "Hotkey doesn't work"

- **macOS**: Grant Accessibility permission to your terminal
- **Windows**: Run as Administrator (some hotkeys need elevation)
- **Linux**: Install and configure `xbindkeys`

### "Clipboard doesn't work on Linux"

- Install `xclip`: `sudo apt install xclip`
- Or `wl-clipboard` for Wayland: `sudo apt install wl-clipboard`

---

## Uninstall

```bash
# NPM install
npm uninstall -g @smartlangguard/cli

# Manual binary
rm /usr/local/bin/smartlangguard  # Linux/macOS
del C:\Users\YourName\bin\smartlangguard.exe  # Windows

# Config and license cache
rm -rf ~/.smartlangguard
```
