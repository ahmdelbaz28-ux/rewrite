# 🚀 SMARTLANGGUARD – COMPLETE PROJECT DOCUMENTATION

---

# 1️⃣ PROJECT OVERVIEW

## 🎯 الفكرة

SmartLangGuard هو نظام SaaS يقوم بتصحيح النص المكتوب بلغة خاطئة نتيجة تغيير تخطيط لوحة المفاتيح (Arabic/English Keyboard Layout Mismatch).

مثال:

```
hglg hg;fhv
```

يتم تحويلها إلى:

```
اهلا اخبارك
```

---

# 2️⃣ PRODUCT VERSIONS

✅ VS Code Extension (Beta أولاً)
✅ CLI Tool (Advanced Users)
✅ Browser Extension (لاحقاً)
✅ SaaS Backend
✅ Admin Dashboard
✅ Auto Update System
✅ Binary Protected CLI

---

# 3️⃣ ARCHITECTURE

```
User (VS Code)
        ↓
Extension
        ↓
License Validation (SaaS Backend)
        ↓
Telemetry
        ↓
Database
```

---

# 4️⃣ CORE TRANSLATION ENGINE

## translator.ts

```ts
export function convertToArabic(text: string): string {
  const map: Record<string,string> = {
    q:"ض", w:"ص", e:"ث", r:"ق", t:"ف",
    y:"غ", u:"ع", i:"ه", o:"خ", p:"ح",
    a:"ش", s:"س", d:"ي", f:"ب", g:"ل",
    h:"ا", j:"ت", k:"ن", l:"م",
    z:"ئ", x:"ء", c:"ؤ", v:"ر",
    b:"لا", n:"ى", m:"ة"
  };

  return text.split("")
    .map(c => map[c.toLowerCase()] || c)
    .join("");
}
```

---

# 5️⃣ VS CODE EXTENSION

## package.json

```json
{
  "name": "smartlangguard",
  "displayName": "SmartLangGuard Beta",
  "version": "0.0.1",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onCommand:smartlangguard.fixSelection"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "smartlangguard.fixSelection",
        "title": "SmartLangGuard: Fix Arabic Keyboard"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "smartlangguard.fixSelection",
          "when": "editorHasSelection"
        }
      ]
    },
    "configuration": {
      "properties": {
        "smartlangguard.token": {
          "type": "string",
          "default": ""
        }
      }
    }
  }
}
```

---

## extension.ts

```ts
import * as vscode from "vscode";
import { convertToArabic } from "./translator";

export function activate(context: vscode.ExtensionContext) {

  const cmd = vscode.commands.registerCommand(
    "smartlangguard.fixSelection",
    async () => {

      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) return;

      const config = vscode.workspace.getConfiguration("smartlangguard");
      const token = config.get<string>("token");

      const res = await fetch("http://localhost:4000/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      const data = await res.json();
      if (!data.valid) {
        vscode.window.showErrorMessage("Invalid Token");
        return;
      }

      const corrected = convertToArabic(text);

      editor.edit(editBuilder => {
        editBuilder.replace(selection, corrected);
      });

      vscode.window.showInformationMessage("✅ Corrected!");
    }
  );

  context.subscriptions.push(cmd);
}
```

---

# 6️⃣ SAAS BACKEND

## server.js

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const BETA_TOKEN = process.env.BETA_TOKEN || "beta-12345";

app.post("/validate", (req, res) => {
  const { token } = req.body;
  res.json({ valid: token === BETA_TOKEN });
});

app.post("/telemetry", (req, res) => {
  console.log("Telemetry:", req.body);
  res.json({ success: true });
});

app.listen(4000, () =>
  console.log("Backend running on http://localhost:4000")
);
```

---

# 7️⃣ CLI VERSION

## index.js

```js
#!/usr/bin/env node
import readline from "readline";
import { convertToArabic } from "./translator.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Enter text: ", (input) => {
  console.log("Suggestion:", convertToArabic(input));
  rl.close();
});
```

---

# 8️⃣ BINARY PROTECTION

### Use pkg

```
npm install -g pkg
pkg .
```

---

# 9️⃣ AUTO UPDATE SYSTEM

## updater.js

```js
import axios from "axios";
import fs from "fs";
import crypto from "crypto";

async function checkUpdate() {
  const res = await axios.get("https://yourdomain.com/latest.json");
  const { version, url, sha256 } = res.data;

  if (version !== CURRENT_VERSION) {
    // download + verify hash
  }
}
```

---

# 🔟 TELEMETRY EVENTS

- extension_activated
- correction_applied
- correction_rejected
- error_occurred

---

# 1️⃣1️⃣ SECURITY LAYER

✅ JWT validation
✅ Device fingerprint
✅ Encrypted local token
✅ Binary watermark
✅ Signed update

---

# 1️⃣2️⃣ BETA PLAN

- 20 users
- 14 days
- Collect telemetry
- Google Form feedback

---

# 1️⃣3️⃣ HOW TO RUN

## Backend

```
npm install
npm start
```

## Extension

```
npm install
npm run compile
F5
```

---

# 1️⃣4️⃣ FUTURE ROADMAP

- Hybrid AI detection
- English dictionary scoring
- Admin Dashboard
- Stripe integration
- Enterprise licensing

---

# ✅ END OF MASTER FILE
