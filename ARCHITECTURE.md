# Architecture — SmartLangGuard

## Design Principles

1. **Core-first**: All translation logic lives in a single, fast, cross-platform binary. Every UI surface (CLI, MCP, Daemon, VS Code, Browser) is a thin wrapper over the Core.
2. **Offline-capable**: The Core works without internet. License validation falls back to HMAC-signed offline tokens.
3. **AI as enhancement, not dependency**: Rules-based translation is the default. AI scoring is a Pro-tier upgrade for ambiguous cases only.
4. **Privacy-first telemetry**: All telemetry is anonymized, opt-out, and batched. No PII ever leaves the device.
5. **Defense in depth**: Multiple security layers — license tokens, device fingerprints, signed updates, rate limiting, JWT admin auth.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER APPLICATION                          │
│  (Cursor, Claude Desktop, Terminal, VS Code, Browser, etc.)      │
└──────────────────────────────────────────────────────────────────┘
            │              │              │              │
            │ MCP          │ CLI          │ HTTP         │ IPC
            ▼              ▼              ▼              ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ MCP Server │  │    CLI     │  │  Daemon    │  │ VS Code    │
   │            │  │            │  │ (HTTP API) │  │ Extension  │
   │ stdio JSON │  │ args/pipe  │  │ :41783     │  │ (TS)       │
   └────────────┘  └────────────┘  └────────────┘  └────────────┘
            │              │              │              │
            └──────────────┴──────────────┴──────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │   SmartLangGuard Core │
                       │   (Node.js binary)    │
                       │                       │
                       │  ┌─────────────────┐  │
                       │  │ Translation Eng │  │  ← Rules (instant, offline)
                       │  └─────────────────┘  │
                       │  ┌─────────────────┐  │
                       │  │ AI Scoring      │  │  ← Hybrid (local + remote)
                       │  └─────────────────┘  │
                       │  ┌─────────────────┐  │
                       │  │ License Layer   │  │  ← Online + offline (HMAC)
                       │  └─────────────────┘  │
                       │  ┌─────────────────┐  │
                       │  │ Telemetry       │  │  ← Batched, anonymized
                       │  └─────────────────┘  │
                       │  ┌─────────────────┐  │
                       │  │ Auto-Updater    │  │  ← SHA256-verified
                       │  └─────────────────┘  │
                       └───────────────────────┘
                                   │
                                   ▼ (HTTPS, optional)
                       ┌───────────────────────┐
                       │   SaaS Backend        │
                       │   (Express + SQLite)  │
                       │                       │
                       │  /v1/license/*        │
                       │  /v1/telemetry/*      │
                       │  /v1/ai/score         │
                       │  /v1/admin/*          │
                       │  /v1/stripe/webhook   │
                       └───────────────────────┘
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │  External Services    │
                       │  • Stripe             │
                       │  • OpenAI / Anthropic │
                       │  • GitHub Releases    │
                       └───────────────────────┘
```

---

## Translation Engine

### Phase 1: Rules-based (always runs)

```
Input: "high hofhv;"
  ↓
  Character-by-character mapping (EN_TO_AR table)
  ↓
Output: "اهلا اخبارك"
```

Time: <1ms for typical text. 100% offline.

### Phase 2: Local context scoring

```
Output: "اهلا اخبارك"
  ↓
  Word-level scoring against common Arabic dictionary
  + Bigram model (e.g. "اهلا بك" → +95)
  ↓
Score: 90/100
```

If score ≥ 70 → done. If score < 30 → ambiguous.

### Phase 3: Remote AI scoring (Pro tier, ambiguous cases only)

```
Original: "high"
Candidates: ["اهلا", "هجلف"]  (alternate interpretations)
  ↓
POST /v1/ai/score (with Pro license)
  ↓
LLM picks best candidate based on context
  ↓
Result: { best: "اهلا", confidence: 95, source: "llm" }
```

Fallback: if LLM is unavailable or user is on Free tier, use best local candidate.

---

## License Validation Flow

```
┌─────────────┐
│ User opens  │
│ CLI/MCP/etc │
└─────────────┘
      │
      ▼
┌─────────────────────┐    Cache hit (24h TTL)
│ Check local cache   │──────────────────► Valid → proceed
└─────────────────────┘
      │ (miss)
      ▼
┌─────────────────────┐    200 OK
│ POST /v1/license/   │──────────────────► Cache + proceed
│   validate          │
└─────────────────────┘
      │ (network error)
      ▼
┌─────────────────────┐    Signature valid + not expired
│ Try offline token   │──────────────────► Valid (offline mode)
│ (HMAC verify)       │
└─────────────────────┘
      │ (invalid)
      ▼
   Free tier (rules-only)
```

---

## MCP Protocol Flow

```
AI Tool (Cursor)             MCP Server (slg mcp)
     │                              │
     │── initialize ──────────────►│
     │◄─ capabilities ─────────────│
     │                              │
     │── tools/list ──────────────►│
     │◄─ [fix_text, fix_clipboard, │
     │    register_license, ...] ──│
     │                              │
     │── tools/call ──────────────►│
     │   { name: "fix_text",       │
     │     arguments: { text: ...} │
     │   }                         │
     │                              │── core.fixText()
     │                              │
     │◄─ { content: [{             │
     │      type: "text",          │
     │      text: "{corrected:...}"│
     │    }] } ────────────────────│
```

---

## Daemon Architecture

```
┌─────────────────────────────────────────┐
│            Daemon Process               │
│                                         │
│  ┌─────────────┐    ┌──────────────┐    │
│  │ Clipboard   │    │  Hotkey      │    │
│  │ Monitor     │    │  Listener    │    │
│  │ (1s poll)   │    │  (OS hook)   │    │
│  └─────────────┘    └──────────────┘    │
│         │                  │            │
│         ▼                  ▼            │
│      ┌──────────────────────────┐       │
│      │     Core.fixText()       │       │
│      └──────────────────────────┘       │
│         │                  │            │
│         ▼                  ▼            │
│      ┌─────────────┐  ┌──────────┐      │
│      │ Write back  │  │ Show OS  │      │
│      │ to clipboard│  │ notif.   │      │
│      └─────────────┘  └──────────┘      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Local HTTP Server (port 41783) │    │
│  │  • POST /fix                    │    │
│  │  • POST /clipboard/fix          │    │
│  │  • POST /autofix/toggle         │    │
│  │  • GET  /status                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Database Schema (SaaS Backend)

```sql
-- Licenses
licenses(
  id, token, tier, email,
  stripe_customer_id, stripe_subscription_id,
  device_fingerprints, features, max_devices,
  expires_at, created_at, updated_at, revoked
)

-- Device registrations
devices(
  id, license_id, fingerprint,
  hostname, platform, last_seen, created_at
)

-- Telemetry events
telemetry_events(
  id, anonymous_id, event, properties,
  os, app_version, session_id, timestamp
)

-- Admin users
admin_users(
  id, username, password_hash, role, created_at
)

-- API keys (for analytics access)
api_keys(
  key, name, scopes, created_at, last_used, revoked
)
```

---

## Update Flow

```
1. App starts → check for update (background)
2. GET /latest.json → { version, url, sha256, signature }
3. Compare versions (semver)
4. If newer:
   a. Download binary
   b. Verify SHA256 hash
   c. Verify signature (RSA)
   d. Backup current binary
   e. Replace
   f. Schedule restart
5. On next start: clean up backup
```

---

## Threat Model

| Threat | Mitigation |
|--------|------------|
| License token sharing | Device fingerprinting + per-tier device limits |
| Binary tampering | SHA256 + RSA signature on every update |
| Token theft from disk | Tokens stored mode 0600, HMAC-signed for offline use |
| Telemetry PII leakage | Anonymized IDs, no IP/user-agent storage |
| Admin endpoint abuse | JWT auth + rate limiting + IP allowlist (configurable) |
| AI API cost abuse | Pro-tier gating + rate limiting + caching |
| Stripe webhook forgery | Signature verification |

---

## Performance Characteristics

| Operation | Latency | Memory |
|-----------|---------|--------|
| Rules translation (100 chars) | <1ms | 2MB |
| Local context scoring | <5ms | 2MB |
| Remote AI scoring | 200-500ms | 5MB |
| License validation (cached) | <1ms | 2MB |
| License validation (online) | 50-200ms | 2MB |
| Binary size (pkg) | - | 40MB |
| Binary size (with bytenode) | - | 25MB |
