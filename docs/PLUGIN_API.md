# Plugin API Reference

This document describes the complete API available to youtube-music-cli plugins.

## Plugin Structure

A plugin consists of:

- `plugin.json` - Manifest file with metadata and declarations
- `index.ts` - Main entry point exporting the plugin
- `README.md` - Documentation (optional but recommended)

### Manifest (plugin.json)

```json
{
	"id": "my-plugin",
	"name": "My Plugin",
	"version": "1.0.0",
	"description": "A description of what this plugin does",
	"author": "Your Name",
	"license": "MIT",
	"main": "index.ts",
	"permissions": ["player", "ui", "filesystem", "network", "config"],
	"hooks": ["play", "pause", "track-change", "view-change"],
	"ui": {
		"views": ["my-view"],
		"shortcuts": ["ctrl+shift+m"]
	}
}
```

## Plugin Context

When your plugin's `init()` function is called, it receives a `PluginContext` object with the following APIs:

### Player API

```typescript
context.player.play(track: Track): Promise<void>
context.player.pause(): void
context.player.resume(): void
context.player.stop(): void
context.player.next(): void
context.player.previous(): void
context.player.seek(position: number): void
context.player.setVolume(volume: number): void
context.player.getVolume(): number
context.player.getCurrentTrack(): Track | null
context.player.getQueue(): Track[]
context.player.addToQueue(track: Track): void
context.player.removeFromQueue(index: number): void
context.player.clearQueue(): void
context.player.shuffle(enabled: boolean): void
context.player.setRepeat(mode: 'off' | 'all' | 'one'): void
```

**Required Permission:** `player`

### Navigation API

```typescript
context.navigation.navigate(view: string): void
context.navigation.goBack(): void
context.navigation.getCurrentView(): string
context.navigation.registerView(viewId: string, component: ReactElement): void
context.navigation.unregisterView(viewId: string): void
```

**Required Permission:** `ui`

### Config API

```typescript
context.config.get<T>(key: string, defaultValue?: T): T
context.config.set(key: string, value: unknown): void
context.config.delete(key: string): void
context.config.getAll(): Record<string, unknown>
```

**Required Permission:** `config`

### Logger API

```typescript
context.logger.debug(message: string, ...args: unknown[]): void
context.logger.info(message: string, ...args: unknown[]): void
context.logger.warn(message: string, ...args: unknown[]): void
context.logger.error(message: string, ...args: unknown[]): void
```

**No permission required** - Always available

### Filesystem API

```typescript
context.filesystem.readFile(path: string): Promise<string>
context.filesystem.writeFile(path: string, data: string): Promise<void>
context.filesystem.deleteFile(path: string): Promise<void>
context.filesystem.exists(path: string): Promise<boolean>
context.filesystem.listFiles(path?: string): Promise<string[]>
context.filesystem.getDataDir(): string
```

**Required Permission:** `filesystem`

Note: All paths are relative to the plugin's data directory.

### Audio API

```typescript
context.audio.transformStreamUrl(url: string, track: Track): Promise<string> | string | null
context.audio.onStreamRequest(handler: (url, track) => Promise<string> | string | null): void
```

**Required Permission:** `player`

### Event System

```typescript
// Subscribe to events
context.on<T extends PluginEvent>(eventType: T['type'], handler: (event: T) => void): void

// Unsubscribe from events
context.off<T extends PluginEvent>(eventType: T['type'], handler: (event: T) => void): void

// Emit events (for plugin-to-plugin communication)
context.emit<T extends PluginEvent>(event: T): void
```

### Available Events

#### Player Events

- `play` - Fired when playback starts
- `pause` - Fired when playback is paused
- `stop` - Fired when playback stops
- `resume` - Fired when playback resumes
- `next` - Fired when skipping to next track
- `previous` - Fired when going to previous track
- `track-change` - Fired when the current track changes
- `volume-change` - Fired when volume changes
- `queue-change` - Fired when the queue is modified

#### Navigation Events

- `view-change` - Fired when the current view changes

#### Audio Stream Events

- `stream-request` - Fired when an audio stream URL is requested
- `stream-start` - Fired when audio playback starts
- `stream-end` - Fired when audio playback ends
- `stream-error` - Fired when an audio stream error occurs

### Permission System

```typescript
context.hasPermission(permission: PluginPermission): boolean
context.requestPermission(permission: PluginPermission): Promise<boolean>
```

### Keyboard Shortcuts

```typescript
context.registerShortcut(keys: string[], handler: () => void): void
context.unregisterShortcut(keys: string[]): void
```

**Required Permission:** `ui`

## Permissions

| Permission   | Description                                             |
| ------------ | ------------------------------------------------------- |
| `player`     | Control playback, access queue, intercept audio streams |
| `ui`         | Register views, add keyboard shortcuts                  |
| `filesystem` | Read/write files in plugin data directory               |
| `network`    | Make network requests                                   |
| `config`     | Read/write application configuration                    |

## Lifecycle Hooks

```typescript
const plugin: Plugin = {
	manifest,

	async init(context) {
		/* Setup */
	},
	async enable(context) {
		/* Start functionality */
	},
	async disable(context) {
		/* Stop functionality */
	},
	async destroy(context) {
		/* Final cleanup */
	},
};
```
