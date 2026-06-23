# SmartLangGuard Browser Extension

Fix Arabic/English keyboard layout mistakes in any web page.

## Installation (Development)

### Chrome / Edge / Brave

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder (`packages/browser-extension/`)
5. The SmartLangGuard icon should appear in your toolbar

### Firefox (Temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json`

## Usage

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+L` (Win/Linux) / `Cmd+Shift+L` (Mac) | Fix current selection |
| `Ctrl+Shift+K` / `Cmd+Shift+K` | Fix clipboard contents |

### Context menu

Right-click on any page to see:
- **SmartLangGuard: Fix Selection** — fix the highlighted text
- **SmartLangGuard: Fix This Page** — auto-detect and fix all input fields
- **SmartLangGuard: Fix Clipboard** — fix whatever is in the clipboard
- **SmartLangGuard: Toggle Auto-Fix** — enable/disable auto-fix on paste

### Popup

Click the toolbar icon to open the popup:
- Paste/type text → click **Fix** → see the corrected result
- Toggle auto-fix mode
- View daemon status and license tier

### Options page

Right-click the toolbar icon → **Options** (or click "Settings" in popup):
- Configure daemon endpoint (default: `http://localhost:41783`)
- Configure SaaS API endpoint
- Activate license token
- Toggle telemetry

## Requirements

- The SmartLangGuard daemon must be running locally (`smartlangguard daemon`)
- For license features: a valid token from the SaaS backend

## Permissions Explained

| Permission | Why |
|------------|-----|
| `activeTab` | Access the current tab to read/replace selection |
| `clipboardWrite` | Write fixed text to clipboard |
| `storage` | Save settings and license locally |
| `contextMenus` | Add right-click menu items |
| `scripting` | Inject content scripts |
| `notifications` | Show "fixed" notifications |
| `host_permissions: localhost:41783` | Talk to the local daemon |
| `host_permissions: localhost:4000` | Talk to the local SaaS backend (optional, for license) |

## Architecture

```
User action (shortcut/menu/popup)
        ↓
   background.js (service worker)
        ↓
   Daemon HTTP API on :41783
        ↓
   Core translation engine
        ↓
   Fixed text returned
        ↓
   content.js replaces selection
```

The extension is a thin wrapper around the daemon — all heavy lifting (translation, AI scoring, license validation) happens in the Core binary.

## Building for distribution

```bash
npm run package
# Output: dist/smartlangguard-v0.1.0.zip (upload to Chrome Web Store)
```

## Privacy

- All translation happens locally (via the daemon)
- No page content is sent to any server
- Telemetry is anonymized and opt-out
- License tokens are stored locally in `chrome.storage.local`
