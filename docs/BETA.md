# Beta Program — SmartLangGuard

## 🎯 Beta Goals

Validate the product with real users before public launch:
- Test the translation accuracy across diverse Arabic dialects and contexts
- Measure AI scoring value vs. rules-only
- Identify integration pain points with AI tools (Cursor, Claude, Cline)
- Collect feature requests for v1.0

---

## 👥 Beta Cohort

- **Size**: 20 users
- **Duration**: 14 days
- **Profiles**:
  - 10 developers (use Cursor/Claude/vscode heavily)
  - 5 content writers (Arabic blog/social media)
  - 3 polyglot users (English↔Arabic↔French)
  - 2 power users (terminal-heavy workflow)

---

## 📋 Beta Plan

### Week 1: Onboarding & Setup

- Day 1: Send invite email with license token + install instructions
- Day 2-3: Users install CLI, activate license, configure MCP in Cursor
- Day 4: First feedback survey (5 questions)
- Day 5-7: Free usage, daily auto-telemetry

### Week 2: Deep Usage & Feedback

- Day 8-10: Office hours (Slack/Discord) for support
- Day 11: Mid-beta survey (10 questions)
- Day 12-13: Feature request collection
- Day 14: Final survey + 1-on-1 interviews (30 min each, 5 users)

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Install success rate | ≥90% | Telemetry: `extension_activated` within 24h of invite |
| Daily active usage | ≥70% of cohort | Telemetry: unique daily `correction_applied` events |
| Fix accuracy (user-rated) | ≥85% satisfied | Survey question |
| MCP integration success | ≥80% | Survey: "Did MCP work in your AI tool?" |
| NPS | ≥40 | Final survey |
| Critical bugs | 0 | GitHub issues tagged `beta-critical` |

---

## 📝 Feedback Collection

### Auto-telemetry (passive)

- `extension_activated` — install success
- `correction_applied` — usage frequency
- `correction_rejected` (via "Undo" button in VS Code) — accuracy signal
- `error_occurred` — bug discovery

### Surveys (active)

**Survey 1 (Day 4): Setup experience**
1. How easy was installation? (1-5)
2. Did MCP integration work first try? (Y/N + details)
3. Any setup blockers?

**Survey 2 (Day 11): Usage**
1. How often do you use SmartLangGuard? (daily / few times / rarely)
2. Accuracy rating? (1-5)
3. Top 3 contexts you use it in? (terminal, AI tool, editor, browser, chat app)
4. What's missing?

**Survey 3 (Day 14): Final**
1. NPS (0-10)
2. Would you pay $5/mo for Pro? (Y/N + why)
3. Favorite feature?
4. Most annoying thing?
5. What would make you switch from your current solution?

### 1-on-1 Interviews

30-minute Zoom calls with 5 selected users. Topics:
- Walkthrough of their typical workflow
- Where SmartLangGuard fits (or doesn't)
- Pricing sensitivity
- Feature wishlist

---

## 🎁 Beta Perks

- Free Pro license for 90 days (post-beta)
- Lifetime 50% discount on Pro tier
- Early access to v1.0 features
- Name in `CONTRIBUTORS.md`

---

## 🚨 Known Limitations (Beta)

- **macOS hotkey**: requires manual Accessibility permission grant
- **Linux Wayland**: clipboard monitor may not work (use X11 mode)
- **AI scoring**: only English↔Arabic; other language pairs coming v1.0
- **Browser extension**: not in beta (Phase 3)
- **Mobile**: no mobile support planned for v1.0

---

## 📞 Support Channels

- **Slack**: `#smartlangguard-beta` (invite-only)
- **Email**: beta@smartlangguard.com (24h response)
- **Issues**: GitHub Issues with `beta` label
- **Office hours**: Tue/Thu 2-3pm GMT (Zoom link in Slack)

---

## 🔄 Beta → GA Transition

**End of beta (Day 14):**
1. Send thank-you email with perks
2. Schedule 1-on-1s with 5 users
3. Aggregate feedback into Beta Report (internal)
4. Prioritize v1.0 features based on feedback
5. Set GA launch date (target: 30 days post-beta)

**GA launch checklist:**
- [ ] Critical bugs fixed
- [ ] NPS ≥ 40
- [ ] Pricing page live
- [ ] Stripe integration tested end-to-end
- [ ] Documentation complete
- [ ] VS Code Marketplace listing approved
- [ ] Press kit ready
- [ ] Launch on Product Hunt

---

## 📈 Beta Tracking Dashboard

Live dashboard at `/v1/admin/dashboard` shows:
- Daily active users
- Fix accuracy (from `correction_rejected` rate)
- Top error events
- License activations over time

Access: `POST /v1/admin/login` with admin credentials → `GET /v1/admin/dashboard`
