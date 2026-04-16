# Service Worker Lifecycle Reference

Complete guide to Manifest V3 service worker lifecycle, termination handling, and state management.

## Core Reality: Service Workers Die

MV3 background scripts are **non-persistent service workers**.

- Terminated after ~30 seconds to 5 minutes of inactivity (exact timing varies)
- Global variables reset on every termination
- Event listeners must be registered **top-level, synchronously**
- Never rely on in-memory state for correctness

This is the #1 source of bugs in MV3 extensions.

## Lifecycle States

```
Installed → Activated → Running (event handling) → Idle → Terminated
                    ↑___________________________________|
                            (on event, wake up)
```

### 1. Installed

Fired once when extension is installed or updated.

```typescript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time setup
    chrome.storage.local.set({ version: chrome.runtime.getManifest().version });
  } else if (details.reason === 'update') {
    // Handle migration if needed
  }
});
```

### 2. Activated

Service worker ready to handle events.

### 3. Running

Processing events (messages, alarms, API calls).

### 4. Idle

No events for ~30 seconds. Service worker becomes idle but not terminated.

### 5. Terminated

Service worker killed by browser. All globals lost.

## Non-Negotiable Rules

### 1. Register Listeners Top-Level, Synchronously

❌ **WRONG:** Register listener inside async function or event handler.

```typescript
// BAD: Listener registered asynchronously
setTimeout(() => {
  chrome.runtime.onMessage.addListener((message) => {
    console.log('Message:', message);
  });
}, 1000);
```

✅ **RIGHT:** Register at top-level.

```typescript
// GOOD: Registered immediately on startup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message:', message);
  return true; // Keep channel open if async
});
```

### 2. Never Use Globals for Persistent State

❌ **WRONG:** Rely on global variables.

```typescript
// BAD: Lost on termination
let authToken = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SET_AUTH') {
    authToken = message.token;
  }
});
```

✅ **RIGHT:** Use `chrome.storage.*` or IndexedDB.

```typescript
// GOOD: Persists across restarts
chrome.storage.local.get(['authToken'], (result) => {
  const authToken = result.authToken;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SET_AUTH') {
    chrome.storage.local.set({ authToken: message.token });
  }
});
```

### 3. Handle Async Responses with `return true`

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    fetchData().then((data) => {
      sendResponse({ data });
    });
    return true; // Keep message channel open
  }
  return false; // No async response
});
```

### 4. Reconnect Persistent Connections

```typescript
// WebSocket connection lost on termination
let ws = null;

function connectWebSocket() {
  ws = new WebSocket('wss://example.com');
  ws.onopen = () => console.log('WebSocket connected');
  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting in 5s...');
    setTimeout(connectWebSocket, 5000);
  };
  ws.onerror = (error) => console.error('WebSocket error:', error);
}

// Reconnect on service worker wake-up
chrome.runtime.onStartup.addListener(() => {
  connectWebSocket();
});
```

## State Persistence Options

| Storage Type             | Persists Across                                   | Size Limit | Access                 | Best For                        |
| ------------------------ | ------------------------------------------------- | ---------- | ---------------------- | ------------------------------- |
| `chrome.storage.local`   | Termination, reload, restart                      | ~10MB      | Anywhere               | Persistent settings, user data  |
| `chrome.storage.sync`    | Termination, reload, restart, sync across devices | ~100KB     | Anywhere               | Synced settings                 |
| `chrome.storage.session` | Termination, reload                               | ~1MB       | Anywhere               | Ephemeral session data          |
| IndexedDB                | Termination, reload, restart                      | Disk-based | SW, content scripts    | Large datasets, structured data |
| `localStorage`           | Popup open/close                                  | ~5MB       | Popup, content scripts | Popup-only state                |
| Global variables         | **None**                                          | N/A        | Current instance only  | Temporary computation           |

**CRITICAL:** `localStorage` and `sessionStorage` are NOT available in service workers (no `window` object).

### Storage Matrix

| Scenario             | Use This                            | Why                                     |
| -------------------- | ----------------------------------- | --------------------------------------- |
| User preferences     | `chrome.storage.sync`               | Syncs across devices                    |
| Large datasets       | IndexedDB                           | Bigger than storage, structured         |
| Session auth token   | `chrome.storage.session`            | Cleared on browser restart              |
| Persistent notes     | `chrome.storage.local`              | Survives restarts                       |
| Popup UI state       | `chrome.storage.session` or globals | Ephemeral, not critical                 |
| Content script state | `chrome.storage.local` or messaging | Content scripts can't access SW globals |

## Event Handling Patterns

### 1. Message Passing (One-Time Request)

```typescript
// Content script sends request
chrome.runtime.sendMessage({ type: 'GET_DATA', id: 123 }, (response) => {
  console.log('Response:', response);
});

