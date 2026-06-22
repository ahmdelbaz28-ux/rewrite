<div align="center">

<img src="docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="100" />

# SmartLangGuard

**كتبت إنجليزي وانت ناوي عربي؟ الأداة دي بتصلحها لك في جزء من الثانية.**

`high hofhv;` → `اهلا اخبارك` ⚡

[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg?style=flat-square&label=CLI&color=blue)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Tests](https://img.shields.io/badge/Tests-180%20passing-brightgreen.svg?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Win%20|%20macOS%20|%20Linux-lightgrey.svg?style=flat-square)](#-installation)

</div>

---

## إيه الحكاية؟

تخيل إنك بتكتب عربي، لكن نسيت تغيّر لغة الكيبورد من إنجليزي لعربي.  
بدل ما تكتب **"اهلا اخبارك"** طلعت منك **"high hofhv;"** — وده غلط مش في الإملاء، ده غلط في **لغة الكيبورد**.

**SmartLangGuard** بيكتشف الغلطة دي **أوتوماتيك** ويصلحها لك من غير ما تعمل أي حاجة يدوي.

### الفكرة ببساطة

كل زر في الكيبورد بيلعب دورين:

| لما الكيبورد **إنجليزي** | نفس الزر لما الكيبورد **عربي** |
|:---:|:---:|
| `h` | `ا` |
| `i` | `ه` |
| `g` | `ل` |
| `h` | `ا` |

يعني **`high`** (بالإنجليزي) = **`اهلا`** (بالعربي) — نفس الأزرار بالظبط!

---

## المتطلبات (قبل ما تبدأ)

### 1. Node.js (محرك JavaScript)

الأداة محتاجة **Node.js** عشان تشتغل. ده برنامج مجاني بتثبته مرة واحدة.

**إزاي أتأكد إن عندي Node.js؟**

افتح **PowerShell** أو **Terminal** واكتب:
```bash
node --version
```

- لو ظهر رقم زي `v18.20.0` أو أعلى → تمام، عندك Node.js
- لو ظهر خطأ → محتاج تثبته

**إزاي أثبّت Node.js؟**

1. روح للموقع: [https://nodejs.org](https://nodejs.org)
2. اضغط على الزر الأخضر الكبير **"Download Node.js"** (اختار LTS)
3. شغّل الملف اللي نزل واضغط **Next → Next → Install → Finish**
4. افتح PowerShell تاني واكتب `node --version` — المفروض يظهر الرقم

### 2. تحميل المشروع

محتاج تنزّل نسخة من المشروع على جهازك. عندك طريقتين:

**الطريقة الأولى: Git (لو عندك)**
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
npm install
```

**الطريقة الثانية: تحميل يدوي**
1. روح لـ [https://github.com/ahmdelbaz28-ux/rewrite](https://github.com/ahmdelbaz28-ux/rewrite)
2. اضغط **Code** (الزر الأخضر) → **Download ZIP**
3. فك الضغط عن الملف
4. افتح PowerShell داخل المجلد واكتب:
```bash
npm install
```

> ⏱️ `npm install` بتاخد دقيقة أو اتنين. بتحمّل كل المكتبات اللي المشروع محتاجها.

---

## 10 طرق تستخدم بيها الأداة

---

### الطريقة 1: سطر الأوامر (CLI) — أبسط طريقة

> **مناسبة لـ:** تصحيح نص معين بسرعة من أي مكان

**خطوة بخطوة:**

**1.** افتح **PowerShell** (Windows) أو **Terminal** (Mac/Linux)
   - **Windows:** اضغط على كيبورد `Win + R`، اكتب `powershell`، اضغط Enter
   - **Mac:** افتح تطبيق **Terminal**

**2.** روح للمجلد بتاع المشروع:
```bash
cd c:\Users\EWS-01\Documents\Qoder\2026-06-22\chat-1\rewrite
```
> غيّر المسار ده حسب مكان المشروع عندك

**3.** اكتب الأمر ده لتصحيح نص:
```bash
node packages/cli/bin/smartlangguard.js fix "high hofhv;"
```

**النتيجة:**
```
اهلا اخبارك
```

**أمثلة إضافية:**

```bash
# كلمة واحدة
node packages/cli/bin/smartlangguard.js fix "high"
# النتيجة: اهلا

# بالعكس (عربي → إنجليزي) لو الكيبورد كان عربي وانت ناوي إنجليزي
node packages/cli/bin/smartlangguard.js fix "اهلا" -d ar-to-en
# النتيجة: high

# مع تفاصيل أكتر (نسبة الثقة + الاتجاه)
node packages/cli/bin/smartlangguard.js fix "high" --format text-with-meta
# النتيجة:
# اهلا
# [direction: en-to-ar | confidence: 90% | source: rules]

# بصيغة JSON (مفيدة للبرمجة)
node packages/cli/bin/smartlangguard.js fix "high" --format json
```

---

### الطريقة 2: الوضع التفاعلي (Interactive) — زي شات بوت

> **مناسبة لـ:** لو عايز تصحّح أكتر من نص ورا بعض

**خطوة بخطوة:**

**1.** افتح PowerShell وروح لمجلد المشروع (زي الطريقة 1)

**2.** اكتب:
```bash
node packages/cli/bin/smartlangguard.js interactive
```

**هتظهر لك:**
```
SmartLangGuard Interactive Mode
Type text and press Enter to fix. Type "exit" or Ctrl+D to quit.

smartlangguard>
```

**3.** اكتب أي نص واضغط **Enter**:
```
smartlangguard> high
→ اهلا
  [en-to-ar | 90% confidence | rules]
```

**4.** اكتب تاني:
```
smartlangguard> hofhv;
→ اخبارك
  [en-to-ar | 85% confidence | rules]
```

**5.** لما تخلص، اكتب `exit`:
```
smartlangguard> exit
Goodbye!
```

---

### الطريقة 3: اكتشاف الأخطاء من غير تصحيح (Detect)

> **مناسبة لـ:** لو عايز تشوف الأخطاء فين بالظبط من غير ما الأداة تعدّل

**خطوة بخطوة:**

```bash
node packages/cli/bin/smartlangguard.js detect "high hofhv;"
```

**النتيجة:**
```
Found 2 mistake(s):

  1. "high" → "اهلا" (en-to-ar) [pos 0-4]
  2. "hofhv;" → "اخبارك" (en-to-ar) [pos 5-11]
```

> بيقولك: لقيت غلطتين. الأولى "high" المفروض تكون "اهلا"، والتانية "hofhv;" المفروض تكون "اخبارك"

**بصيغة JSON:**
```bash
node packages/cli/bin/smartlangguard.js detect "high hofhv;" --format json
```

---

### الطريقة 4: تصحيح ملف كامل

> **مناسبة لـ:** لو عندك ملف نصي (txt, md) وفيه كلام مكتوب بالكيبورد الغلط

**خطوة بخطوة:**

**1.** جهّز ملف اسمه `myfile.txt` وحطّ فيه النص الغلط، مثلا:
```
high hofhv;
```

**2.** اكتب الأمر:
```bash
node packages/cli/bin/smartlangguard.js fix -f myfile.txt -o fixed.txt
```

**3.** افتح ملف `fixed.txt` — هتلاقي:
```
اهلا اخبارك
```

---

### الطريقة 5: من خلال Pipe (أوتوماتيك من برامج تانية)

> **مناسبة لـ:** لو عايز تربط الأداة مع أدوات تانية أو سكريبتات

```bash
# على Windows (PowerShell)
echo "high" | node packages/cli/bin/smartlangguard.js fix
# النتيجة: اهلا

# على Mac/Linux
echo "high" | node packages/cli/bin/smartlangguard.js fix
# النتيجة: اهلا
```

---

### الطريقة 6: Daemon (خدمة في الخلفية) — ⭐ الأنسب للمستخدم العادي

> **مناسبة لـ:** تشغيل الأداة في الخلفية عشان تراقب الـ Clipboard وتصلح أي نص تعمل له Copy

**الميزة الكبيرة:** بتشتغل في الخلفية وتراقب كل حاجة بتعملها Copy. ولو ضغطت `Ctrl+Shift+Space`، بتصلح الـ Clipboard فورًا.

**خطوة بخطوة:**

**1.** افتح PowerShell وروح لمجلد المشروع

**2.** شغّل الـ Daemon:
```bash
node packages/daemon/src/daemon.js
```

**هتظهر لك:**
```
+--------------------------------------------+
|  SmartLangGuard Daemon v0.1.3              |
|--------------------------------------------|
|  + Clipboard monitor: ACTIVE               |
|  + Global hotkey: Ctrl+Shift+Space         |
|  + Local API: http://localhost:41783       |
+--------------------------------------------+
Press Ctrl+C to stop.
```

> ⚠️ **مهم:** خلي الـ Terminal ده مفتوح. لو قفلته، الـ Daemon هيقف.

**3.** جرّب:
   - انسخ أي نص إنجليزي (مثلا: `high hofhv;`)
   - اضغط **`Ctrl+Shift+Space`**
   - اعمل **Paste** (`Ctrl+V`) — هتلاقي النص اتصلح!

**4.** إيقاف الـ Daemon: اضغط `Ctrl+C` في الـ Terminal

---

### الطريقة 7: إضافة المتصفح (Browser Extension)

> **مناسبة لـ:** لو بتكتب كتير في المتصفح (Facebook, Twitter, Gmail, WhatsApp Web...)

**الأداة بتعمل إيه في المتصفح:**
- بتكتشف وانت بتكتب لو الكيبورد غلط
- بتديك صوت تنبيه
- بتصلح النص بضغطة واحدة: `Ctrl+Shift+Backspace`

**خطوة بخطوة:**

**1.** شغّل الـ Daemon الأول (الطريقة 6) — خليه شغال في الخلفية

**2.** افتح **Chrome** واكتب في شريط العنوان:
```
chrome://extensions
```

**3.** فعّل **Developer mode** (المفتاح في أعلى يمين الصفحة)

**4.** اضغط **Load unpacked**

**5.** اختار المجلد ده:
```
packages/browser-extension
```
(داخل مجلد المشروع)

**6.** هتلاقي أيقونة SmartLangGuard ظهرت في شريط الأدوات ✓

**إزاي تستخدمها:**

| عايز تعمل إيه؟ | إزاي |
|---|---|
| تصحّح نص محدّد | حدد النص → كليك يمين → **SmartLangGuard: Fix Selection** |
| اختصار سريع | حدد النص → `Ctrl+Shift+L` |
| تصحّح آخر كلمة كتبتها | وانت بتكتب → `Ctrl+Shift+Backspace` |
| تفتح الإعدادات | اضغط على الأيقونة → **Settings** |
| تفتح النافذة المنبثقة | اضغط على أيقونة SmartLangGuard في شريط الأدوات |

**لو ظهرت رسالة "Daemon offline":**
- تأكد إن الـ Daemon شغال (الطريقة 6)
- اضغط على الأيقونة → لازم تظهر "Daemon running"

---

### الطريقة 8: إضافة VS Code

> **مناسبة لـ:** لو بتكتب كود أو ملاحظات في VS Code وعايز تصحيح تلقائي

**خطوة بخطوة:**

**1.** ثبّت الـ CLI عالميًا:
```bash
npm install -g @smartlangguard/cli
```

**2.** افتح **VS Code**

**3.** اضغط `Ctrl+Shift+X` (عشان تفتح قسم الإضافات)

**4.** دوّر على `SmartLangGuard` واضغط **Install**

> لو مش لاقيها، ممكن تعمل Build من الكود:
> ```bash
> cd packages/vscode-extension
> npm run compile
> ```

**5.** بعد التثبيت، الأداة بتشتغل أوتوماتيك:

| عايز تعمل إيه؟ | إزاي |
|---|---|
| تصحّح النص المحدد | حدد النص → `Ctrl+Shift+P` → اكتب "Fix Selection" |
| تصحّح آخر كلمة | `Ctrl+Shift+Backspace` |
| تشوف الحالة | اضغط على "SmartLangGuard" في شريط الحالة (تحت) |
| تغيّر الصوت | `Ctrl+Shift+P` → "SmartLangGuard: Sound Selection" |

---

### الطريقة 9: MCP Server (مع أدوات الذكاء الاصطناعي)

> **مناسبة لـ:** لو بتستخدم Claude Desktop أو Cursor أو Cline وعايز الذكاء الاصطناعي يقدر يصحّح النص

**خطوة بخطوة:**

**1.** ثبّت الـ CLI:
```bash
npm install -g @smartlangguard/cli
```

**2.** افتح ملف إعدادات Claude Desktop:
   - **Windows:** `C:\Users\YOUR_NAME\AppData\Roaming\Claude\claude_desktop_config.json`
   - **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**3.** أضف الكود ده:
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

**4.** أعد تشغيل Claude Desktop

**5.** دلوقتي Claude يقدر يستخدم الأداة. جرب تقول له:
> "Fix this text: high hofhv;"

وهو بيرد عليك بـ: **"اهلا اخبارك"**

---

### الطريقة 10: Node.js API (للمبرمجين)

> **مناسبة لـ:** لو عايز تبني تطبيقك الخاص وتدمج الأداة جواه

**خطوة بخطوة:**

**1.** ثبّت المكتبة في مشروعك:
```bash
npm install @smartlangguard/core
```

**2.** اكتب الكود:
```javascript
const core = require('@smartlangguard/core');

// تهيئة (مرة واحدة)
await core.init({ telemetryEnabled: false });

// تصحيح نص
const result = await core.fixText('high hofhv;');
console.log(result.corrected);  // اهلا اخبارك
console.log(result.direction);  // en-to-ar
console.log(result.score);      // 88

// تصحيح بالعكس
const result2 = await core.fixText('اهلا', { direction: 'ar-to-en' });
console.log(result2.corrected); // high
```

---

## كل الأوامر في مكان واحد

| الأمر | بيعمل إيه |
|-------|----------|
| `fix "نص"` | يصحّح النص |
| `fix -f ملف.txt -o نتيجة.txt` | يصحّح ملف ويحط النتيجة في ملف تاني |
| `fix --format json "نص"` | يصحّح ويعرض النتيجة بصيغة JSON |
| `fix --format text-with-meta "نص"` | يصحّح ويعرض نسبة الثقة |
| `fix -d ar-to-en "اهلا"` | يصحّح بالعكس (عربي → إنجليزي) |
| `detect "نص"` | يكتشف الأخطاء من غير ما يصحّح |
| `interactive` | وضع تفاعلي (شات) |
| `daemon` | يشغّل خدمة في الخلفية |
| `mcp` | يشغّل MCP server للذكاء الاصطناعي |
| `license activate <رمز>` | يفعّل رخصة |
| `license status` | يعرض حالة الرخصة |
| `config set telemetry false` | يوقف التتبع |
| `update check` | يدور على تحديث |
| `sound play ding` | يشغّل صوت تنبيه |
| `sound list` | يعرض قائمة الأصوات |

---

## المميزات والباقات

| الميزة | مجاني | Pro ($5/شهر) |
|--------|:----:|:-----------:|
| تصحيح النصوص | ✅ | ✅ |
| CLI + Daemon + Hotkey | ✅ | ✅ |
| إضافة VS Code | ✅ | ✅ |
| إضافة المتصفح | ✅ | ✅ |
| تصحيح بالذكاء الاصطناعي (AI) | — | ✅ |
| عدد الأجهزة | 1 | 3 |
| دعم فني | — | ✅ أولوية |

---

## الأسئلة الشائعة

### س: الأداة بتبعت بياناتي لأي حد؟
**لا.** كل التصحيح بيتم **على جهازك**. مفيش بيانات بتتبعت لأي سيرفر.

### س: بتشتغل offline؟
**أيوا.** بعد ما تثبّت، الأداة بتشتغل من غير إنترنت.

### س: بتدعم لغات تانية غير العربي والإنجليزي؟
**لأ حاليًا.** بس العربي والإنجليزي. ممكن نضيف لغات تانية في المستقبل.

### س: إزاي أعرف الأداة شغالة؟
جرّب:
```bash
node packages/cli/bin/smartlangguard.js fix "high"
```
لو النتيجة طلعت `اهلا` → الأداة شغالة تمام ✓

---

## الاختبارات (Tests)

```bash
npm test                # 180 اختبار
npx jest --verbose      # تفاصيل أكتر
```

---

## الترخيص (License)

Proprietary — © 2026 SmartLangGuard.

[المشاكل والاقتراحات](https://github.com/ahmdelbaz28-ux/rewrite/issues) · [تواصل معنا](mailto:hello@smartlangguard.com)
<div align="center">

<img src="docs/assets/smartlangguard-logo.svg" alt="SmartLangGuard Logo" width="100" />

# SmartLangGuard

**English → Arabic keyboard layout fixer — instant, offline, private.**

`high hofhv;` → `اهلا اخبارك` in ~1ms.

[![npm version](https://img.shields.io/npm/v/@smartlangguard/cli.svg?style=flat-square&label=CLI&color=blue)](https://www.npmjs.com/package/@smartlangguard/cli)
[![Tests](https://img.shields.io/badge/Tests-180%20passing-brightgreen.svg?style=flat-square)](https://github.com/ahmdelbaz28-ux/rewrite/actions)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Win%20|%20macOS%20|%20Linux-lightgrey.svg?style=flat-square)](#-installation)

</div>

---

## Quick Start

```bash
npm install -g @smartlangguard/cli          # install (30 sec)
smartlangguard fix "high hofhv;"             # → اهلا اخبارك
```

---

## All Methods — Install, Run & Use

| # | Method | Where it works | Install (once) | Run | Use (every day) |
|:-:|--------|---------------|----------------|-----|-----------------|
| 1 | **Terminal** | Command Prompt, PowerShell, Bash | `npm install -g @smartlangguard/cli` | `smartlangguard fix "high"` | Type command → get fixed text instantly |
| 2 | **Clipboard Hotkey** ⭐ | **Any app** — Word, Chrome, WhatsApp, Telegram, VS Code, Slack | `npm install -g @smartlangguard/cli` | `smartlangguard daemon` (keep open) | Copy text → `Ctrl+Shift+Space` → Paste fixed |
| 3 | **Chat Mode** | Terminal (like talking to a bot) | `npm install -g @smartlangguard/cli` | `smartlangguard interactive` | Type text → get fix → repeat. Type `exit` to quit |
| 4 | **Pipe** | Scripts, AI tools, automation | `npm install -g @smartlangguard/cli` | `echo "high" \| smartlangguard fix` | Send text in → get fixed text out |
| 5 | **File** | Any text file (.txt, .md, etc.) | `npm install -g @smartlangguard/cli` | `smartlangguard fix -f file.txt -o fixed.txt` | One command fixes entire file |
| 6 | **VS Code** | VS Code editor | 1. `npm install -g @smartlangguard/cli`<br>2. Extensions → search "SmartLangGuard" → Install | — | Select text → `Ctrl+Shift+F1` or right-click → Fix Selection |
| 7 | **Browser** ⭐ | Chrome, Edge, Brave | See [Browser Extension](#-browser-extension) section | `smartlangguard daemon` (keep open) | Select text → right-click → Fix Selection, or `Ctrl+Shift+L` on any page |
| 8 | **AI Tools (MCP)** | Claude Desktop, Cursor, Cline | `npm install -g @smartlangguard/cli` + add config (see below) | — | AI fixes text automatically when you ask |
| 9 | **Node.js API** | Your own JavaScript code | `npm install @smartlangguard/core` | `require('@smartlangguard/core')` | `core.fixText('high')` → `{ corrected: 'اهلا' }` |
| 10 | **Binary** (no npm) | Any computer without Node.js | Download `.exe` / binary from [Releases](https://github.com/ahmdelbaz28-ux/rewrite/releases) | `./smartlangguard fix "high"` | Same as Terminal method |

> ⭐ **For non-coders:** Method 2 (Clipboard Hotkey) is the easiest — install once, then use `Ctrl+Shift+Space` in any app.

### MCP Config (for Method 8)

Add to your AI tool's config file:

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

---

---

## 🌐 Browser Extension

Fix keyboard layout mistakes on any webpage. Works with Chrome, Edge, and Brave.

### How it works

The browser extension talks to the daemon (background service) running on your computer.
All fixing happens **locally** — no data leaves your machine.

### Step-by-step installation

#### 1. Install the CLI (one time)

```bash
npm install -g @smartlangguard/cli
```

> If you don't have Node.js, download it from [nodejs.org](https://nodejs.org) first.

#### 2. Start the daemon

```bash
smartlangguard daemon
```

Keep this terminal window open. You should see:

```
+--------------------------------------------+
|  SmartLangGuard Daemon v0.1.3              |
+--------------------------------------------+
|  + Local API: http://localhost:41783       |
+--------------------------------------------+
```

#### 3. Load the extension in your browser

**Chrome:**
1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Navigate to the `packages/browser-extension` folder and select it
5. The SmartLangGuard icon appears in your toolbar ✓

**Edge:**
1. Open Edge and go to `edge://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `packages/browser-extension` folder

**Brave:**
1. Open Brave and go to `brave://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `packages/browser-extension` folder

> The extension folder is at `packages/browser-extension` inside the project.
> If you cloned the repo, run `git clone https://github.com/ahmdelbaz28-ux/rewrite.git`
> and use the folder from there.

### How to use it

| Action | How |
|--------|-----|
| Fix selected text | Select text on any page → Right-click → **SmartLangGuard: Fix Selection** |
| Quick shortcut | Select text → Press `Ctrl+Shift+L` |
| Fix clipboard | Press `Ctrl+Shift+K` to fix whatever is in your clipboard |
| Fix last word typed | Press `Ctrl+Shift+Backspace` (while typing in a text box) |
| Open popup | Click the SmartLangGuard icon in your browser toolbar |
| Open settings | Click the icon → click **Settings** |

### Popup features

- **Fix text**: Type or paste text into the popup and click **Fix**
- **Auto-fix on paste**: Turn on to automatically fix text when you paste
- **Real-time detection**: Get an alert when you type in the wrong keyboard layout
- **Alert sound**: Choose a sound that plays when a mistake is detected

### What if the icon shows "Daemon offline"?

1. Make sure `smartlangguard daemon` is running in a terminal
2. Click the extension icon → it should show "Daemon running"
3. If still offline, restart the daemon and refresh the page

---

## All Commands

| Command | What it does |
|---------|-------------|
| `fix "text"` | Fix text |
| `fix -f in.txt -o out.txt` | Fix file |
| `fix --format json "text"` | Fix with JSON result |
| `fix -d ar-to-en "اهلا"` | Force Arabic → English |
| `detect "text"` | Find mistakes (no fix) |
| `interactive` | Chat-like mode |
| `daemon` | Background hotkey + clipboard |
| `mcp` | MCP server for AI |
| `license activate <token>` | Activate license |
| `license status` | Check license |
| `config set <key> <val>` | Change settings |
| `update check` | Check for update |
| `sound play <name>` | Play alert sound |

---

## Features

| Feature | Free | Pro ($5/mo) |
|---------|:----:|:-----------:|
| Fix text | ✅ | ✅ |
| CLI + Daemon + Hotkey | ✅ | ✅ |
| VS Code Extension | ✅ | ✅ |
| Browser Extension | ✅ | ✅ |
| AI scoring | — | ✅ |
| Devices | 1 | 3 |

---

## Programmatic API

```js
const core = require('@smartlangguard/core');
await core.init({ telemetryEnabled: false });
const result = await core.fixText('high hofhv;');
console.log(result.corrected); // اهلا اخبارك
```

---

## Testing

```bash
npm test               # 180 tests
npx jest --verbose     # detailed
```

---

## License

Proprietary — © 2026 SmartLangGuard.

[Issues](https://github.com/ahmdelbaz28-ux/rewrite/issues) · [Email](mailto:hello@smartlangguard.com)
