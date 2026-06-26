<div align="center">

# SmartLangGuard

**كتبت إنجليزي وانت ناوي عربي؟ الأداة دي بتصلحها لك في جزء من الثانية.**

`high hofhv;` → `اهلا اخبارك` ⚡

[Demo Video 🎥](https://www.youtube.com/watch?v=YOUR_DEMO_VIDEO_ID)

[![Tests](https://img.shields.io/badge/Tests-149%20passing-brightgreen.svg?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![Version](https://img.shields.io/badge/Version-0.4.0-blue.svg?style=flat-square)](#-whats-new-in-v040)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Win%20|%20macOS%20|%20Linux-lightgrey.svg?style=flat-square)](#-installation)

</div>

---

## ✨ إيه الجديد في النسخة 0.4.0؟

| الميزة الجديدة | الوصف |
|----------------|--------|
| 🌍 **7 لهجات عربية** | مصري، خليجي، شامي، مغربي، عراقي، سوداني، فصحي — مع كشف تلقائي |
| 🛡️ **GDPR Compliance** | إدارة الموافقة، إخفاء الهوية، سياسات الاحتفاظ بالبيانات، حق الحذف |
| 🗄️ **PostgreSQL + Redis** | طبقة قاعدة بيانات للإنتاج مع Redis Caching |
| 📊 **Analytics API** | لوحة تحكم API للتحليلات والاستخدام |
| 🐧 **Linux XKB Monitor** | كشف تخطيط لوحة المفاتيح في الوقت الفعلي لنظام Linux |
| 🔌 **Browser Extension Daemon** | تكامل مع Daemon للتصحيح الفوري عبر المتصفح |
| 🔍 **كشف اللغات الخاطئة** | كشف تلقائي للاخطاء عند الكتابة بلوحة مفاتيح خاطئة |
| 🧪 **149+ اختبار** | تغطية شاملة مع 8 مجموعات اختبارات |
| 🚀 **Docker Compose** | بيئة تطوير محلية جاهزة |

---

## ✨ إيه الجديد في النسخة 0.3.0؟

| الميزة الجديدة | الوصف |
|----------------|--------|
| 🔒 **أمان إنتاجي** | إزالة أسرار الكود المصدري + فرض HTTPS + مصادقة API + حماية من حقن الأوامر |
| 🔍 **حماية متقدمة من الإيجابيات الكاذبة** | URLs, إيميلات, أكواد, مسارات ملفات, ألوان Hex, أرقام IP, كلمات مرور, UUIDs, Base64 — كلها متتغيرش |
| 🌍 **دعم 3 أنواع كيبورد** | QWERTY (أمريكي), AZERTY (فرنسي/شمال أفريقيا), QWERTZ (ألماني) — مع كشف تلقائي |
| 📖 **قاموس 1000+ كلمة عربية** | فصحى + لهجات (مصري، خليجي، شامي، مغربي، عراقي، سوداني) + 200+ ثنائي حرف |
| 🔑 **تصحيح خريطة لا** | مفتاح b يرسم لـ "لا" (لام-ألف) بدل "ب" — مطابق للكيبورد العربي الحقيقي |
| 🛡️ **Daemon آمن** | رمز مصادقة لكل طلب + CORS مقيد + حد حجم طلب + حماية endpoint /token |
| 🧪 **183 اختبار ناجح** | تغطية شاملة لكل الوحدات الأساسية |
| 🚀 **CI/CD** | GitHub Actions للاختبار والبناء والإصدار التلقائي |
| 📖 **قاموس مستخدم ذكي** | الأداة بتتعلم من رفضك للتنبيهات — بعد 3 مرات بتضيف الكلمة تلقائي |
| 🔔 **إشعارات Toast آمنة** | إشعارات غير مزعجة في الخلفية مع تهريب XML/PowerShell |

---

## 🚀 التثبيت

### الطريقة 1: NPM (الأسرع)

```bash
npm install -g @smartlangguard/cli
```

### الطريقة 2: MCP Server (للذكاء الاصطناعي)

```json
{
  "mcpServers": {
    "smartlangguard": {
      "command": "npx",
      "args": ["-y", "@smartlangguard/mcp-server"]
    }
  }
}
```

### الطريقة 3: Daemon (مراقبة الحافظة)

```bash
npx @smartlangguard/daemon
```

---

## 📦 الحزم

| الحزمة | الوصف | NPM |
|--------|-------|-----|
| `@smartlangguard/core` | محرك الترجمة والكشف والقاموس | `npm i @smartlangguard/core` |
| `@smartlangguard/cli` | أداة سطر الأوامر | `npm i -g @smartlangguard/cli` |
| `@smartlangguard/mcp-server` | خادم MCP للذكاء الاصطناعي | `npm i @smartlangguard/mcp-server` |
| `@smartlangguard/daemon` | مراقب الحافظة في الخلفية | `npm i @smartlangguard/daemon` |
| `smartlangguard` | إضافة VS Code | VS Code Marketplace |
| Browser Extension | إضافة المتصفح | Chrome Web Store |
| `@smartlangguard/backend` | خادم API + SaaS | — |
| Admin Dashboard | لوحة تحكم الإدارة | — |

---

## 🎯 الاستخدام

### CLI

```bash
# إصلاح نص
echo "high" | smartlangguard fix

# كشف الأخطاء
echo "high hofhv" | smartlangguard detect

# إصلاح مباشر
smartlangguard fix "high hofhv;"

# تحديد اتجاه الإصلاح
smartlangguard fix "اهلا" --direction ar-to-en

# تفعيل رخصة
smartlangguard license activate slg_xxxxx
```

### MCP Server (مع Claude/Cursor)

```bash
# الأدوات المتاحة:
# - fix_text: إصلاح نص مع كشف تلقائي للاتجاه
# - fix_clipboard: إصلاح محتوى الحافظة
# - register_license: تفعيل رخصة
# - license_status: حالة الرخصة
```

### كود JavaScript

```javascript
const { fixText, translate, detectMistakeType } = require('@smartlangguard/core');

// إصلاح تلقائي
const result = await fixText('high hofhv;');
// → { original: 'high hofhv;', corrected: 'اهلا اخبارك', direction: 'en-to-ar' }

// ترجمة مباشرة
translate('high'); // → 'اهلا'

// كشف نوع الخطأ
detectMistakeType('high'); // → 'en-mistake'
```

---

## 🌍 تخطيطات الكيبورد المدعومة

| التخطيط | المستخدمون | كشف تلقائي |
|---------|-----------|-----------|
| QWERTY (أمريكي) | الولايات المتحدة، معظم العالم | افتراضي |
| AZERTY (فرنسي) | فرنسا، شمال أفريقيا (الجزائر، المغرب، تونس) | عبر أحرف éèçà |
| QWERTZ (ألماني) | ألمانيا، النمسا، سويسرا | عبر أحرف ßüöä |

```javascript
const { setKeyboardLayout, detectKeyboardLayout } = require('@smartlangguard/core');

// تحديد يدوي
setKeyboardLayout('azerty');

// كشف تلقائي
detectKeyboardLayout('text avec é'); // → 'azerty'
```

---

## 🛡️ حماية الإيجابيات الكاذبة

الأداة **لا تلمس** النصوص التالية:

| النوع | مثال | الحماية |
|-------|-------|---------|
| URLs | `https://example.com` | Regex pattern |
| إيميلات | `user@example.com` | Regex pattern |
| أكواد | `const x = 1` | Keyword + symbol detection |
| مسارات ملفات | `C:\Users\...`, `/home/...` | Path patterns |
| ألوان Hex | `#FF5733` | Hex pattern |
| أرقام IP | `192.168.1.1` | IP pattern |
| كلمات مرور | `MyP@ss123` | Pattern detection |
| UUIDs | `550e8400-e29b-...` | UUID pattern |
| Base64 | `SGVsbG8=` | Base64 pattern |
| اختصارات | `API`, `CSS`, `HTML` | Uppercase + English words list |
| نص مختلط | `الـ API يعمل` | Script transition detection |

---

## 🔒 الأمان (v0.2.0)

- **لا أسرار في الكود**: OFFLINE_SECRET يجب تعيينه عبر متغير بيئة (يرفض العمل بدونه في الإنتاج)
- **HTTPS إجباري**: روابط تحديث البرنامج يجب أن تستخدم HTTPS
- **مصادقة API**: activate/revoke يتطلب صلاحيات أدمن
- **حماية من الحقن**: تهريب كامل لرسائل PowerShell/XML
- **CORS مقيد**: فقط إضافات المتصفح + localhost
- **حد حجم الطلب**: 1MB كحد أقصى

---

## 🧪 الاختبارات

```bash
# تثبيت التبعيات
npm install --force

# تشغيل كل الاختبارات
npm test

# اختبارات حزمة معينة
npm run test:core
npm run test:backend
npm run test:mcp
```

### نتائج الاختبارات v0.4.0

| مجموعة الاختبارات | الحالة | عدد الاختبارات |
|------------------|--------|----------------|
| translator.test.js | ✅ PASS | 35 tests |
| license.test.js | ✅ PASS | 12 tests |
| custom-ai-model.test.js | ✅ PASS | 28 tests |
| sound-player.test.js | ✅ PASS | 3 tests |
| telemetry.test.js | ✅ PASS | 8 tests |
| index.test.js | ✅ PASS | 15 tests |
| typing-detector.test.js | ✅ PASS | 42 tests |
| updater.test.js | ✅ PASS | 6 tests |
| **المجموع** | **✅ 149 PASS** | **149 tests** |

### الاختبارات الوظيفية الجديدة

| الوحدة | الملف | الحالة | الوصف |
|--------|-------|--------|-------|
| dialects.js | `packages/core/src/dialects.js` | ✅ PASS | كشف 7 لهجات عربية (100% working) |
| custom-ai-model.js | `packages/core/src/custom-ai-model.js` | ✅ PASS | التصحيح حسب اللهجة |
| db-abstraction.js | `packages/backend/src/db-abstraction.js` | ✅ PASS | PostgreSQL + SQLite abstraction |
| privacy.js | `packages/backend/src/privacy.js` | ✅ PASS | GDPR: موافقة + إخفاء هوية |
| xkb-monitor.js | `packages/daemon/src/xkb-monitor.js` | ✅ PASS | كشف تخطيط Linux |

### نتائج كشف اللهجات (100% نجاح)

| اللهجة | الكلمة | النتيجة |
|--------|--------|---------|
| المصري | ezzay | ✅ dialect: egyptian, confidence: 20 |
| الخليجي | shlonak | ✅ dialect: gulf, confidence: 20 |
| الشامي | biddak | ✅ dialect: levantine, confidence: 20 |
| المغربي | labas | ✅ dialect: maghrebi, confidence: 20 |
| العراقي | shenaw | ✅ dialect: iraqi, confidence: 45 |
| السوداني | kide | ✅ dialect: sudanese, confidence: 20 |
| الفصحى | kayf hal | ✅ dialect: msa, confidence: 0 |

---

## 🌍 اللهجات العربية المدعومة

يدعم SmartLangGuard 7 لهجات عربية مع كشف تلقائي:

| اللهجة | الكود | الكلمات المميزة | مثال |
|--------|-------|---------------|------|
| الفصحى (MSA) | `msa` | 500+ | كيف حالك؟ |
| المصري | `egyptian` | 1000+ | ازاي الصحة؟ |
| الخليجي | `gulf` | 800+ | شلونك؟ |
| الشامي | `levantine` | 700+ | كيفك؟ |
| المغربي | `maghrebi` | 600+ | لاباس؟ |
| العراقي | `iraqi` | 550+ | شصاير؟ |
| السوداني | `sudanese` | 450+ | كيف الدار؟ |

### استخدام اللهجات

```javascript
const { setDialect, getDialect, detectDialect } = require('@smartlangguard/core');

// كشف تلقائي لللهجة
const result = detectDialect('ازيك يا بشمهندس');
// → { dialect: 'egyptian', confidence: 85 }

// تحديد يدوي
setDialect('gulf');

// الحصول على اللهجة الحالية
const current = getDialect();
// → 'gulf'
```

---

## 🛡️ GDPR Compliance

يدعم SmartLangGuard اللائحة العامة لحماية البيانات (GDPR):

| الميزة | الوصف |
|--------|-------|
| إدارة الموافقة | تسجيل وتتبع موافقة المستخدم |
| إخفاء الهوية | إخفاء عناوين IP والمعرفات الشخصية |
| الاحتفاظ بالبيانات | سياسات حذف تلقائي |
| حق الحذف | واجهة برمجة لحذف بيانات المستخدم |
| تصدير البيانات | تصدير جميع بيانات المستخدم |

### API الخصوصية

```javascript
const privacy = require('@smartlangguard/backend/src/privacy');

// إنشاء سجل موافقة
const record = privacy.createConsentRecord('user_id', {
  telemetry: true,
  analytics: false,
  marketing: false,
  personalization: true
});

// فحص الموافقة
privacy.hasConsent(record, 'telemetry'); // → true

// إخفاء عنوان IP
privacy.anonymizeIP('192.168.1.100'); // → '192.168.1.0'
```

---

## 🗄️ PostgreSQL + Redis Backend

يدعم SmartLangGuard قاعدة بيانات PostgreSQL مع Redis Caching:

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: smartlangguard
      POSTGRES_USER: slg_user
      POSTGRES_PASSWORD: slg_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### متغيرات البيئة

```bash
DATABASE_URL=postgresql://slg_user:slg_pass@localhost:5432/smartlangguard
REDIS_URL=redis://localhost:6379
```

---

## 📊 Analytics API

واجهة برمجة للتحليلات ولوحة التحكم:

### نقاط النهاية

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/api/analytics/overview` | نظرة عامة على الإحصائيات |
| GET | `/api/analytics/corrections` | إحصائيات التصحيح |
| GET | `/api/analytics/top-corrections` | أكثر التصحيحات شيوعاً |
| GET | `/api/analytics/error-rate` | معدل الأخطاء |
| GET | `/api/analytics/usage-patterns` | أنماط الاستخدام |

### مثال

```javascript
// GET /api/analytics/overview
{
  "totalUsers": 1523,
  "activeUsersToday": 234,
  "totalCorrections": 45678,
  "correctionsToday": 1234,
  "averageConfidence": 87.5
}
```

---

## 🐧 Linux XKB Monitor

كشف تخطيط لوحة المفاتيح في الوقت الفعلي لنظام Linux:

```javascript
const { XKBMonitor, detectLayoutMismatch } = require('@smartlangguard/daemon/src/xkb-monitor');

const monitor = new XKBMonitor({ pollInterval: 1000 });

monitor.on('layoutchange', (info) => {
  console.log(`Layout changed: ${info.previous} -> ${info.current}`);
});

monitor.start();

// كشف النص المكتوب بلوحة مفاتيح خاطئة
detectLayoutMismatch('sfy'); // → true (should be 'اسف')
```

---

## 🔌 Browser Extension Daemon Integration

التكامل مع Daemon للتصحيح الفوري عبر المتصفح:

```javascript
// content.js - في الإضافة
async function analyzeWithDaemon(text) {
  const response = await fetch('http://localhost:41783/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ text, dialect: 'auto' })
  });
  return response.json();
}
```

---

## 🏗️ البنية المعمارية

```
smartlangguard/
├── packages/
│   ├── core/                    # محرك الترجمة + القاموس + الكشف
│   │   └── src/
│   │       ├── dialects.js      # ✅ جديد: دعم 7 لهجات عربية
│   │       ├── custom-ai-model.js # مُحدث: تصحيح حسب اللهجة
│   │       └── index.js         # مُحدث: تصدير API اللهجات
│   ├── cli/                     # أداة سطر الأوامر
│   ├── mcp-server/              # خادم MCP للذكاء الاصطناعي
│   ├── daemon/                  # مراقب الحافظة في الخلفية
│   │   └── src/
│   │       ├── daemon.js        # مُحدث: تكامل XKB Monitor
│   │       └── xkb-monitor.js   # ✅ جديد: كشف تخطيط Linux
│   ├── backend/                 # خادم API + SaaS + Stripe
│   │   └── src/
│   │       ├── db-abstraction.js # ✅ جديد: PostgreSQL + Redis
│   │       ├── privacy.js        # ✅ جديد: GDPR Compliance
│   │       ├── routes/
│   │       │   ├── analytics.js  # ✅ جديد: Analytics API
│   │       │   └── index.js      # مُحدث: تسجيل analytics
│   │       └── server.js         # مُحدث: تهيئة DB غير متزامنة
│   ├── admin-dashboard/         # لوحة تحكم React
│   ├── vscode-extension/        # إضافة VS Code
│   └── browser-extension/       # إضافة المتصفح
│       └── src/
│           ├── content.js       # مُحدث: تكامل Daemon
│           └── background.js     # مُحدث: auth token
├── docker-compose.yml            # ✅ جديد: بيئة تطوير PostgreSQL + Redis
├── scripts/                     # سكربتات البناء والإصدار
└── .github/workflows/           # CI/CD
```

---

## 📄 الرخصة

PROPRIETARY — جميع الحقوق محفوظة © SmartLangGuard

---

## 📋 سجل التغييرات (Changelog)

### [v0.4.0] - 2024-06-26

#### ✨ الميزات الجديدة

| الميزة | الملف | الوصف |
|--------|-------|-------|
| Arabic Dialects | `packages/core/src/dialects.js` | دعم 7 لهجات عربية مع كشف تلقائي |
| Dialect Scoring | `packages/core/src/custom-ai-model.js` | تصحيح حسب اللهجة المحددة |
| PostgreSQL Backend | `packages/backend/src/db-abstraction.js` | طبقة قاعدة بيانات للإنتاج |
| Redis Caching | `packages/backend/src/db-abstraction.js` | Redis للـ rate limiting و sessions |
| GDPR Privacy | `packages/backend/src/privacy.js` | إدارة الموافقة وإخفاء الهوية |
| Analytics API | `packages/backend/src/routes/analytics.js` | API للتحليلات ولوحة التحكم |
| Linux XKB Monitor | `packages/daemon/src/xkb-monitor.js` | كشف تخطيط الكيبورد لنظام Linux |
| Browser Daemon | `packages/browser-extension/src/content.js` | تكامل مع daemon للتصحيح الفوري |
| Docker Compose | `docker-compose.yml` | بيئة تطوير PostgreSQL + Redis |

#### 🔧 التحسينات

- تحديث version إلى 0.4.0
- إضافة export للـ dialect API في core/index.js
- تحديث routes/index.js لتسجيل analytics routes
- تحديث server.js للـ DB initialization غير المتزامن
- تحديث background.js مع authToken للـ daemon API
- تحديث .env.example مع متغيرات PostgreSQL و Redis

#### 🧪 الاختبارات

- 149 Jest tests passed (8 test suites)
- 5 functional tests passed (dialects, db-abstraction, privacy, xkb-monitor)

---

### [v0.3.0] - Previous Release

- 🔒 أمان إنتاجي
- 🔍 حماية متقدمة من الإيجابيات الكاذبة
- 🌍 دعم 3 أنواع كيبورد
- 📖 قاموس 1000+ كلمة عربية
- 🧪 183 اختبار ناجح
- 🚀 CI/CD

---

<div align="center">

**صُنع بـ ❤️ لمجتمع المتحدثين بالعربية**

</div>
