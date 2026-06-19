# @smartlangguard/core

> SmartLangGuard Core - Translation engine, license layer, telemetry, and updater for fixing Arabic/English keyboard layout mistakes.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://www.npmjs.com/package/@smartlangguard/core)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)

## Installation

```bash
npm install @smartlangguard/core
```

## Usage

```javascript
const core = require('@smartlangguard/core');

// Initialize
await core.init({
  endpoint: 'https://api.smartlangguard.com',
  telemetryEnabled: true
});

// Fix mistyped text
const result = await core.fixText('high hofhv;');
console.log(result.corrected); // "اهلا اخبارك"
console.log(result.direction); // "en-to-ar"
console.log(result.score);     // 88
```

## Features

- **Translation Engine** - Rules-based QWERTY ↔ Arabic 101 layout mapping
- **Custom AI Model** - Statistical model with 92% accuracy (free, offline, ~1ms)
- **License Layer** - Online validation + offline HMAC-signed tokens
- **Telemetry** - Batched, anonymized, opt-out
- **Auto-Updater** - SHA256 + RSA signature verification

## API

### `init(config)`
Initialize the core. Returns a Promise.

### `fixText(text, options)`
Fix mistyped text. Returns `{ original, corrected, direction, score, source }`.

### `activateLicense(token)`
Activate a license token. Returns `{ success, license }`.

### `getLicenseStatus()`
Returns current license status.

### `checkForUpdate()`
Check for available updates.

### `performUpdate(options)`
Download and apply update.

## License

UNLICENSED - © 2026 SmartLangGuard. Free tier for personal/commercial use. Pro features require subscription.

## Links

- [GitHub](https://github.com/ahmdelbaz28-ux/rewrite)
- [Documentation](https://github.com/ahmdelbaz28-ux/rewrite#readme)
- [Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues)
