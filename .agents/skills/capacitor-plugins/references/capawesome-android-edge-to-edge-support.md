# Android Edge-to-Edge Support

Support edge-to-edge display on Android with proper insets handling and configurable status bar / navigation bar background colors.

**Package:** `@capawesome/capacitor-android-edge-to-edge-support`
**Platforms:** Android

## Installation

```bash
npm install @capawesome/capacitor-android-edge-to-edge-support
npx cap sync
```

### Android

#### Disable Capacitor SystemBars insets handling

Disable the built-in insets handling of the Capacitor SystemBars plugin in `capacitor.config.json`:

```json
{
  "plugins": {
    "SystemBars": {
      "insetsHandling": "disable"
    }
  }
}
```

This is required because the SystemBars plugin's insets handling is always enabled by default and conflicts with this plugin.

#### Capacitor Keyboard Plugin

If using the Capacitor Keyboard plugin, set `resizeOnFullScreen` to `false` in `capacitor.config.json`:

```json
{
  "plugins": {
    "Keyboard": {
      "resizeOnFullScreen": false
    }
  }
}
```

## Configuration

In `capacitor.config.json`:

```json
{
  "plugins": {
    "EdgeToEdge": {
      "backgroundColor": "#ffffff",
      "navigationBarColor": "#000000",
      "statusBarColor": "#ffffff"
    }
  }
}
```

| Property             | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `backgroundColor`    | Hex color for both status bar and navigation bar           |
| `navigationBarColor` | Hex color for navigation bar area only                     |
| `statusBarColor`     | Hex color for status bar area only                         |

## Usage

### Enable/disable edge-to-edge

```typescript
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

await EdgeToEdge.enable();
await EdgeToEdge.disable();
```

### Get current insets

```typescript
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

const insets = await EdgeToEdge.getInsets();
console.log('Top:', insets.top, 'Bottom:', insets.bottom);
```

### Set background colors

```typescript
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

await EdgeToEdge.setBackgroundColor({ color: '#000000' });
await EdgeToEdge.setNavigationBarColor({ color: '#000000' });
await EdgeToEdge.setStatusBarColor({ color: '#ffffff' });
```

### Use with SystemBars plugin

```typescript
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';

await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
await EdgeToEdge.setBackgroundColor({ color: '#000000' });
```

## Notes

- Despite its name, this plugin does **not** enable edge-to-edge mode by default. It preserves traditional app behavior by applying proper insets to the webview.
- The plugin is partially compatible with Capacitor 8's SystemBars API (e.g., `setStyle()` works alongside this plugin).
- Android-only. On iOS, edge-to-edge is handled natively.
