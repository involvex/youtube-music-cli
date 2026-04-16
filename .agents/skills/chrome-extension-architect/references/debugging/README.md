# Debugging Reference

Complete guide to debugging Chrome MV3 extensions, service worker lifecycle issues, and common pitfalls.

## Debugging Tools

### 1. Chrome Extensions Page

Navigate to `chrome://extensions`

Key features:

- Enable **Developer mode** (top-right toggle)
- **Load unpacked**: Load extension from folder
- **Service worker**: Inspect background script
- **Errors**: Shows console errors for all components
- **Reload**: Reload extension without browser restart

### 2. Service Worker Inspector

Click the "Service worker" link in `chrome://extensions` to open:

- **Console**: View SW logs and errors
- **Network**: Monitor SW network requests
- **Memory**: Inspect SW memory usage
- **Application**: View storage, IndexedDB, etc.
- **Sources**: Set breakpoints in SW code

### 3. Popup Inspector

Right-click on extension popup > **Inspect**

- Debug popup UI and scripts
- View localStorage (popup-only)
- Inspect DOM and styles

### 4. Side Panel Inspector

Right-click on side panel > **Inspect**

- Debug side panel UI and scripts
- View chrome.storage.\* access
- Inspect DOM and styles

### 5. Content Script Inspector

Right-click on page > **Inspect**

- Content script execution context visible in console
- Network tab shows content script requests
- Can set breakpoints in content scripts

## Common Issues & Solutions

### Issue 1: Service Worker Not Responding

**Symptoms:**

- Message sent to SW times out
- Console shows "Receiving end does not exist"
- Extension stops working after a few minutes

**Cause:**
Service worker terminated, listeners not registered, or async response missing `return true`.

**Debug Steps:**

1. Check SW status in `chrome://extensions`
2. Open Service Worker inspector
3. Look for errors in Console tab
4. Verify listeners are registered **top-level, synchronously**

**Solution:**

```typescript
// BAD: Listener inside async function
setTimeout(() => {
  chrome.runtime.onMessage.addListener(handler);
}, 1000);

// GOOD: At top-level
chrome.runtime.onMessage.addListener(handler);

// If async response, return true
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then((data) => {
    sendResponse({ data });
  });
  return true; // Keep channel open
});
```

### Issue 2: Global State Lost

**Symptoms:**

- Variables reset to defaults after some time
- Auth token disappears
- Counter resets to 0

**Cause:**
Service worker terminated, global variables reset.

**Debug Steps:**

1. Open Service Worker inspector
2. Set a global variable: `window.testVar = 'hello'`
3. Click "Stop" button to terminate SW
4. Wait 30 seconds, SW wakes up on next event
5. Check if `window.testVar` still exists (it won't)

**Solution:**

```typescript
// BAD: Global variable
let authToken = null;

// GOOD: Storage-backed
async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(['authToken']);
  return result.authToken || null;
}

async function setAuthToken(token: string) {
  await chrome.storage.local.set({ authToken: token });
}
```

### Issue 3: Side Panel Not Opening

**Symptoms:**

- Clicking icon does nothing
- Side panel shows blank
- Error: "setPanelBehavior is not a function"

**Cause:**
`setPanelBehavior` not called, called asynchronously, or missing `sidePanel` permission.

**Debug Steps:**

1. Check manifest has `sidePanel` permission
2. Check `setPanelBehavior` is called in SW top-level
3. Check Console for permission errors
4. Verify panel path is correct

**Solution:**

```json
// manifest.json
{
  "permissions": ["sidePanel"]
}
```

```typescript
// background.js - MUST be top-level, synchronous
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### Issue 4: Content Script Not Injecting

**Symptoms:**

- Script doesn't run on page
- No console logs from content script
- UI elements not appearing

**Cause:**
Manifest content_scripts pattern mismatch, scripting API permissions, or URL restrictions.

**Debug Steps:**

1. Check Console for injection errors
2. Verify URL matches content_scripts pattern
3. Check permissions (if using scripting API)

**Solution:**

```json
// manifest.json
{
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "js": ["content.js"]
  }]
}

// Or use scripting API
"permissions": ["activeTab", "scripting"]

chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content.js']
});
```

### Issue 5: Storage Not Persisting

**Symptoms:**

- Data disappears after reload
- `storage.local.get` returns undefined
- Changes not saved

**Cause:**
Wrong storage type, async/await issues, or quota exceeded.

**Debug Steps:**

1. Open Service Worker inspector > Application tab > Storage
2. Check `chrome.storage.local` contents
3. Look for quota errors in Console
4. Verify async/await usage

**Solution:**

```typescript
// BAD: Not awaiting
chrome.storage.local.set({ key: 'value' });

// GOOD: Await or use callback
await chrome.storage.local.set({ key: 'value' });

// Or check for errors
chrome.storage.local.set({ key: 'value' }, () => {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError);
  }
});
```

### Issue 6: Cross-Browser Incompatibility

**Symptoms:**

- Works in Chrome but not Firefox
- "chrome.sidePanel is not defined" error
- Extension doesn't load in Safari

**Cause:**
Browser-specific APIs, manifest version mismatches.

**Debug Steps:**

1. Check browser console for API errors
2. Verify manifest version matches browser support
3. Use feature detection

**Solution:**

```typescript
const hasSidePanel = typeof chrome?.sidePanel !== 'undefined';
const hasSidebarAction = typeof browser?.sidebarAction !== 'undefined';

