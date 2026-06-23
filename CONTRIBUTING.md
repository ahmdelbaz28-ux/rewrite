# **Contributing to SmartLangGuard**

> **🌟 We welcome contributions from everyone!**

Thank you for considering contributing to **SmartLangGuard**! Whether it's **bug reports, feature requests, code contributions, or documentation improvements**, we appreciate your help in making SmartLangGuard the best keyboard layout correction tool.

---

## **📌 Code of Conduct**

By participating in this project, you agree to abide by our **[Code of Conduct](CODE_OF_CONDUCT.md)**. Please read it to understand the expected behavior in our community.

---

## **🤝 How to Contribute**

### **🐛 Reporting Bugs**

If you find a bug, please **open an issue** on GitHub:
1. **Search existing issues** to avoid duplicates.
2. **Include a clear title** describing the issue.
3. **Provide detailed steps** to reproduce the bug.
4. **Add screenshots or logs** if applicable.
5. **Specify your environment** (OS, Node.js version, etc.).

**Example Bug Report:**
```markdown
## Bug: `smartlangguard fix` crashes with special characters

### Steps to Reproduce:
1. Run `smartlangguard fix "test@test.com"`
2. Observe crash with error: `TypeError: Cannot read property 'length' of undefined`

### Expected Behavior:
Should return corrected text without crashing.

### Environment:
- OS: Windows 11
- Node.js: v18.16.0
- SmartLangGuard: v0.1.0
```

---

### **💡 Suggesting Features**

We love new ideas! To suggest a feature:
1. **Open a GitHub Issue** with the `[Feature Request]` label.
2. **Describe the use case** and why it would be useful.
3. **Provide examples** of how it should work.

**Example Feature Request:**
```markdown
## Feature Request: Auto-fix in Slack

### Description:
Add a Slack bot that auto-fixes mistyped messages in channels.

### Use Case:
Many users type in the wrong keyboard layout in Slack, leading to confusing messages.

### Proposed Solution:
- A Slack app that monitors messages.
- Detects mistyped text and suggests corrections.
- Optional: Auto-correct with user confirmation.
```

---

### **🔧 Contributing Code**

#### **1. Fork the Repository**
```bash
git clone https://github.com/ahmdelbaz28-ux/rewrite.git
cd rewrite
```

#### **2. Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

#### **3. Install Dependencies**
```bash
npm install
```

