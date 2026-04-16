# HMR Implementation Examples

This document provides detailed examples of Hot Module Replacement (HMR) implementations for different frameworks and use cases with Bun.

## Basic WebSocket HMR

The simplest HMR implementation using WebSocket:

```typescript
// server.ts
import type { ServerWebSocket } from "bun";

const clients = new Set<ServerWebSocket<unknown>>();

const server = Bun.serve({
  port: 3000,

  fetch(request, server) {
    const url = new URL(request.url);

    if (url.pathname === "/_hmr") {
      server.upgrade(request);
      return undefined;
    }

    return new Response(Bun.file("index.html"));
  },

  websocket: {
    open(ws) {
      clients.add(ws);
    },
    close(ws) {
      clients.delete(ws);
    },
    message() {},
  },
});

// File watcher
const watcher = Bun.file.watch("./src");
for await (const event of watcher) {
  for (const client of clients) {
    client.send(JSON.stringify({ type: "reload", file: event.path }));
  }
}
```

```html
<!-- Client-side HMR -->
<script>
  const ws = new WebSocket('ws://localhost:3000/_hmr');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log(`Reloading due to change in ${data.file}`);
      window.location.reload();
    }
  };
</script>
```

## React Fast Refresh

Advanced HMR with React component preservation:

```typescript
// hmr-client.tsx
interface HMRMessage {
  type: 'update' | 'reload';
  modules?: string[];
}

class HMRClient {
  private ws: WebSocket;
  private pendingUpdates = new Set<string>();

  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}/_hmr`);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = () => {
      console.log('HMR disconnected, reloading...');
      setTimeout(() => window.location.reload(), 1000);
    };
  }

  private async handleMessage(event: MessageEvent) {
    const data: HMRMessage = JSON.parse(event.data);

    if (data.type === 'reload') {
      window.location.reload();
      return;
    }

    if (data.type === 'update' && data.modules) {
      for (const modulePath of data.modules) {
        await this.hotUpdate(modulePath);
      }
    }
  }

  private async hotUpdate(modulePath: string) {
    // Add cache-busting timestamp
    const url = `${modulePath}?t=${Date.now()}`;

    try {
      // Dynamic import with timestamp
      const module = await import(url);

      // If it's a React component, trigger re-render
      if (module.default?.$$typeof) {
        this.refreshReactComponent(modulePath, module.default);
      }
    } catch (error) {
      console.error(`Failed to hot update ${modulePath}:`, error);
      window.location.reload();
    }
  }

  private refreshReactComponent(modulePath: string, Component: any) {
    // Find all instances of this component in the tree
    // and trigger a re-render

    // This is a simplified version - real React Fast Refresh
    // uses the react-refresh runtime
    const event = new CustomEvent('hmr:component-update', {
      detail: { modulePath, Component }
    });
    window.dispatchEvent(event);
  }
}

// Initialize HMR client
if (import.meta.env.DEV) {
  new HMRClient(3000);
}
```

## CSS HMR (No Page Reload)

Update CSS without full page reload:

```typescript
// server.ts
const cssWatcher = Bun.file.watch("./src/**/*.css");

for await (const event of cssWatcher) {
  if (event.kind === "change") {
    const cssContent = await Bun.file(event.path).text();

    for (const client of clients) {
      client.send(JSON.stringify({
        type: "css-update",
        path: event.path,
        content: cssContent
      }));
    }
  }
}
```

```javascript
// Client-side CSS injection
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'css-update') {
    // Find or create style tag for this file
    let styleTag = document.querySelector(`style[data-path="${data.path}"]`);

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.setAttribute('data-path', data.path);
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = data.content;
    console.log(`✨ Updated CSS: ${data.path}`);
  }
};
```

## Module-Level HMR

For non-React modules (utilities, stores, etc.):

```typescript
// store.ts
let state = { count: 0 };

export function getState() {
  return state;
}

export function setState(newState: typeof state) {
  state = newState;
}

