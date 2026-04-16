# Cross-Browser Compatibility Reference

Complete guide to building Chrome MV3 extensions that work across Chrome/Edge, Firefox, and Safari.

## Browser Differences Summary

| Feature               | Chrome/Edge                    | Firefox                     | Safari                  |
| --------------------- | ------------------------------ | --------------------------- | ----------------------- |
| Manifest Version      | MV3 only (new)                 | MV2/MV3 hybrid              | MV2/MV3 hybrid          |
| Background Script     | Service Worker                 | Event Page / Service Worker | Background Page         |
| Side Panel            | `chrome.sidePanel`             | `browser.sidebarAction`     | **Not supported**       |
| Action Icon           | `chrome.action`                | `browser.browserAction`     | `browser.browserAction` |
| Storage API           | `chrome.storage.*`             | `browser.storage.*`         | `browser.storage.*`     |
| Messaging             | `chrome.runtime.*`             | `browser.runtime.*`         | `browser.runtime.*`     |
| Offscreen Documents   | `chrome.offscreen`             | **Not supported**           | **Not supported**       |
| DeclarativeNetRequest | `chrome.declarativeNetRequest` | **Not supported**           | **Not supported**       |
| Alarms API            | `chrome.alarms`                | `browser.alarms`            | `browser.alarms`        |

## Cross-Browser Strategy

### 1. Feature Detection (Never UA-Sniffing)

Use feature detection to determine browser capabilities.

```typescript
const hasSidePanel = typeof chrome?.sidePanel !== 'undefined';
const hasSidebarAction = typeof browser?.sidebarAction !== 'undefined';
const hasOffscreen = typeof chrome?.offscreen !== 'undefined';
const hasDNR = typeof chrome?.declarativeNetRequest !== 'undefined';

if (hasSidePanel) {
  // Chrome/Edge side panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} else if (hasSidebarAction) {
  // Firefox sidebar
  // Note: Firefox doesn't support programmatic open
  console.log('Using Firefox sidebarAction');
} else {
  // Safari or older browsers
  console.warn('Side panel not supported; using popup');
}
```

### 2. Use webextension-polyfill

Standardizes APIs across browsers with promise-based interfaces.

```bash
pnpm add webextension-polyfill
```

```typescript
import browser from 'webextension-polyfill';

// Works consistently across browsers
browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  console.log('Active tab:', tabs[0]);
});

// Instead of:
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log('Active tab:', tabs[0]);
});
```

### 3. Separate Manifest Keys

Use different manifest keys for each browser's unique features.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",

  // Chrome/Edge
  "permissions": ["sidePanel", "storage"],
  "side_panel": {
    "default_path": "panel/index.html"
  },

  // Firefox (if using MV2)
  "browser_action": {
    "default_popup": "popup.html",
    "default_title": "Open Extension"
  },

  // Firefox sidebar (MV2)
  "sidebar_action": {
    "default_panel": "panel/index.html",
    "default_title": "My Extension",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  }
}
```

**Note:** Firefox MV3 support for side panels is evolving. Check latest Firefox docs.

## Chrome/Edge (MV3)

### Key Features

- Service Worker background scripts
- `chrome.sidePanel` API
- `chrome.action` unified icon
- `chrome.declarativeNetRequest`
- `chrome.offscreen` API

### Manifest

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "permissions": ["sidePanel", "storage", "alarms"],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "action": {
    "default_title": "Open Extension"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### Service Worker

```typescript
// background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
```

### Side Panel

```typescript
// panel.js
chrome.storage.local.get(['data'], (result) => {
  console.log('Data:', result.data);
});
```

## Firefox (MV2/MV3 Hybrid)

### Key Features

- Event pages (MV2) or Service Workers (MV3)
- `browser.sidebarAction` API
- `browser.browserAction` API
- `browser.*` namespace (standard)
- No programmatic sidebar open (user must manually open)

### Manifest (MV2)

```json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0.0",
  "permissions": ["storage", "alarms"],
  "browser_action": {
    "default_popup": "popup.html",
    "default_title": "Open Extension"
  },
  "sidebar_action": {
    "default_panel": "panel/index.html",
    "default_title": "My Extension",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

### Background Script (Event Page)

```javascript
// background.js (MV2)
browser.browserAction.onClicked.addListener((tab) => {
  // Cannot programmatically open sidebar in Firefox
  // User must manually toggle sidebar
  browser.sidebarAction.setPanel({ panel: 'panel/index.html' });
});
```

### Sidebar

```javascript
// panel.js
browser.storage.local.get(['data'], (result) => {
  console.log('Data:', result.data);
});
```

### Firefox MV3 (Experimental)

Firefox is moving toward MV3 but with differences. Check latest Firefox documentation for current MV3 support.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "permissions": ["storage", "alarms"],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Open Extension"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

## Safari (Highly Restrictive)

### Key Features

- No service workers (background pages only)
- No side panel API
- No `chrome.declarativeNetRequest`
- No `chrome.offscreen`
- Different packaging requirements (`.app` or signed extension)
- App Store review process required

### Manifest (MV2)

```json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "scripting"],
  "browser_action": {
    "default_popup": "popup.html",
    "default_title": "Open Extension"
  },
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

### Workarounds for Safari

Since Safari doesn't support side panels, use alternative UI:

1. **Action Popup**: Transient popup for quick actions
2. **Options Page**: Full-page settings interface
3. **Content Script Overlay**: Injected UI into the page
4. **Native macOS App**: For advanced features

### Example: Popup-Only Safari Extension

```json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "browser_action": {
    "default_popup": "popup.html",
    "default_title": "My Extension"
  }
}
```

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
  <head>
    <script src="popup.js"></script>
  </head>
  <body>
    <h1>My Extension</h1>
    <button id="actionBtn">Do Something</button>
  </body>
</html>
```

