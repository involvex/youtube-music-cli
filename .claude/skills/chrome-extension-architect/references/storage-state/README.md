# Storage & State Persistence Reference

Complete guide to Chrome extension storage options, lifecycle awareness, and state management.

## Storage Options Overview

| Storage Type             | Capacity           | Persistence                                                    | Access                          | Security               | Best For                        |
| ------------------------ | ------------------ | -------------------------------------------------------------- | ------------------------------- | ---------------------- | ------------------------------- |
| `chrome.storage.local`   | ~10MB              | Survives SW termination, extension reload, browser restart     | All contexts                    | Isolated per extension | Persistent user data            |
| `chrome.storage.sync`    | ~100KB             | Survives SW termination, reload, restart, syncs across devices | All contexts                    | Isolated per extension | User preferences, settings      |
| `chrome.storage.session` | ~1MB               | Survives SW termination, reload; cleared on browser restart    | All contexts                    | Isolated per extension | Ephemeral session data          |
| IndexedDB                | Disk-based (50MB+) | Survives SW termination, reload, restart                       | SW, content scripts             | Isolated per extension | Large datasets, complex objects |
| `localStorage`           | ~5MB               | Popup open/close only                                          | Popup, content scripts (NOT SW) | Isolated per origin    | Popup-only UI state             |
| `sessionStorage`         | ~5MB               | Popup open/close only                                          | Popup, content scripts (NOT SW) | Isolated per origin    | Temporary UI state              |
| Global variables         | Memory             | **None** (lost on SW termination)                              | Current instance only           | None                   | Temporary computation           |

**CRITICAL:** `localStorage` and `sessionStorage` are NOT available in service workers.

## Storage Decision Tree

```
Need to store data?
├─ Should sync across devices?
│  └─ Use chrome.storage.sync
│     ⚠️ Size limit ~100KB
│
├─ Data size > 1MB or complex objects?
│  └─ Use IndexedDB
│     ✅ Works in service workers
│     ✅ Survives termination
│     ✅ Async API
│
├─ Data is ephemeral (session only)?
│  └─ Use chrome.storage.session
│     ⚠️ Cleared on browser restart
│
└─ Data is persistent (user data, notes, etc.)
   └─ Use chrome.storage.local
      ✅ ~10MB capacity
      ✅ Survives restarts
```

## chrome.storage.local

### Characteristics

- ~10MB capacity
- Survives service worker termination
- Survives extension reload
- Survives browser restart
- Async API (promises)
- Accessible from all contexts (SW, popup, content scripts)

### Usage

```typescript
// Set data
await chrome.storage.local.set({ userId: '123', notes: ['note1', 'note2'] });

// Get data
const result = await chrome.storage.local.get(['userId', 'notes']);
console.log(result.userId, result.notes);

// Get all data
const allData = await chrome.storage.local.get(null);

// Remove data
await chrome.storage.local.remove(['userId']);

// Clear all data
await chrome.storage.local.clear();

// Listen to changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Local storage changed:', changes);
  }
});
```

### Best Practices

```typescript
// 1. Use typed interfaces
interface StorageData {
  userId: string | null;
  notes: string[];
  settings: {
    theme: 'light' | 'dark';
  };
}

// 2. Get with defaults
async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get([
    'userId',
    'notes',
    'settings',
  ]);

  return {
    userId: result.userId || null,
    notes: result.notes || [],
    settings: result.settings || { theme: 'light' },
  };
}

// 3. Update incrementally
async function addNote(note: string) {
  const data = await getStorageData();
  data.notes.push(note);
  await chrome.storage.local.set({ notes: data.notes });
}
```

## chrome.storage.sync

### Characteristics

