# Safe Area

Capacitor plugin that provides safe area inset support, acting as a polyfill for older Android Chromium webview versions where `env(safe-area-inset-*)` CSS variables report incorrect values.

**Package:** `@capacitor-community/safe-area`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/safe-area
npx cap sync
```

## Configuration

### Android

Enable native edge-to-edge mode in `android/app/src/main/java/.../MainActivity.java`:

```java
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.activity.EdgeToEdge;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
    }
}
```

For Capacitor v8, add the following to `capacitor.config.json`:

```json
{
  "plugins": {
    "SystemBars": {
      "insetsHandling": "disable"
    }
  }
}
```

### Plugin Configuration

Optional configuration in `capacitor.config.json`:

```json
{
  "plugins": {
    "SafeArea": {
      "statusBarStyle": "DEFAULT",
      "navigationBarStyle": "DEFAULT",
      "detectViewportFitCoverChanges": true,
      "initialViewportFitCover": true
    }
  }
}
```

- `statusBarStyle`: Initial style for the status bar (`DARK`, `LIGHT`, `DEFAULT`).
- `navigationBarStyle`: Initial style for the navigation bar.
- `detectViewportFitCoverChanges`: Whether to detect changes to `viewport-fit=cover` (Android only, default: `true`).
- `initialViewportFitCover`: Initial value for viewport-fit-cover detection (Android only, default: `true`).

## Usage

The plugin activates automatically once installed. It also provides a System Bars API for styling:

```typescript
import { SafeArea, SystemBarsStyle, SystemBarsType } from '@capacitor-community/safe-area';

// Set system bars style
await SafeArea.setSystemBarsStyle({
  style: SystemBarsStyle.Dark,
  type: SystemBarsType.StatusBar,
});

// Hide system bars
await SafeArea.hideSystemBars({
  type: SystemBarsType.NavigationBar,
});

// Show system bars
await SafeArea.showSystemBars({
  type: null, // both bars
});
```

## Notes

- The plugin is a polyfill for Android Chromium versions < 140, which incorrectly report `env(safe-area-inset-*)` as `0px`. For those versions, the plugin applies safe area as a padding to the webview.
- On web and iOS, `env(safe-area-inset-*)` works correctly out of the box; the plugin mainly targets Android.
- You must set `<meta name="viewport" content="viewport-fit=cover" />` in your HTML for safe area insets to work on any platform.
- Uninstall `@capacitor/status-bar` if present; use this plugin's System Bars API instead.
- If using `@capacitor/keyboard`, omit or set `resizeOnFullScreen` to `false` to avoid conflicts.
- Remove `windowOptOutEdgeToEdgeEnforcement` from `AndroidManifest.xml` if present.
- Remove any other safe area plugins (e.g., `capacitor-plugin-safe-area`, `@aashu-dubey/capacitor-statusbar-safe-area`) to prevent conflicts.
