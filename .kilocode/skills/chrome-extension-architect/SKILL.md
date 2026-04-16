---
name: chrome-extension-architect
description: Privacy-first Chrome Manifest Version 3 extension architect - sidePanel design, MV3 service worker lifecycle, least-privilege permission audits, storage strategy, and cross-browser sidebar patterns.
references:
  - sidepanel
  - permissions
  - service-worker-lifecycle
  - storage-state
  - cross-browser
  - debugging
  - templates
---

# Chrome Extension Manifest Version 3 Privacy-First Architect

Elite-level Chrome extension architecture and debugging workflow with **privacy-first defaults** and **least-privilege permissions**.

## Overview / When to Apply

Use this skill when the user asks about **browser extensions** (especially **Chrome MV3**) including:

- Side panel / sidebar UX (Chrome `chrome.sidePanel`, Firefox `sidebar_action`, Safari constraints)
- MV3 background **service worker lifecycle** bugs (lost globals, listeners, wakeups)
- Permission review, host permission minimization, privacy posture
- Storage / persistence choices (what survives popup close, SW termination, browser restart)
- Cross-browser strategy (Chrome/Edge vs Firefox vs Safari)

Default target: **Chrome MV3**. If the user doesn’t specify browser(s), assume **Chrome stable**.

## Non-Negotiable Rules (must follow)

1. **Start every major answer with target + scope.**
   - Format: `Target: <Chrome MV3 | Firefox MV3 | Safari> | Scope: <side panel | permissions | lifecycle | storage | compat | debugging>`

2. **Privacy-first default.**
   - Prefer designs that keep data on-device.
   - Avoid collecting page content, browsing history, or host-wide access unless explicitly required.

3. **Least privilege, always.**
   - Request only the minimal `permissions` + minimal `host_permissions`.
   - Prefer: `activeTab`, `scripting` (targeted injection), `declarativeNetRequest` (when network rules are needed).
   - Avoid: `<all_urls>`, `*://*/*`, broad `tabs`, unbounded host permissions.

4. **Every permission/API must be justified + privacy-risk tagged.**
   - For each permission you mention, include:
     - Why it’s needed
     - What data access it enables
     - Safer alternatives (if any)

5. **MV3 service worker reality check (single biggest bug source).**
   - Service worker is **non-persistent**; globals can disappear at any time.
   - Never rely on in-memory state for correctness.
   - Register listeners at top-level synchronously.

6. **Side panel architecture must be modern.**
   - Chrome: `chrome.sidePanel` + `setPanelBehavior({ openPanelOnActionClick: true })`.
   - Use `setOptions()` to vary panel path per-tab / conditionally.
   - Use layout awareness for LTR/RTL.

7. **Cross-browser: feature-detect, don’t UA-sniff.**
   - Use conditional code paths (Chrome `chrome.sidePanel` vs Firefox `browser.sidebarAction`).
   - State what won’t work on a given browser and why.

## How to Use This Skill (workflow)

### Step 0 — Confirm target environment

Ask (or infer) these quickly:

- Browser(s): Chrome / Edge / Firefox / Safari
- Manifest version: default to MV3
- UI mode: side panel, action popup, overlay in-page, options page
- Data sensitivity: what data is touched? (page content? URLs? credentials?)

### Step 1 — Pick the correct architecture (decision tree)

```
Need a persistent/reusable UI?
├─ Chrome/Edge -> sidepanel (chrome.sidePanel)
├─ Firefox -> sidebar_action / browser.sidebarAction
└─ Safari -> expect limitations; consider alternative UI (popup/options) or separate Safari strategy

Need to interact with the current tab?
├─ One-off user action -> activeTab + scripting
└─ Always-on per-site -> narrow host_permissions only for required domains

Need DOM / rendering in background?
└─ Use offscreen document (Chrome) or move work into panel/page context
```

Then read the matching references:

- Side panel design/API -> `references/sidepanel/README.md`
- Permission review -> `references/permissions/README.md`
- SW lifecycle -> `references/service-worker-lifecycle/README.md`
- Storage strategy -> `references/storage-state/README.md`
- Cross-browser -> `references/cross-browser/README.md`
- Debugging playbook -> `references/debugging/README.md`
- Copy/paste templates -> `references/templates/README.md`

### Step 2 — Produce an answer in a strict structure

Use this response skeleton for most user questions:

1. **Target + assumptions** (1–3 lines)
2. **Recommended architecture** (what runs where)
3. **Permissions proposal** (minimal set) + privacy warnings
4. **State & persistence plan** (storage choice) + lifecycle gotchas
5. **Code snippets** (manifest + SW + UI + messaging)
6. **Debug checklist** (what to check when it breaks)

## Examples (input → expected output)

### Example 1: “I want a persistent sidebar note-taker”

**Input**: “Build a MV3 extension with a sidebar that saves notes per tab. Minimal permissions.”

**Expected output (high level)**:

- Target: Chrome MV3
- Recommend `chrome.sidePanel` with panel path + per-tab context
- Permissions: `sidePanel`, `storage`, optional `activeTab` if reading title/url on demand
- Storage: `chrome.storage.local` keyed by `tabId` (ephemeral) + `url` (stable) with explicit privacy warning about storing URLs
- Provide manifest + SW `setPanelBehavior` + message passing between panel and SW

### Example 2: “Why does my background state reset?”

**Input**: “My service worker forgets auth after a minute. I store it in a global variable.”

**Expected output (high level)**:

- Target: Chrome MV3
- Explain SW termination; globals lost
- Move auth to `chrome.storage.local` (or `session` for ephemeral) with encryption guidance
- Add reconnect logic; register listeners top-level
- Provide code for a storage-backed session and messaging

### Example 3: “Make it work in Firefox too”

**Input**: “I use sidePanel in Chrome. How do I support Firefox?”

**Expected output (high level)**:

- Target: Chrome MV3 + Firefox
- Explain Firefox `sidebar_action` differences (no programmatic open; UX expectations)
- Provide feature-detection wrapper and separate manifest keys
- Recommend `webextension-polyfill` for promise-based APIs where appropriate

## Best Practices / Pitfalls

- **Don’t request `tabs` unless you truly need cross-tab enumeration.** It’s a high-privacy-impact permission.
- **Don’t store full URLs/content unless necessary.** If you must, be explicit about retention and user controls.
- **Don’t rely on “keep-alive hacks”.** Use real MV3 primitives (`alarms`, message triggers, offscreen documents).
- **Side panel ≠ popup.** Side panel is long-lived UI; treat it as an app surface with explicit user action flows.

## Resources

Install helpers are in `resources/install.sh`.
