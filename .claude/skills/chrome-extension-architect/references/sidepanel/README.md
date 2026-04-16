# Side Panel / Sidebar Reference

Complete guide to modern side panel architecture for Chrome MV3 and cross-browser equivalents.

## Chrome MV3: chrome.sidePanel API

### Core Architecture

**chrome.sidePanel** (Chrome 114+) is the modern replacement for sidebar experiments.

- Runs in extension context (not page context)
- Full chrome.\* API access
- Isolated from web page
- Persistent UI across navigation
- Can be bound to action icon

### Key Methods

#### Set panel behavior (icon-click open)

```typescript
// In service worker (background.js)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

This binds the side panel to the extension's toolbar icon. When clicked, the panel opens.

#### Set panel options (path, title, enabled)

```typescript
// Set per-tab
chrome.sidePanel.setOptions({
  tabId: tab.id,
  path: 'panel/index.html',
  title: 'My Panel',
  enabled: true,
});

// Set globally
chrome.sidePanel.setOptions({
  path: 'panel/index.html',
  title: 'My Panel',
  enabled: true,
});
```

#### Get layout (left/right placement)

```typescript
chrome.sidePanel.getLayout(({ panelPosition }) => {
  console.log('Panel position:', panelPosition); // 'left' or 'right'
});
```

Critical for RTL (right-to-left) languages and responsive adjustments.

#### Open panel programmatically

```typescript
// Only works for user-triggered contexts
chrome.sidePanel.open({ windowId: currentWindowId });
```

**Gotcha:** You cannot auto-open side panels without user gesture. Browser privacy restriction.

### Manifest Requirements

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

**Permissions:** `sidePanel` is required.

### Side Panel vs Popup Differences

| Aspect      | Side Panel                     | Popup                              |
| ----------- | ------------------------------ | ---------------------------------- |
| Lifetime    | Long-lived, persistent         | Transient, closes on click-outside |
| API Access  | Full chrome.\*                 | Full chrome.\*                     |
| DOM         | Runs in extension context      | Runs in extension context          |
| User Intent | Tool/companion surface         | Quick action surface               |
| Storage     | Can use chrome.storage.\*      | Can use chrome.storage.\*          |
| Messaging   | Can message to any context     | Can message to any context         |
| Best For    | Note-taking, dashboards, tools | Quick settings, one-time actions   |

## Firefox: sidebarAction API

Firefox uses `browser.sidebarAction` (different API, similar UX).

### Key Differences

- No programmatic open (user must manually open sidebar)
- Different manifest key: `sidebar_action`
- Event pages (not service workers) in many MV3 implementations
- Browser API prefix: `browser.*` not `chrome.*`

### Manifest

```json
{
  "manifest_version": 2, // or 3 with Firefox-specific adjustments
  "sidebar_action": {
    "default_panel": "panel/index.html",
    "default_title": "My Panel",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  }
}
```

### API Usage

```typescript
// Open panel (only works from extension UI, not programmatically)
browser.sidebarAction.open();

// Set title
browser.sidebarAction.setTitle({ title: 'My Panel', tabId: tab.id });

// Get panel state
browser.sidebarAction.isOpen({}, (isOpen) => {
  console.log('Is open:', isOpen);
});
```

## Safari

**Safari does NOT support side panels in the same way.**

- No chrome.sidePanel or equivalent API
- Alternative approaches:
  - Action popup (small, transient)
  - Options page (separate tab)
  - Injected overlay in page (content script UI)
  - Separate Safari extension packaging with Apple-specific APIs

Recommendation: For Safari, design around popup + options page or consider native Safari app approach.

## Cross-Browser Feature Detection

```typescript
const hasSidePanel = typeof chrome?.sidePanel !== 'undefined';
const hasSidebarAction = typeof browser?.sidebarAction !== 'undefined';