// Service worker handles request
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    getData(message.id).then((data) => {
      sendResponse({ data });
    });
    return true; // Async response
  }
});
```

### 2. Message Passing (Long-Lived Port)

```typescript
// Content script opens port
const port = chrome.runtime.connect({ name: 'my-port' });
port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

// Service worker accepts connection
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => {
    port.postMessage({ type: 'ACK', received: message });
  });
});
```

### 3. Alarms (Scheduled Tasks)

```typescript
// Set alarm
chrome.alarms.create('refresh-data', { periodInMinutes: 5 });

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh-data') {
    refreshData();
  }
});
```

### 4. Tab Events

```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    processTab(tabId, tab.url);
  }
});
```

### 5. Action Click Events

```typescript
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
});
```

## Common Pitfalls

### 1. Listener Not Registered

```typescript
// BAD: Listener inside async function
setTimeout(() => {
  chrome.runtime.onMessage.addListener(handler);
}, 1000);

// GOOD: At top-level
chrome.runtime.onMessage.addListener(handler);
```

### 2. State Lost After Termination

```typescript
// BAD: Global variable
let counter = 0;

// GOOD: Storage-backed
chrome.storage.local.get(['counter'], (result) => {
  const counter = result.counter || 0;
});
```

### 3. Async Response Without `return true`

```typescript
// BAD: Async response but channel closes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then((data) => {
    sendResponse({ data }); // Too late, channel closed
  });
});

// GOOD: Return true to keep channel open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then((data) => {
    sendResponse({ data });
  });
  return true;
});
```

### 4. Using `localStorage` in Service Worker

```typescript
// ERROR: localStorage is not defined in service workers
localStorage.setItem('key', 'value');

// GOOD: Use chrome.storage.local
chrome.storage.local.set({ key: 'value' });
```

### 5. Persistent WebSocket Connection

```typescript
// BAD: Assume WebSocket stays connected
const ws = new WebSocket('wss://example.com');

// GOOD: Reconnect on wake-up and handle disconnections
function connectWebSocket() {
  const ws = new WebSocket('wss://example.com');
  ws.onclose = () => setTimeout(connectWebSocket, 5000);
  return ws;
}

chrome.runtime.onStartup.addListener(() => {
  connectWebSocket();
});
```

## Debugging Service Worker Issues

### 1. Check Service Worker Status

Open `chrome://extensions`, click "Service Worker" link to see:

- Current status (running, idle, terminated)
- Console logs
- Network activity

### 2. Force Service Worker Termination

Click "Stop" button in Service Worker inspector to test state persistence.

### 3. Monitor Termination

```typescript
// Log when service worker is about to terminate
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending');
});

// Log when service worker wakes up
console.log('Service worker activated at', new Date().toISOString());
```

### 4. Use Chrome Storage for Debugging

```typescript
// Log state to storage for inspection
chrome.storage.local.get(['debugState'], (result) => {
  console.log('Current state:', result.debugState);
});
```

### 5. Message Tracing

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message, 'from:', sender.tab?.url);
  // Handle message
});
```

## Best Practices

1. **Always use storage for persistent state.**
2. **Register all listeners at top-level.**
3. **Use `return true` for async message responses.**
4. **Reconnect persistent connections on wake-up.**
5. **Keep service worker lightweight.** Move heavy work to offscreen documents or web workers.
6. **Test termination scenarios** by manually stopping service worker.
7. **Log key events** (startup, suspend, message handling).

## Example: Complete Service Worker

```typescript
// background.js

// === LISTENERS (registered top-level) ===

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    initializeStorage();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);

  switch (message.type) {
    case 'GET_DATA':
      getData(message.id).then((data) => sendResponse({ data }));
      return true; // Async response

    case 'SET_DATA':
      setData(message.id, message.value);
      sendResponse({ success: true });
      return false;

    default:
      console.warn('Unknown message type:', message.type);
      return false;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh') {
    refreshData();
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// === STORAGE-BACKED STATE ===

function initializeStorage() {
  chrome.storage.local.set({
    version: chrome.runtime.getManifest().version,
    data: {},
  });
}

async function getData(id: string) {
  const result = await chrome.storage.local.get(['data']);
  return result.data?.[id] || null;
}

async function setData(id: string, value: any) {
  const result = await chrome.storage.local.get(['data']);
  const data = result.data || {};
  data[id] = value;
  await chrome.storage.local.set({ data });
}

function refreshData() {
  console.log('Refreshing data...');
  // Implementation
}

// === DEBUG LOGGING ===

console.log('Service worker initialized at', new Date().toISOString());

chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending');
});
```

## Resources

- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)
