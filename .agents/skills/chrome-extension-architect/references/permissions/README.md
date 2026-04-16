# Permissions & Privacy Reference

Complete guide to Manifest V3 permissions with privacy-first defaults and least-privilege principles.

## Core Principle: Least Privilege

**Request only the permissions you absolutely need.** Every permission is a privacy implication and a potential rejection reason from the Web Store.

## Permission Categories

### 1. Permissions (chrome.\* API access)

Required to access specific extension APIs.

| Permission              | Privacy Risk | When to Use                                                 | Alternatives                                 |
| ----------------------- | ------------ | ----------------------------------------------------------- | -------------------------------------------- |
| `activeTab`             | Low          | One-time access to current tab                              | None (best choice)                           |
| `tabs`                  | High         | Need to query all tabs, access tab metadata across all tabs | Use `activeTab` if possible                  |
| `storage`               | Low          | Store data                                                  | None (necessary for state)                   |
| `sidePanel`             | Low          | Use side panel API                                          | None (if using side panel)                   |
| `scripting`             | Medium       | Inject scripts/styles programmatically                      | Use `<all_urls>` + content_scripts (worse)   |
| `declarativeNetRequest` | Low          | Modify network requests                                     | Use `webRequest` (deprecated, higher risk)   |
| `background`            | Low          | Service worker                                              | Required for SW                              |
| `alarms`                | None         | Schedule tasks                                              | None (if needed)                             |
| `cookies`               | High         | Read/write cookies                                          | Avoid unless absolutely necessary            |
| `webRequest`            | High         | Intercept network requests                                  | Use `declarativeNetRequest` (privacy better) |
| `offscreen`             | None         | Offscreen documents                                         | None (if needed)                             |

### 2. Host Permissions

Required to access web pages (content scripts, fetch, etc.).

| Permission       | Privacy Risk | When to Use                              | Alternatives                              |
| ---------------- | ------------ | ---------------------------------------- | ----------------------------------------- |
| `activeTab`      | Low          | Temporary access to current tab          | Best for user-triggered actions           |
| Specific domains | Low          | Need persistent access to specific sites | Use narrow patterns                       |
| `<all_urls>`     | **Critical** | Need access to ALL websites              | Avoid! Use `activeTab` or narrow patterns |
| `*://*/*`        | **Critical** | Same as above                            | Avoid!                                    |

### 3. Optional Permissions

Permissions requested at runtime, not install-time.

Use for features that users don't always need. Example: "Download all images" button that only needs access when clicked.

```typescript
chrome.permissions.request(
  {
    permissions: ['tabs'],
    origins: ['<all_urls>'],
  },
  (granted) => {
    if (granted) {
      // Feature enabled
    } else {
      // Feature unavailable
    }
  }
);
```

## Permission Decision Tree

```
Need to interact with a website?
├─ User clicks button to act on current page
│  └─ Use activeTab (temporary, no host_permissions)
├─ Need to act on specific known domains
│  └─ Use narrow host_permissions: ["https://example.com/*"]
└─ Need to act on ANY website
   └─ Use scripting API + activeTab (inject on demand)
      ❌ AVOID: <all_urls>

Need to read tab metadata (title, URL) across tabs?
└─ Use tabs permission (high risk!)
   ⚠️ Justify: Why do you need to enumerate all tabs?
   Alternative: activeTab for current tab only

Need to modify network requests?
└─ Use declarativeNetRequest
   ❌ AVOID: webRequest (deprecated, higher risk)
```

## Manifest Examples

### Minimal: Side Panel Note-Taker

Privacy-first note-taking extension (no page access needed).