```javascript
// popup.js
document.getElementById('actionBtn').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  browser.tabs.sendMessage(tab.id, { type: 'DO_ACTION' });
});
```

## Cross-Browser Messaging

### Standardized Messaging Pattern

```typescript
// Use webextension-polyfill for consistent API
import browser from 'webextension-polyfill';

// Sender
browser.runtime.sendMessage({ type: 'GET_DATA', id: 123 }).then((response) => {
  console.log('Response:', response);
});

// Receiver
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    return Promise.resolve({ data: 'example' });
  }
});
```

### Port-Based Messaging (Long-Lived)

```typescript
// Sender
const port = browser.runtime.connect({ name: 'my-port' });
port.postMessage({ type: 'HELLO' });
port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

// Receiver
browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => {
    port.postMessage({ type: 'ACK', received: message });
  });
});
```

## Storage Compatibility

All browsers support `chrome.storage.*` / `browser.storage.*`.

```typescript
import browser from 'webextension-polyfill';

// Works on all browsers
await browser.storage.local.set({ key: 'value' });
const result = await browser.storage.local.get(['key']);
console.log(result.key);
```

## Common Cross-Browser Patterns

### Pattern 1: Feature-Conditional Side Panel

```typescript
function setupSidePanel() {
  if (typeof chrome?.sidePanel !== 'undefined') {
    // Chrome/Edge: Use side panel
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    chrome.sidePanel.setOptions({
      path: 'panel/index.html',
      title: 'My Extension',
    });
  } else if (typeof browser?.sidebarAction !== 'undefined') {
    // Firefox: Use sidebar action
    browser.sidebarAction.setPanel({ panel: 'panel/index.html' });
    browser.sidebarAction.setTitle({ title: 'My Extension' });
  } else {
    // Safari: Use popup
    console.warn('Side panel not supported; using popup');
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setupSidePanel();
});
```

### Pattern 2: Storage Wrapper

```typescript
class Storage {
  async get(keys: string[]): Promise<any> {
    if (typeof browser !== 'undefined') {
      return await browser.storage.local.get(keys);
    } else {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
      });
    }
  }

  async set(items: any): Promise<void> {
    if (typeof browser !== 'undefined') {
      await browser.storage.local.set(items);
    } else {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

const storage = new Storage();
```

### Pattern 3: Browser Detection for Fallbacks

```typescript
function getBrowserInfo(): 'chrome' | 'firefox' | 'safari' | 'unknown' {
  if (
    typeof chrome !== 'undefined' &&
    typeof chrome.sidePanel !== 'undefined'
  ) {
    return 'chrome';
  } else if (typeof browser !== 'undefined') {
    // Firefox or Edge
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Edg')) return 'chrome'; // Edge uses Chrome APIs
    return 'firefox'; // Default
  } else if (typeof safari !== 'undefined') {
    return 'safari';
  }
  return 'unknown';
}

const browserType = getBrowserInfo();
console.log('Browser:', browserType);
```

## Testing Across Browsers

### Chrome/Edge

1. Load unpacked extension in `chrome://extensions`
2. Test side panel, service worker, storage
3. Verify `chrome.sidePanel` API usage
4. Check DevTools for SW lifecycle

### Firefox

1. Load temporary add-on in `about:debugging`
2. Test sidebar action, event page/storage
3. Verify `browser.sidebarAction` API usage
4. Check Browser Console for errors

### Safari

1. Enable Developer mode in Safari > Preferences > Advanced
2. Load extension in Safari > Preferences > Extensions
3. Test popup, content scripts
4. Verify fallback UI works (no side panel)

## Best Practices

1. **Feature-detect, don't UA-sniff.**
2. **Use webextension-polyfill** for consistent APIs.
3. **Test on each target browser** before release.
4. **Provide fallbacks** for unsupported features (e.g., popup instead of side panel).
5. **Document browser-specific limitations** in your README.
6. **Consider using build tools** (Plasmo, WXT) for cross-browser packaging.

## Recommended Build Tools

### Plasmo

```bash
pnpm add plasmo
```

Plasmo provides cross-browser abstraction and handles manifest generation for each browser.

### WXT

```bash
pnpm add -D wxt
```

WXT is another cross-browser extension framework with TypeScript support.

## Resources

- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)
- [Chrome MV3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox Extension Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Safari Extension Docs](https://developer.apple.com/documentation/safari-extensions/)
- [Plasmo Framework](https://www.plasmo.com/)
- [WXT Framework](https://wxt.dev/)
