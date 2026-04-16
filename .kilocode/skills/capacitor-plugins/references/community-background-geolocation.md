# Background Geolocation

Capacitor plugin for receiving geolocation updates even while the app is backgrounded.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/background-geolocation
npx cap sync
```

## Configuration

### iOS

Add the following keys to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need to track your location</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need to track your location while your device is locked.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

### Android

Set `android.useLegacyBridge` to `true` in your Capacitor configuration file (`capacitor.config.ts` or `capacitor.config.json`) to prevent location updates from halting after 5 minutes in the background.

On Android 13+, the app needs the `POST_NOTIFICATIONS` runtime permission to show the persistent background notification. Use `@capacitor/local-notifications` to request this permission.

Optionally customize the background notification in `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="capacitor_background_geolocation_notification_channel_name">
        Background Tracking
    </string>
    <string name="capacitor_background_geolocation_notification_icon">
        drawable/ic_tracking
    </string>
    <string name="capacitor_background_geolocation_notification_color">
        yellow
    </string>
</resources>
```

## Usage

```typescript
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

// Add a watcher for location updates
const watcherId = await BackgroundGeolocation.addWatcher(
  {
    backgroundMessage: 'Cancel to prevent battery drain.',
    backgroundTitle: 'Tracking You.',
    requestPermissions: true,
    stale: false,
    distanceFilter: 50,
  },
  (location, error) => {
    if (error) {
      if (error.code === 'NOT_AUTHORIZED') {
        BackgroundGeolocation.openSettings();
      }
      return console.error(error);
    }
    console.log(location);
  },
);

// Remove the watcher when no longer needed
BackgroundGeolocation.removeWatcher({ id: watcherId });
```

## Notes

- The plugin is registered via `registerPlugin()`, not imported as a class.
- If `backgroundMessage` is defined, the watcher provides location updates in both background and foreground. If omitted, updates are only guaranteed in the foreground.
- `stale: true` may deliver cached locations while the device obtains a GPS fix; check the `time` property on the location object.
- `distanceFilter` sets the minimum metres between location updates (default: `0`).
- Location object properties: `longitude`, `latitude`, `accuracy`, `altitude`, `altitudeAccuracy`, `bearing`, `simulated`, `speed`, `time`.
- On Android, after 5 minutes in the background, HTTP requests from the WebView are throttled. Use a native HTTP plugin (e.g., CapacitorHttp) for real-time server forwarding.
- The iOS status bar turns blue while location is being watched in the background.