- ~100KB capacity (per extension)
- Syncs across user's signed-in devices
- Survives service worker termination
- Survives extension reload
- Survives browser restart
- Rate-limited (don't write too frequently)

### Usage

```typescript
// Set user preferences
await chrome.storage.sync.set({
  theme: 'dark',
  fontSize: 16,
  language: 'en',
});

// Get preferences
const prefs = await chrome.storage.sync.get(['theme', 'fontSize']);
console.log(prefs.theme, prefs.fontSize);

// Listen to sync changes (other devices)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.theme) {
    applyTheme(changes.theme.newValue);
  }
});
```

### Best Practices

```typescript
// 1. Debounce sync writes to avoid rate limiting
let syncTimeout: number | null = null;

function syncSettings(settings: Record<string, any>) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await chrome.storage.sync.set(settings);
    syncTimeout = null;
  }, 1000);
}

// 2. Handle sync conflicts (last write wins)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(`${key} changed from ${oldValue} to ${newValue}`);
      // Update UI to reflect new value
    }
  }
});
```

## chrome.storage.session

### Characteristics

- ~1MB capacity
- Survives service worker termination
- Survives extension reload
- **Cleared on browser restart**
- Async API
- Accessible from all contexts

### Usage

```typescript
// Set session data (auth token, temporary state)
await chrome.storage.session.set({
  authToken: 'abc123',
  currentUser: { id: '123', name: 'John' },
});

// Get session data
const session = await chrome.storage.session.get(['authToken', 'currentUser']);
console.log(session.authToken);

// Clear session on logout
await chrome.storage.session.clear();
```

### Best Practices

```typescript
// 1. Use for auth tokens (cleared on browser close)
async function login(email: string, password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const { token } = await response.json();
  await chrome.storage.session.set({ authToken: token });
}

async function logout() {
  await chrome.storage.session.clear();
  // Redirect to login
}

// 2. Check for session data on startup
async function checkSession() {
  const session = await chrome.storage.session.get(['authToken']);
  if (!session.authToken) {
    // Redirect to login
  }
}

// 3. Handle session restoration after SW restart
chrome.runtime.onStartup.addListener(() => {
  checkSession();
});
```

## IndexedDB

### Characteristics

- Large capacity (50MB+ with browser quota)
- Survives service worker termination
- Survives extension reload
- Survives browser restart
- Complex object storage (blobs, structured objects)
- Async API (promises or callbacks)
- Accessible from service workers and content scripts

### Usage

```typescript
// Open database
const request = indexedDB.open('MyExtensionDB', 1);

request.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains('notes')) {
    db.createObjectStore('notes', { keyPath: 'id' });
  }
};

request.onsuccess = async (event) => {
  const db = (event.target as IDBOpenDBRequest).result;

  // Add data
  const transaction = db.transaction(['notes'], 'readwrite');
  const store = transaction.objectStore('notes');
  store.add({ id: '1', content: 'Note 1', created: Date.now() });

  // Get data
  const getRequest = store.get('1');
  getRequest.onsuccess = () => {
    console.log('Note:', getRequest.result);
  };
};
```

### Best Practices

```typescript
// 1. Wrapper helper for cleaner API
class IDBHelper {
  private db: IDBDatabase | null = null;

  async open(dbName: string, version: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        // Handle schema upgrades
      };
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName: string, data: any): Promise<void> {
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 2. Use for large datasets
async function saveLargeDataset(data: any[]) {
  const helper = new IDBHelper();
  const db = await helper.open('LargeDataDB', 1);
  helper.db = db;

  const transaction = db.transaction(['items'], 'readwrite');
  const store = transaction.objectStore('items');

  for (const item of data) {
    await helper.put('items', item);
  }
}
```

## localStorage

### Characteristics

- ~5MB capacity
- **NOT available in service workers**
- Survives popup open/close
- Survives extension reload
- Survives browser restart
- **Cannot be shared across contexts** (popup vs content script)
- Synchronous API

### Usage (Popup Only)

```typescript
// In popup.js
localStorage.setItem('popupState', JSON.stringify({ isOpen: true }));

const state = JSON.parse(localStorage.getItem('popupState') || '{}');
console.log(state.isOpen);
```

### Limitations

- Cannot access in service worker
- Cannot access in content scripts from popup
- Each context has its own localStorage
- Use `chrome.storage.local` instead for shared state

## State Management Patterns

### Pattern 1: Storage-Backed State (Recommended)

```typescript
// In service worker
interface AppState {
  userId: string | null;
  notes: Record<string, string>;
  settings: {
    theme: 'light' | 'dark';
  };
}

class StateManager {
  async getState(): Promise<AppState> {
    const result = await chrome.storage.local.get([
      'userId',
      'notes',
      'settings',
    ]);
    return {
      userId: result.userId || null,
      notes: result.notes || {},
      settings: result.settings || { theme: 'light' },
    };
  }

  async setState(updates: Partial<AppState>): Promise<void> {
    await chrome.storage.local.set(updates);
  }
}

const stateManager = new StateManager();

// Usage
const state = await stateManager.getState();
await stateManager.setState({ userId: '123' });
```

### Pattern 2: Reactive State with Observers

```typescript
class ObservableState {
  private listeners: Array<(state: AppState) => void> = [];

  subscribe(listener: (state: AppState) => void) {
    this.listeners.push(listener);
  }

  async notify() {
    const state = await this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private async getState(): Promise<AppState> {
    const result = await chrome.storage.local.get(['data']);
    return result.data || {};
  }

  async setState(updates: Partial<AppState>) {
    const current = await this.getState();
    const updated = { ...current, ...updates };
    await chrome.storage.local.set({ data: updated });
    this.notify();
  }
}

const state = new ObservableState();

// Subscribe in popup
state.subscribe((currentState) => {
  renderPopup(currentState);
});
```

### Pattern 3: Tab-Specific State

```typescript
// Store state per tab
interface TabState {
  tabId: number;
  notes: string[];
}

async function getTabState(tabId: number): Promise<TabState> {
  const result = await chrome.storage.local.get(`tab_${tabId}`);
  return result[`tab_${tabId}`] || { tabId, notes: [] };
}

async function setTabState(tabId: number, updates: Partial<TabState>) {
  const current = await getTabState(tabId);
  const updated = { ...current, ...updates };
  await chrome.storage.local.set({ [`tab_${tabId}`]: updated });
}

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`tab_${tabId}`);
});
```

## Best Practices

### 1. Always Use Storage for Persistent State

```typescript
// BAD: Global variable
let counter = 0;

// GOOD: Storage-backed
let counter = await getCounter();
```

### 2. Use Storage Observers for Reactivity

```typescript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.notes) {
    updateUI(changes.notes.newValue);
  }
});
```

### 3. Batch Storage Writes

```typescript
// BAD: Multiple writes
await chrome.storage.local.set({ key1: 'value1' });
await chrome.storage.local.set({ key2: 'value2' });
await chrome.storage.local.set({ key3: 'value3' });

// GOOD: Single write
await chrome.storage.local.set({
  key1: 'value1',
  key2: 'value2',
  key3: 'value3',
});
```

### 4. Handle Storage Errors

```typescript
try {
  await chrome.storage.local.set({ key: 'value' });
} catch (error) {
  console.error('Storage error:', error);
  // Handle quota exceeded or other errors
}
```

### 5. Clean Up Unused Data

```typescript
// Remove old data periodically
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    const data = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(data).filter((key) => {
      return isOldOrUnused(key, data[key]);
    });
    await chrome.storage.local.remove(keysToRemove);
  }
});
```

## Security Considerations

- Storage is **not encrypted** by default. Encrypt sensitive data manually.
- Content scripts can read extension storage. Be careful what you expose.
- Don't store passwords or tokens in `chrome.storage.local`. Use `chrome.storage.session` for ephemeral tokens.
- Consider using `chrome.runtime.id` as namespace prefix to avoid conflicts.

## Resources

- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Storage Best Practices](https://developer.chrome.com/docs/extensions/mv3/data/)
