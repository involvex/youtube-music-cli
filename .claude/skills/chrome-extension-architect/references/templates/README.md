# Templates Reference

Copy-paste boilerplate code for common Chrome MV3 extension patterns.

## Project Structure

```
my-extension/
├── manifest.json
├── background.js
├── popup/
│   ├── index.html
│   └── popup.js
├── panel/
│   ├── index.html
│   └── panel.js
├── content/
│   └── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Template 1: Minimal Side Panel Extension

Privacy-first note-taking extension with side panel and local storage.

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Privacy-First Notes",
  "version": "1.0.0",
  "description": "Secure note-taking extension with side panel",
  "permissions": ["sidePanel", "storage"],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Open Notes",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### background.js

```javascript
// Bind side panel to action icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Install handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    chrome.storage.local.set({ notes: {} });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_NOTES') {
    chrome.storage.local.get(['notes'], (result) => {
      sendResponse({ notes: result.notes || {} });
    });
    return true;
  }

  if (message.type === 'SAVE_NOTE') {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || {};
      notes[message.id] = message.content;
      chrome.storage.local.set({ notes }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  return false;
});
```

### panel/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notes</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 16px;
        line-height: 1.5;
      }
      h1 {
        font-size: 1.25rem;
        margin-bottom: 16px;
      }
      .note-item {
        background: #f5f5f5;
        padding: 8px;
        margin-bottom: 8px;
        border-radius: 4px;
      }
      .note-input {
        width: 100%;
        min-height: 80px;
        padding: 8px;
        margin-bottom: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        resize: vertical;
        font-family: inherit;
      }
      .btn {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .btn:hover {
        background: #0056b3;
      }
    </style>
  </head>
  <body>
    <h1>Notes</h1>
    <textarea
      id="noteInput"
      class="note-input"
      placeholder="Write a note..."
    ></textarea>
    <button id="saveBtn" class="btn">Save Note</button>
    <div id="notesList"></div>
    <script src="panel.js"></script>
  </body>
</html>
```

### panel.js

```javascript
// DOM elements
const noteInput = document.getElementById('noteInput');
const saveBtn = document.getElementById('saveBtn');
const notesList = document.getElementById('notesList');

// Load notes on startup
chrome.runtime.sendMessage({ type: 'GET_NOTES' }, (response) => {
  renderNotes(response.notes);
});

// Save note
saveBtn.addEventListener('click', () => {
  const content = noteInput.value.trim();
  if (!content) return;

  const id = Date.now().toString();
  chrome.runtime.sendMessage(
    {
      type: 'SAVE_NOTE',
      id,
      content,
    },
    (response) => {
      if (response.success) {
        noteInput.value = '';
        loadNotes();
      }
    }
  );
});

// Load notes
function loadNotes() {
  chrome.runtime.sendMessage({ type: 'GET_NOTES' }, (response) => {
    renderNotes(response.notes);
  });
}

// Render notes
function renderNotes(notes) {
  notesList.innerHTML = '';
  Object.entries(notes || {}).forEach(([id, content]) => {
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.textContent = content;
    notesList.appendChild(noteItem);
  });
}
```

## Template 2: Content Script with ActiveTab

Extension that modifies current page content when user clicks button.

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Page Modifier",
  "version": "1.0.0",
  "description": "Modify page content on demand",
  "permissions": ["activeTab", "scripting"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Modify Page"
  }
}
```

### background.js

```javascript
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
});
```

### content.js

```javascript
// Example: Highlight all h1 tags
const headings = document.querySelectorAll('h1');
headings.forEach((heading) => {
  heading.style.backgroundColor = 'yellow';
  heading.style.padding = '8px';
});

console.log('Modified', headings.length, 'headings');
```

## Template 3: Cross-Browser Extension with Feature Detection

Works on Chrome/Edge (side panel) and Firefox (sidebar).

### manifest.json (Chrome MV3)

```json
{
  "manifest_version": 3,
  "name": "Cross-Browser Extension",
  "version": "1.0.0",
  "permissions": ["storage"],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Open Extension"
  }
}
```

### manifest.json (Firefox MV2)

```json
{
  "manifest_version": 2,
  "name": "Cross-Browser Extension",
  "version": "1.0.0",
  "permissions": ["storage"],
  "sidebar_action": {
    "default_panel": "panel/index.html",
    "default_title": "Open Extension",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  "browser_action": {
    "default_title": "Open Extension"
  }
}
```

### background.js

```javascript
// Feature detection
if (typeof chrome?.sidePanel !== 'undefined') {
  // Chrome/Edge
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} else if (typeof browser?.sidebarAction !== 'undefined') {
  // Firefox
  browser.sidebarAction.setPanel({ panel: 'panel/index.html' });
} else {
  // Safari or fallback
  console.warn('Side panel not supported');
}
```

## Template 4: Service Worker with Alarms

Periodic data refresh with alarms.

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Data Refresher",
  "version": "1.0.0",
  "permissions": ["alarms", "storage"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### background.js

```javascript
// Create alarm on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refresh-data', { periodInMinutes: 5 });
});

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refresh-data') {
    await refreshData();
  }
});