if (hasSidePanel) {
  // Chrome/Edge implementation
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} else if (hasSidebarAction) {
  // Firefox implementation
  // Note: Firefox sidebar opens manually; just configure it
  browser.sidebarAction.setTitle({ title: 'My Panel' });
} else {
  // Safari fallback
  console.warn('Side panel not supported; using popup instead');
}
```

## Best Practices

### 1. Bind to action icon

Always set `openPanelOnActionClick: true` in your service worker initialization.

```typescript
// background.js - top-level, synchronous
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### 2. Use per-tab panel paths when needed

Different content per tab or site:

```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const panelPath = tab.url.startsWith('https://example.com')
      ? 'panel/site-specific.html'
      : 'panel/default.html';
    chrome.sidePanel.setOptions({ tabId, path: panelPath });
  }
});
```

### 3. Handle panel close events

```typescript
chrome.sidePanel.onClosed.addListener(() => {
  // Clean up resources if needed
  // Note: Panel DOM remains but scripts may be suspended
});
```

### 4. Layout awareness

```typescript
chrome.sidePanel.getLayout(({ panelPosition }) => {
  if (panelPosition === 'left') {
    // Adjust UI for left sidebar
  } else {
    // Adjust UI for right sidebar
  }
});
```

### 5. Message passing between panel and SW

Panel -> SW:

```typescript
// panel.js
chrome.runtime.sendMessage({ type: 'GET_DATA' }, (response) => {
  console.log('Response:', response);
});
```

SW -> Panel:

```typescript
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    sendResponse({ data: 'example' });
    return true; // Keep message channel open for async
  }
});
```

## Gotchas & Common Pitfalls

1. **Panel opens but no content**: Check `default_path` in manifest and file paths in `setOptions()`.

2. **Panel script crashes**: Panel runs in extension context; use DevTools for panel (right-click > Inspect).

3. **Panel not opening on icon click**: Ensure `setPanelBehavior` is called in service worker **top-level, synchronously**.

4. **Firefox sidebar won't open**: Firefox doesn't allow programmatic open; user must manually toggle sidebar.

5. **Panel state lost on navigation**: Panel persists across navigation, but panel script context may reload. Use storage for state.

6. **RTL issues**: Use `getLayout()` to detect left/right and adjust UI accordingly.

7. **Popup and panel both show**: If both action popup and side panel are configured, the popup takes precedence on icon click. Either remove popup or handle explicitly.

## Example: Complete Side Panel Setup

```typescript
// manifest.json
{
  "manifest_version": 3,
  "name": "Side Panel Example",
  "version": "1.0.0",
  "permissions": ["sidePanel", "storage"],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Open Side Panel"
  }
}
```

```typescript
// background.js
// Top-level, synchronous
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
```

```html
<!-- panel/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Side Panel</title>
    <style>
      body {
        padding: 16px;
        font-family: system-ui;
      }
      button {
        padding: 8px 16px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <h1>Side Panel</h1>
    <button id="saveBtn">Save Note</button>
    <textarea
      id="noteInput"
      rows="10"
      style="width:100%; margin-top:8px;"
    ></textarea>
    <script src="panel.js"></script>
  </body>
</html>
```

```typescript
// panel.js
const saveBtn = document.getElementById('saveBtn');
const noteInput = document.getElementById('noteInput');

// Load saved note
chrome.storage.local.get(['note'], (result) => {
  if (result.note) {
    noteInput.value = result.note;
  }
});

// Save note
saveBtn.addEventListener('click', () => {
  chrome.storage.local.set({ note: noteInput.value }, () => {
    console.log('Note saved');
  });
});
```

## Privacy Considerations

- Side panel runs in extension context, but **cannot access web page content** directly.
- If you need page content, use content scripts + messaging.
- Avoid requesting broad host permissions just for side panel functionality.
- If storing user data (notes, settings), use `chrome.storage.local` and consider encryption for sensitive data.

## Resources

- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Firefox sidebarAction API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction)
