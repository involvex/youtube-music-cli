# Badge

Capacitor plugin to access and update the badge number of the app icon.

**Package:** `@capawesome/capacitor-badge`

**Platforms:** Android, iOS, Web (PWA)

## Installation

```bash
npm install @capawesome/capacitor-badge
npx cap sync
```

## Configuration

### Android

#### Variables

Optionally define in `variables.gradle`:

- `$shortcutBadgerVersion` version of `me.leolin:ShortcutBadger` (default: `1.1.22`)

### iOS

#### Privacy Manifest

Add the `NSPrivacyAccessedAPICategoryUserDefaults` dictionary key to `ios/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
      <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
          <string>CA92.1</string>
        </array>
      </dict>
    </array>
  </dict>
</plist>
```

### Plugin Configuration

In `capacitor.config.json`:

```json
{
  "plugins": {
    "Badge": {
      "persist": true,
      "autoClear": false
    }
  }
}
```

- `persist` (default: `true`): Restore the counter after reboot or app restart (Android and iOS).
- `autoClear` (default: `false`): Reset the counter when resuming the app. On iOS, this also clears all notifications (Android and iOS).

## Usage

```typescript
import { Badge } from '@capawesome/capacitor-badge';

const { count } = await Badge.get();
await Badge.set({ count: 5 });
await Badge.increase();
await Badge.decrease();
await Badge.clear();

const { isSupported } = await Badge.isSupported();
await Badge.checkPermissions();
await Badge.requestPermissions();
```

## Notes

- On Android, not all launchers support badges. Uses [ShortcutBadger](https://github.com/leolin310148/ShortcutBadger) under the hood.
- On iOS, calling `clear()` or setting count to `0` will remove the badge and clear all notifications.
- On Web, the app must run as an installed PWA (in the taskbar or dock).