// Fetch and store data
async function refreshData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    await chrome.storage.local.set({ lastData: data });
    console.log('Data refreshed at', new Date().toISOString());
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

// Initial refresh
chrome.runtime.onStartup.addListener(() => {
  refreshData();
});
```

## Template 5: IndexedDB for Large Datasets

Store large datasets using IndexedDB.

### background.js

```javascript
// IndexedDB wrapper
class IDBHelper {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Usage
async function init() {
  const helper = new IDBHelper('MyExtensionDB', 1);
  await helper.open();

  // Add item
  await helper.put('items', { id: '1', content: 'Example' });

  // Get all items
  const items = await helper.getAll('items');
  console.log('Items:', items);
}

chrome.runtime.onInstalled.addListener(() => {
  init();
});
```

## Template 6: Message Port (Long-Lived Connection)

Bi-directional communication via port.

### background.js

```javascript
chrome.runtime.onConnect.addListener((port) => {
  console.log('Client connected:', port.name);

  port.onMessage.addListener((message) => {
    console.log('Received:', message);

    // Send response
    port.postMessage({ type: 'ACK', received: message });

    // Handle specific messages
    if (message.type === 'PING') {
      port.postMessage({ type: 'PONG', timestamp: Date.now() });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('Client disconnected');
  });
});
```

### content.js (or panel.js)

```javascript
// Open port
const port = chrome.runtime.connect({ name: 'my-connection' });

// Listen to messages
port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

// Send message
port.postMessage({ type: 'PING', data: 'Hello' });

// Close port when done
// port.disconnect();
```

## Template 7: Storage with Change Listeners

React to storage changes across contexts.

### content.js

```javascript
// Listen to storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.theme) {
    applyTheme(changes.theme.newValue);
  }
});

function applyTheme(theme) {
  document.body.className = theme;
  console.log('Theme changed to:', theme);
}
```

### background.js

```javascript
// Change theme
async function setTheme(theme) {
  await chrome.storage.local.set({ theme });
}

chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get(['theme'], (result) => {
    const newTheme = result.theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
});
```

## Template 8: Offscreen Document

Perform DOM-heavy work in offscreen document.

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Offscreen Example",
  "version": "1.0.0",
  "permissions": ["offscreen"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### background.js

```javascript
// Setup offscreen document
async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts.length) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Need to parse complex HTML',
  });
}

// Use offscreen document
async function parseHTML(html) {
  await setupOffscreenDocument();

  return new Promise((resolve) => {
    chrome.runtime.onMessage.addListener(function handler(message) {
      if (message.type === 'PARSE_RESULT') {
        chrome.runtime.onMessage.removeListener(handler);
        resolve(message.result);
      }
    });

    chrome.runtime.sendMessage({ type: 'PARSE_HTML', html });
  });
}
```

### offscreen.html

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="offscreen.js"></script>
  </head>
  <body></body>
</html>
```

### offscreen.js

```javascript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PARSE_HTML') {
    // Use DOM APIs to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, 'text/html');

    const result = {
      title: doc.querySelector('title')?.textContent,
      links: doc.querySelectorAll('a').length,
    };

    chrome.runtime.sendMessage({ type: 'PARSE_RESULT', result });
  }
});
```

## Quick Start Commands

```bash
# Create new extension
mkdir my-extension
cd my-extension

# Copy template (choose one)
# Template 1: Side Panel Extension
# Template 2: Content Script
# Template 3: Cross-Browser
# Template 4: Alarms
# Template 5: IndexedDB
# Template 6: Message Port
# Template 7: Storage Listeners
# Template 8: Offscreen

# Load in Chrome
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select my-extension folder
```

## Resources

- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- [WebExtension Examples](https://github.com/mdn/webextensions-examples)
- [Plasmo Examples](https://github.com/PlasmoHQ/plasmo/tree/main/examples)