// HMR preservation
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log('Store updated');
    // Preserve state across updates
  });

  import.meta.hot.dispose((data) => {
    // Save state before reload
    data.state = state;
  });
}
```

## Smart File Watching

Only reload affected modules:

```typescript
// dependency-graph.ts
class DependencyGraph {
  private graph = new Map<string, Set<string>>();

  addDependency(parent: string, child: string) {
    if (!this.graph.has(parent)) {
      this.graph.set(parent, new Set());
    }
    this.graph.get(parent)!.add(child);
  }

  getAffectedModules(changedFile: string): Set<string> {
    const affected = new Set<string>();
    const queue = [changedFile];

    while (queue.length > 0) {
      const file = queue.shift()!;
      affected.add(file);

      // Find all modules that import this file
      for (const [parent, children] of this.graph) {
        if (children.has(file) && !affected.has(parent)) {
          queue.push(parent);
        }
      }
    }

    return affected;
  }
}

const graph = new DependencyGraph();

// Build graph from imports
const watcher = Bun.file.watch("./src");
for await (const event of watcher) {
  const affected = graph.getAffectedModules(event.path);

  for (const client of clients) {
    client.send(JSON.stringify({
      type: "update",
      modules: Array.from(affected)
    }));
  }
}
```

## Error Overlay

Display runtime errors in browser:

```typescript
// error-overlay.ts
export function showErrorOverlay(error: Error) {
  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 20px;
    font-family: monospace;
    z-index: 999999;
    overflow: auto;
  `;

  overlay.innerHTML = `
    <h1 style="color: #ff5555;">Runtime Error</h1>
    <pre style="color: #ffff55;">${error.message}</pre>
    <pre style="color: #888;">${error.stack}</pre>
    <button onclick="this.parentElement.remove()">Dismiss</button>
  `;

  document.body.appendChild(overlay);
}

// Listen for errors
window.addEventListener('error', (event) => {
  if (import.meta.env.DEV) {
    showErrorOverlay(event.error);
  }
});

// HMR success - remove overlay
window.addEventListener('hmr:success', () => {
  document.getElementById('error-overlay')?.remove();
});
```

## Vue 3 HMR

Hot Module Replacement for Vue components:

```typescript
// hmr-vue.ts
import { createApp } from 'vue';

let app = createApp(App);
app.mount('#app');

if (import.meta.hot) {
  import.meta.hot.accept('./App.vue', (newModule) => {
    app.unmount();
    app = createApp(newModule.default);
    app.mount('#app');
  });
}
```

## Svelte HMR

```typescript
// hmr-svelte.ts
import App from './App.svelte';

let app = new App({
  target: document.getElementById('app')!
});

if (import.meta.hot) {
  import.meta.hot.accept();

  import.meta.hot.dispose(() => {
    app.$destroy();
  });
}
```

## Server-Side Code Reload

Reload server-side code without dropping connections:

```typescript
// hot-server.ts
let requestHandler = (await import('./routes.ts')).default;

const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    return requestHandler(request);
  },
});

// Watch server code
const serverWatcher = Bun.file.watch("./routes.ts");
for await (const event of serverWatcher) {
  console.log('🔄 Reloading server code...');

  // Re-import with cache bust
  const newModule = await import(`./routes.ts?t=${Date.now()}`);
  requestHandler = newModule.default;

  console.log('✅ Server code reloaded');
}
```

## Production HMR Disable

Ensure HMR is disabled in production:

```typescript
// config.ts
export const HMR_ENABLED = process.env.NODE_ENV === 'development';

// server.ts
if (HMR_ENABLED) {
  setupHMR();
}
```

## Performance Optimization

Debounce file changes to avoid excessive reloads:

```typescript
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let timeout: Timer;

  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  }) as T;
}

const notifyClients = debounce((file: string) => {
  for (const client of clients) {
    client.send(JSON.stringify({ type: "reload", file }));
  }
}, 100);
```

## Resources

- [Bun HMR Documentation](https://bun.sh/docs/runtime/hot)
- [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [Vite HMR API](https://vitejs.dev/guide/api-hmr.html)
