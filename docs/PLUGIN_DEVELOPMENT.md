# Plugin Development Guide

This guide walks you through creating plugins for youtube-music-cli.

## Getting Started

### Prerequisites

- Node.js 16+
- Bun (recommended) or npm
- Basic TypeScript knowledge

### Quick Start

1. **Create from template:**

   ```bash
   # Clone a template
   cp -r templates/plugin-basic my-plugin
   cd my-plugin

   # Edit plugin.json with your plugin info
   # Edit index.ts with your plugin logic
   ```

2. **Install locally for testing:**

   ```bash
   youtube-music-cli plugins install /path/to/my-plugin
   ```

3. **Enable the plugin:**
   ```bash
   youtube-music-cli plugins enable my-plugin
   ```

## Plugin Templates

We provide three templates to get you started:

### Basic Template

Location: `templates/plugin-basic/`

A minimal plugin that demonstrates:

- Event listening (play, pause, track-change)
- Using the logger API
- Lifecycle hooks

### UI Template

Location: `templates/plugin-ui/`

A plugin that adds UI functionality:

- Custom keyboard shortcuts
- View registration
- Navigation integration

### Audio Template

Location: `templates/plugin-audio/`

A plugin for audio stream processing:

- Stream URL interception
- Audio filtering/transformation
- Error handling

## Writing Your Plugin

### 1. Create the Manifest (plugin.json)

```json
{
	"id": "my-awesome-plugin",
	"name": "My Awesome Plugin",
	"version": "1.0.0",
	"description": "Does awesome things",
	"author": "Your Name",
	"main": "index.ts",
	"permissions": ["player"],
	"hooks": ["track-change"]
}
```

**Important fields:**

- `id`: Unique identifier (lowercase, hyphens allowed)
- `permissions`: Only request what you need
- `hooks`: Declare which events you'll listen to

### 2. Write the Plugin Code (index.ts)

```typescript
import type {Plugin, PluginManifest, PluginContext} from 'youtube-music-cli';

const manifest: PluginManifest = {
	// ... same as plugin.json
};

const plugin: Plugin = {
	manifest,

	async init(context) {
		// Called once when plugin is loaded
		context.logger.info('Plugin loaded!');

		// Register event handlers
		context.on('track-change', event => {
			// Do something when track changes
			context.logger.info('Now playing:', event.track?.title);
		});
	},

	async enable(context) {
		// Called when plugin is enabled
		context.logger.info('Plugin enabled');
	},

	async disable(context) {
		// Called when plugin is disabled
		// Clean up resources here
	},

	async destroy(context) {
		// Called when plugin is unloaded
		// Final cleanup
	},
};

export default plugin;
export {manifest};
```

### 3. Test Your Plugin

```bash
# Install locally
youtube-music-cli plugins install /path/to/my-plugin

# List plugins to verify
youtube-music-cli plugins list

# Enable it
youtube-music-cli plugins enable my-awesome-plugin

# Run the app to test
youtube-music-cli
```

## Best Practices

### 1. Request Minimal Permissions

Only request permissions you actually need. Users are more likely to trust plugins with fewer permissions.

### 2. Handle Errors Gracefully

Wrap your code in try-catch blocks to prevent crashing the main app:

```typescript
context.on('track-change', async event => {
	try {
		await doSomething(event.track);
	} catch (error) {
		context.logger.error('Failed:', error);
	}
});
```

### 3. Clean Up in disable/destroy

Always unregister shortcuts and clean up resources:

```typescript
async disable(context) {
  context.unregisterShortcut(['ctrl+shift+m']);
  // Cancel any pending operations
}
```

### 4. Use the Logger

Use `context.logger` instead of `console.log` for proper log formatting and filtering.

### 5. Store Data Properly

Use `context.filesystem` for persistent data:

```typescript
// Save data
await context.filesystem.writeFile('cache.json', JSON.stringify(data));

// Load data
const data = JSON.parse(await context.filesystem.readFile('cache.json'));
```

### 6. Use Config for Settings

Store user-configurable settings with `context.config`:

```typescript
// Read setting with default
const enabled = context.config.get('notifications', true);

// Save setting
context.config.set('notifications', false);
```

## Publishing Your Plugin

### Option 1: GitHub Repository

1. Create a GitHub repo for your plugin
2. Users install with:
   ```bash
   youtube-music-cli plugins install https://github.com/you/my-plugin
   ```

### Option 2: Default Plugin Repository

1. Fork https://github.com/involvex/youtube-music-cli-plugins
2. Add your plugin to the `plugins/` directory
3. Submit a pull request
4. Once merged, users can install with:
   ```bash
   youtube-music-cli plugins install my-plugin
   ```

## Debugging

### Enable Debug Logging

Set the `DEBUG` environment variable:

```bash
DEBUG=* youtube-music-cli
```

### Check Plugin Logs

Plugin logs are prefixed with the plugin name:

```
[My Plugin] Plugin loaded!
[My Plugin] Now playing: Song Title
```

### Common Issues

**Plugin not loading:**

- Check `plugin.json` syntax
- Verify `main` points to correct file
- Check for TypeScript errors

**Permission denied:**

- Ensure permission is declared in manifest
- Check if user granted permission

**Events not firing:**

- Verify hook is declared in manifest
- Check event type spelling
- Ensure plugin is enabled

## Examples

### Now Playing Notifications

```typescript
async init(context) {
  context.on('track-change', (event) => {
    if (event.track) {
      // Show system notification
      showNotification(event.track.title, event.track.artists[0]?.name);
    }
  });
}
```

### Custom Keyboard Shortcut

```typescript
async init(context) {
  context.registerShortcut(['ctrl+l'], () => {
    const track = context.player.getCurrentTrack();
    if (track) {
      // Open lyrics view
      context.navigation.navigate('lyrics');
    }
  });
}
```

### Audio Stream Filter (Adblock)

```typescript
async init(context) {
  const blocklist = ['known-ad-id-1', 'known-ad-id-2'];

  context.audio.onStreamRequest(async (url, track) => {
    if (blocklist.includes(track.videoId)) {
      context.logger.info('Blocked ad:', track.title);
      return null; // Skip this track
    }
    return url; // Allow playback
  });
}
```

## Need Help?

- Check the [Plugin API Reference](./PLUGIN_API.md)
- Open an issue on GitHub
- Join our Discord community
