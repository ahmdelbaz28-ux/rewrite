# API Reference — SmartLangGuard SaaS Backend

Base URL: `https://api.smartlangguard.com` (production) or `http://localhost:4000` (local)

All endpoints are under `/v1/`. All request bodies are JSON. All responses are JSON.

---

## Authentication

### License token (Bearer)

Most endpoints require a license token in the `Authorization` header:

```
Authorization: Bearer slg_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Admin JWT

Admin endpoints require a JWT obtained from `/v1/admin/login`:

```
Authorization: Bearer <jwt>
```

### API Key

Some endpoints (e.g. telemetry stats) require an API key:

```
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## License Endpoints

### POST /v1/license/validate

Validate a license token and register the calling device.

**Request:**
```json
{
  "token": "slg_xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Headers (recommended):**
```
X-Device-Id: dev_abc123
X-Device-Fingerprint: sha256hash
X-Hostname: my-laptop
X-Platform: darwin-arm64
```

**Response (200):**
```json
{
  "valid": true,
  "tier": "pro",
  "features": ["rules-only", "ai-scoring", "multi-device", "cloud-sync"],
  "expires_at": 1735689600000,
  "max_devices": 3,
  "devices_registered": 1
}
```

**Response (invalid):**
```json
{
  "valid": false
}
```

**Response (max devices reached):**
```json
{
  "valid": false,
  "reason": "max_devices_reached",
  "max_devices": 3
}
```

---

### POST /v1/license/activate

Create a new license. Public endpoint (no auth required).

**Request:**
```json
{
  "email": "user@example.com",
  "tier": "pro"
}
```

**Response (201):**
```json
{
  "token": "slg_abc123...",
  "offline_token": "eyJhbGc...",
  "tier": "pro",
  "features": ["rules-only", "ai-scoring", "multi-device", "cloud-sync"],
  "max_devices": 3,
  "expires_at": 1735689600000
}
```

---

### POST /v1/license/revoke

Revoke a license.

**Request:**
```json
{
  "token": "slg_xxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response:**
```json
{ "success": true }
```

---

### GET /v1/license/info/:token

Get detailed info about a license.

**Response:**
```json
{
  "token": "slg_...",
  "tier": "pro",
  "email": "user@example.com",
  "features": ["rules-only", "ai-scoring", "multi-device", "cloud-sync"],
  "max_devices": 3,
  "expires_at": 1735689600000,
  "created_at": 1720000000000,
  "devices_registered": 2,
  "devices_remaining": 1
}
```

---

## Telemetry Endpoints

### POST /v1/telemetry/batch

Submit a batch of telemetry events. Max 100 events per batch.

**Request:**
```json
{
  "events": [
    {
      "anonymous_id": "anon_abc123",
      "event": "correction_applied",
      "properties": { "direction": "en-to-ar", "length": 12, "score": 90 },
      "os": "darwin-arm64",
      "app_version": "0.1.0",
      "session_id": 12345,
      "timestamp": 1720000000000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 1
}
```

---

### GET /v1/telemetry/stats

Aggregated telemetry stats. Requires API key with `analytics` scope.

**Query params:**
- `since` (optional, unix ms timestamp, default: 30 days ago)

**Response:**
```json
{
  "since": 1717200000000,
  "total_events": 15423,
  "unique_users": 234,
  "by_event": [
    { "event": "correction_applied", "count": 12000 },
    { "event": "extension_activated", "count": 3000 }
  ],
  "daily": [
    { "day": "2026-06-18", "count": 523 },
    { "day": "2026-06-17", "count": 612 }
  ]
}
```

---

## AI Endpoints

### POST /v1/ai/score

Get AI-powered scoring for ambiguous layout-mistake cases. Requires Pro+ license.

**Request:**
```json
{
  "original": "high",
  "candidates": ["اهلا", "هجلف"]
}
```

**Response:**
```json
{
  "best_candidate": "اهلا",
  "confidence": 95,
  "source": "llm"
}
```

**Response (free tier):**
```json
{
  "error": "AI scoring requires Pro tier",
  "upgrade_url": "https://smartlangguard.com/pricing"
}
```

---

## Admin Endpoints

All admin endpoints require JWT auth: `Authorization: Bearer <admin-jwt>`

### POST /v1/admin/login

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbG...",
  "username": "admin",
  "role": "admin"
}
```

---

### GET /v1/admin/dashboard

**Response:**
```json
{
  "licenses": {
    "total": 1542,
    "active": 1423,
    "by_tier": [
      { "tier": "free", "count": 1200 },
      { "tier": "pro", "count": 300 },
      { "tier": "team", "count": 40 },
      { "tier": "enterprise", "count": 2 }
    ]
  },
  "devices": {
    "total": 2341,
    "active_7d": 1872
  },
  "events": {
    "total": 154230,
    "last_24h": 5234,
    "top_events": [
      { "event": "correction_applied", "count": 50000 },
      { "event": "extension_activated", "count": 8000 }
    ]
  }
}
```

---

### GET /v1/admin/licenses

**Query params:**
- `tier` (filter by tier)
- `status` (`active`, `expired`, `revoked`)
- `limit` (default 50, max 200)
- `offset` (for pagination)

**Response:**
```json
{
  "licenses": [
    {
      "id": 1,
      "token": "slg_...",
      "tier": "pro",
      "email": "user@example.com",
      "max_devices": 3,
      "expires_at": 1735689600000,
      "created_at": 1720000000000,
      "revoked": false
    }
  ],
  "total": 1542,
  "limit": 50,
  "offset": 0
}
```

---

### POST /v1/admin/licenses

Manually create a license (for customer support).

**Request:**
```json
{
  "tier": "pro",
  "email": "vip@example.com",
  "max_devices": 5,
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "token": "slg_...",
  "tier": "pro",
  "email": "vip@example.com",
  "features": [...],
  "max_devices": 5,
  "expires_at": 1750000000000
}
```

---

### DELETE /v1/admin/licenses/:token

Revoke a license.

---

### POST /v1/admin/api-keys

Create a new API key for analytics access.

**Request:**
```json
{
  "name": "Analytics Dashboard",
  "scopes": ["analytics"]
}
```

**Response (201):**
```json
{
  "key": "sk_...",
  "name": "Analytics Dashboard",
  "scopes": ["analytics"]
}
```

---

## Stripe Endpoints

### POST /v1/stripe/webhook

Receives Stripe webhook events. Configure in Stripe Dashboard:

- URL: `https://api.smartlangguard.com/v1/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`

Signature verification is automatic when `STRIPE_WEBHOOK_SECRET` is set.

**Handled events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/upgrade license |
| `customer.subscription.updated` | Update tier or status |
| `customer.subscription.deleted` | Downgrade to free |
| `invoice.paid` | Extend expiry by 30 days |

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (missing/invalid params) |
| 401 | Unauthorized (missing/invalid token) |
| 402 | Payment required (Free tier hitting Pro endpoint) |
| 403 | Forbidden (insufficient scope or device limit) |
| 404 | Not found |
| 413 | Payload too large (>100 telemetry events) |
| 429 | Rate limited (100 req / 15 min) |
| 500 | Internal server error |

All errors return:
```json
{
  "error": "Human-readable message"
}
```

---

## Rate Limiting

- All `/v1/` endpoints: 100 requests per 15 minutes per IP
- Telemetry batch: 100 events per request
- AI scoring: 50 requests per hour per license (Pro tier)

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1720000900
```

---

## SDKs (planned)

- `npm install @smartlangguard/sdk` — JavaScript/TypeScript
- `pip install smartlangguard` — Python
- `go get github.com/smartlangguard/sdk-go` — Go

For now, use any HTTP client to call the REST API directly.