```json
{
  "manifest_version": 3,
  "name": "Privacy-First Notes",
  "version": "1.0.0",
  "permissions": ["sidePanel", "storage"],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

**Privacy implications:**

- `sidePanel`: None (UI only)
- `storage`: Local only, no network access
- **No host permissions**: Cannot read any page content

### Medium: On-Page Highlighter

Highlights text on current page when user clicks button.

```json
{
  "manifest_version": 3,
  "name": "Page Highlighter",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage", "scripting"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Highlight Selection"
  }
}
```

**Privacy implications:**

- `activeTab`: Temporary access to current tab only (user-initiated)
- `scripting`: Injects highlighting script on demand
- `storage`: Saves highlights locally
- **No persistent host permissions**: Only access when user acts

### High-Risk (Avoid): Broad Tab Reader

Reads all tabs continuously for analytics.

```json
{
  "manifest_version": 3,
  "name": "Tab Analytics (High Risk)",
  "version": "1.0.0",
  "permissions": ["tabs", "storage"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

**Privacy implications:**

- `tabs`: Can read title, URL, status of ALL tabs at any time
- This enables browsing history tracking
- **Rejection risk**: Very high from Web Store
- **Justify needed**: Must have explicit user consent and clear benefit

### Worst-Practice: All URLs

❌ **NEVER DO THIS** without overwhelming justification.

```json
{
  "manifest_version": 3,
  "name": "Bad Example",
  "version": "1.0.0",
  "permissions": ["tabs"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

**Privacy implications:**

- `<all_urls>`: Can read/modify ANY page content
- `tabs`: Can enumerate all tabs
- Enables full browsing surveillance capability
- **Rejection risk**: Near-certain from Web Store
- **Justify needed**: Extremely rare cases (e.g., ad blockers with user consent)

## Best Practices

### 1. Prefer activeTab over broad permissions

```typescript
// BAD: Request <all_urls>
"permissions": ["scripting"],
"host_permissions": ["<all_urls>"]

// GOOD: Use activeTab
"permissions": ["activeTab", "scripting"]

// When user clicks button, inject script:
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content.js']
});
```

### 2. Use scripting API instead of content_scripts manifest

```typescript
// BAD: Auto-injects on every page load
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content.js"]
}]

// GOOD: Inject on demand
"permissions": ["activeTab", "scripting"]

// In action click handler:
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
```

### 3. Narrow host permissions

```typescript
// BAD: Too broad
"host_permissions": ["https://*.example.com/*"]

// GOOD: Specific path
"host_permissions": ["https://example.com/api/*"]

// BETTER: Multiple specific paths
"host_permissions": [
  "https://example.com/api/v1/*",
  "https://example.com/api/v2/*"
]
```

### 4. Request optional permissions for advanced features

```typescript
// Core functionality works without tabs permission
chrome.runtime.onInstalled.addListener(() => {
  // Check if optional permission already granted
  chrome.permissions.contains({ permissions: ['tabs'] }, (hasTabs) => {
    if (!hasTabs) {
      // Prompt user when they click advanced feature
      chrome.action.onClicked.addListener((tab) => {
        chrome.permissions.request(
          {
            permissions: ['tabs'],
          },
          (granted) => {
            if (granted) {
              // Enable advanced feature
            }
          }
        );
      });
    }
  });
});
```

## Permission Auditing Checklist

Before submitting to Web Store, review:

- [ ] Every permission in manifest is justified
- [ ] No `<all_urls>` or `*://*/*` unless absolutely necessary
- [ ] No `tabs` permission if `activeTab` suffices
- [ ] No `webRequest` (use `declarativeNetRequest`)
- [ ] Host permissions are as narrow as possible
- [ ] Optional permissions used for non-core features
- [ ] Privacy policy explains what data is accessed and why
- [ ] UI clearly shows when extension is active on a page
- [ ] User can disable features that require elevated permissions

## Privacy Warnings to Include

For high-impact permissions, warn in your documentation:

### tabs Permission

> **Privacy Notice:** This extension can see the title and URL of all open tabs. This is necessary for [specific feature]. We do not access page content unless you explicitly interact with the page. All data is stored locally on your device.

### <all_urls> Host Permissions

> **Privacy Notice:** This extension has access to all websites. This is necessary for [specific feature]. We only access page content when you [user action]. All data is processed locally and is not transmitted to external servers.

### scripting Permission

> **Privacy Notice:** This extension can inject scripts into web pages. This is used to [specific feature]. Scripts are only injected when you explicitly request an action.

## Common Permission Mistakes

1. **Requesting both `activeTab` and `tabs`**: Use one or the other.
2. **Requesting `<all_urls>` for a single-site feature**: Use narrow pattern.
3. **Requesting `webRequest` for simple blocking**: Use `declarativeNetRequest`.
4. **Auto-injecting content scripts everywhere**: Use `scripting` API + user action.
5. **Requesting permissions "just in case"**: Remove unused permissions before submission.

## Resources

- [Chrome Permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Web Store Review Guidelines](https://developer.chrome.com/docs/webstore/review-process/)
- [MV3 Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [activeTab vs tabs](https://developer.chrome.com/docs/extensions/mv3/manifest/activeTab/)