#### **4. Make Your Changes**
- Follow the **coding style** (see [Style Guide](#-style-guide)).
- Add **tests** for new features (see [Testing](#-testing)).
- Update **documentation** if needed.

#### **5. Commit Your Changes**
```bash
git commit -m "feat: add your feature"
```
- Use **[Conventional Commits](https://www.conventionalcommits.org/)** for commit messages.

**Commit Types:**
| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add Slack integration` |
| `fix` | Bug fix | `fix: handle special characters in CLI` |
| `docs` | Documentation | `docs: update README installation guide` |
| `refactor` | Code refactor | `refactor: improve db.js performance` |
| `test` | Tests | `test: add unit tests for core engine` |
| `chore` | Maintenance | `chore: update dependencies` |

#### **6. Push to Your Fork**
```bash
git push origin feature/your-feature-name
```

#### **7. Open a Pull Request**
- Go to **[SmartLangGuard Pull Requests](https://github.com/ahmdelbaz28-ux/rewrite/pulls)**.
- Click **"New Pull Request"** and select your branch.
- Fill in the **PR template** (see below).

---

### **📝 Pull Request Template**

```markdown
## 📌 Description

[Briefly describe the changes and their purpose.]

## 🔗 Related Issue

[Link to the issue this PR addresses, if any.]

## ✅ Changes Made

- [ ] Added new feature
- [ ] Fixed bug
- [ ] Improved performance
- [ ] Updated documentation
- [ ] Added tests

## 🧪 Testing

[Describe how you tested your changes.]

## 📸 Screenshots (if applicable)

[Add screenshots or GIFs showing the changes.]

## 🔍 Checklist

- [ ] My code follows the project's style guide.
- [ ] I have added tests for new features.
- [ ] All existing tests pass.
- [ ] I have updated documentation if needed.
- [ ] My commits follow Conventional Commits.
```

---

## **🎯 Style Guide**

### **📁 General Rules**
- Use **ES6+** JavaScript/TypeScript.
- Follow **[Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)**.
- Use **2-space indentation** (no tabs).
- **No semicolons** (unless required).
- **Single quotes** for strings (`'hello'`).
- **Double quotes** for JSON (`{"key": "value"}`).

### **📝 Naming Conventions**
| Type | Convention | Example |
|------|------------|---------|
| Variables | `camelCase` | `const userName = 'Ahmed';` |
| Functions | `camelCase` | `function fixText(text) {}` |
| Classes | `PascalCase` | `class Translator {}` |
| Constants | `UPPER_SNAKE_CASE` | `const MAX_RETRIES = 3;` |
| Files | `kebab-case` | `engine.js`, `fix-text.js` |
| Folders | `kebab-case` | `src/`, `utils/` |

### **📂 File Structure**
```
packages/
├── core/
│   ├── src/
│   │   ├── index.js          # Main exports
│   │   ├── engine.js         # Translation engine
│   │   ├── license.js        # License validation
│   │   └── telemetry.js      # Telemetry
│   └── tests/
│       ├── engine.test.js    # Unit tests
│       └── license.test.js   # License tests
```

### **📄 Code Examples**

#### **✅ Good**
```javascript
// Function with JSDoc
/**
 * Fixes mistyped text from wrong keyboard layout.
 * @param {string} text - The text to fix.
 * @returns {string} The corrected text.
 */
function fixText(text) {
  if (!text) return ''
  return translate(text)
}
```

#### **❌ Bad**
```javascript
// No JSDoc, inconsistent quotes
function FixText(text) {
  if(text == null) return "";
  return Translate(text);
}
```

---

## **🧪 Testing**

### **📌 Test Framework**
- We use **[Jest](https://jestjs.io/)** for testing.
- Tests are located in the `tests/` directory of each package.

### **📝 Writing Tests**
- **Unit Tests:** Test individual functions.
- **Integration Tests:** Test interactions between modules.
- **E2E Tests:** Test full application flows.

**Example Test:**
```javascript
// packages/core/tests/engine.test.js
const { fixText } = require('../src/engine')

describe('fixText', () => {
  it('should fix QWERTY to Arabic', () => {
    expect(fixText('high hofhv;')).toBe('اهلا اخبارك')
  })

  it('should handle empty input', () => {
    expect(fixText('')).toBe('')
  })
})
```

### **🏃 Running Tests**
```bash
# Run all tests
npm test

# Run tests for a specific package
npm test --workspace @smartlangguard/core

# Run with coverage
npm test -- --coverage
```

---

## **📚 Documentation**

### **📌 Updating Docs**
- **README.md** — Main project documentation.
- **docs/** — Detailed guides and API references.
- **JSDoc** — Inline code documentation.

### **📝 JSDoc Example**
```javascript
/**
 * Validates a license token.
 * @param {string} token - The license token to validate.
 * @returns {Promise<Object>} License info if valid, null otherwise.
 * @throws {Error} If the token is malformed.
 */
async function validateLicense(token) {
  // ...
}
```

---

## **🔒 Security**

### **📌 Reporting Vulnerabilities**
If you discover a **security vulnerability**, **do not open a public issue**. Instead, email **[security@smartlangguard.com](mailto:security@smartlangguard.com)** with details.

### **🔐 Security Best Practices**
- **Never commit secrets** (API keys, passwords, tokens).
- Use **environment variables** for sensitive data.
- **Validate all inputs** to prevent injection attacks.
- **Sanitize outputs** to prevent XSS.

---

## **🎁 Recognizing Contributions**

We appreciate all contributions! Contributors will be recognized in:
- **The [CONTRIBUTORS.md](CONTRIBUTORS.md)** file.
- **Release notes** for major contributions.
- **Social media shoutouts** (with permission).

---

## **🤔 Need Help?**

- **💬 Join our [Discord](https://discord.gg/smartlangguard)** (Coming Soon).
- **📧 Email us at [hello@smartlangguard.com](mailto:hello@smartlangguard.com)**.
- **🐛 Open a [GitHub Issue](https://github.com/ahmdelbaz28-ux/rewrite/issues)**.

---

**🌟 Thank you for contributing to SmartLangGuard!**

**Together, we can make keyboard layout mistakes a thing of the past.** 🚀