if (hasSidePanel) {
  // Chrome/Edge
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} else if (hasSidebarAction) {
  // Firefox
  browser.sidebarAction.setPanel({ panel: 'panel/index.html' });
}
```

## Debugging Checklist

### Service Worker Lifecycle

- [ ] All listeners registered **top-level, synchronously**
- [ ] Global state moved to `chrome.storage.*`
- [ ] Async responses return `true`
- [ ] WebSocket connections reconnect on wake-up
- [ ] Test termination manually (click "Stop" in inspector)

### Permissions

- [ ] Manifest includes required permissions
- [ ] Host permissions are narrow (no `<all_urls>`)
- [ ] Optional permissions requested at runtime if needed
- [ ] No unused permissions

### Storage

- [ ] Using correct storage type (local/sync/session)
- [ ] Async operations properly awaited
- [ ] Error handling for quota exceeded
- [ ] Storage cleared on logout if needed

### Side Panel / Popup

- [ ] `setPanelBehavior` called top-level
- [ ] Panel path is correct
- [ ] Side panel permission in manifest
- [ ] Content scripts can message to SW

### Cross-Browser

- [ ] Feature detection used
- [ ] `webextension-polyfill` for consistent APIs
- [ ] Fallback UI for Safari (no side panel)
- [ ] Tested on Chrome, Firefox, Safari

## Debugging Techniques

### 1. Force Service Worker Termination

Click "Stop" button in Service Worker inspector to test state persistence.

### 2. Log Service Worker Wake-Up

```typescript
console.log('SW activated at', new Date().toISOString());

chrome.runtime.onSuspend.addListener(() => {
  console.log('SW suspending');
});
```

### 3. Trace Message Flow

```typescript
// Content script
console.log('[Content] Sending message:', message);
chrome.runtime.sendMessage(message, (response) => {
  console.log('[Content] Received response:', response);
});

// Service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SW] Received message:', message, 'from:', sender.tab?.url);
  sendResponse({ data: 'response' });
  console.log('[SW] Sent response');
  return true;
});
```

### 4. Monitor Storage Changes

```typescript
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('[Storage]', areaName, 'changed:', changes);
});
```

### 5. Network Debugging

In Service Worker inspector > Network tab:

- Monitor fetch requests from SW
- Check CORS issues
- Verify API calls succeed

## Performance Debugging

### 1. Profile Service Worker

In Service Worker inspector > Performance tab:

- Record SW activity
- Identify slow operations
- Check memory leaks

### 2. Monitor Extension Performance

In `chrome://extensions`:

- Click "Inspect views: background page"
- Use Chrome DevTools Performance tab

### 3. Check Extension Load Time

```typescript
console.time('Extension loaded');
chrome.runtime.onStartup.addListener(() => {
  console.timeEnd('Extension loaded');
});
```

## Security Debugging

### 1. Check CSP Violations

In Console, look for:

- "Refused to load script..."
- "Content Security Policy"
- "Eval is not allowed"

### 2. Verify Permissions

```typescript
chrome.permissions.contains(
  {
    permissions: ['tabs'],
    origins: ['<all_urls>'],
  },
  (result) => {
    console.log('Has tabs permission:', result);
  }
);
```

### 3. Audit Data Access

Review manifest:

- Are you accessing unnecessary data?
- Are host permissions too broad?
- Are you storing sensitive data insecurely?

## Remote Debugging (Android)

### Debug Android Chrome Extension

1. Enable USB debugging on Android device
2. Connect device to computer
3. In Chrome: `chrome://inspect`
4. Select device and inspect extension

## Common Error Messages

### "Receiving end does not exist"

Cause: Message handler not registered or SW terminated.

Solution: Register listeners top-level, return `true` for async responses.

### "setPanelBehavior is not a function"

Cause: Missing `sidePanel` permission or old Chrome version.

Solution: Add `sidePanel` permission, update Chrome.

### "Unchecked runtime.lastError"

Cause: Async operation error not handled.

Solution: Check `chrome.runtime.lastError` in callbacks.

### "QuotaExceededError"

Cause: Storage quota exceeded.

Solution: Clean up old data, use IndexedDB for large datasets.

### "File not found"

Cause: Incorrect path in manifest or code.

Solution: Verify file paths, use relative paths.

## Debugging Tools Reference

| Tool                     | Use Case                     | Access                                    |
| ------------------------ | ---------------------------- | ----------------------------------------- |
| `chrome://extensions`    | Load, reload, view errors    | Chrome                                    |
| Service Worker Inspector | Debug background script      | Chrome > Extensions > Service Worker link |
| Popup Inspector          | Debug popup UI               | Right-click popup > Inspect               |
| Content Script Console   | Debug page interactions      | Right-click page > Inspect                |
| `chrome://tracing`       | Performance profiling        | Chrome                                    |
| `chrome://flags`         | Enable experimental features | Chrome                                    |

## Resources

- [Chrome DevTools Docs](https://developer.chrome.com/docs/devtools/)
- [Extension Debugging Guide](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Storage Debugging](https://developer.chrome.com/docs/extensions/reference/api/storage)
