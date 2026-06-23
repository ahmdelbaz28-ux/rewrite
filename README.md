<div align="center">

# SmartLangGuard

**كتبت إنجليزي وانت ناوي عربي؟ الأداة دي بتصلحها لك في جزء من الثانية.**

`high hofhv;` → `اهلا اخبارك` ⚡

[![Tests](https://img.shields.io/badge/Tests-183%20passing-brightgreen.svg?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![Version](https://img.shields.io/badge/Version-0.2.0-blue.svg?style=flat-square)](#-whats-new-in-v020)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Win%20|%20macOS%20|%20Linux-lightgrey.svg?style=flat-square)](#-installation)

</div>

---

## ✨ إيه الجديد في النسخة 0.2.0؟

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
# تشغيل كل الاختبارات
npm test

# اختبارات حزمة معينة
npm run test:core
npm run test:backend
npm run test:mcp

# النتيجة: 183/183 ✅
```

---

## 🏗️ البنية المعمارية

```
smartlangguard/
├── packages/
│   ├── core/          # محرك الترجمة + القاموس + الكشف
│   ├── cli/           # أداة سطر الأوامر
│   ├── mcp-server/    # خادم MCP للذكاء الاصطناعي
│   ├── daemon/        # مراقب الحافظة في الخلفية
│   ├── backend/       # خادم API + SaaS + Stripe
│   ├── admin-dashboard/ # لوحة تحكم React
│   ├── vscode-extension/ # إضافة VS Code
│   └── browser-extension/ # إضافة المتصفح
├── scripts/           # سكربتات البناء والإصدار
└── .github/workflows/ # CI/CD
```

---

## 📄 الرخصة

PROPRIETARY — جميع الحقوق محفوظة © SmartLangGuard

---

<div align="center">

**صُنع بـ ❤️ لمجتمع المتحدثين بالعربية**

</div>
