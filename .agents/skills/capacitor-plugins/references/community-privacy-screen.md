# Privacy Screen

Protect app content from appearing in screenshots and the app switcher/recents screen.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/privacy-screen
npx cap sync
```

## Configuration

Configuration is optional. The plugin is enabled by default.

In `capacitor.config.json`:

```json
{
  "plugins": {
    "PrivacyScreen": {
      "enable": true,
      "imageName": "Splashscreen",
      "contentMode": "scaleAspectFit",
      "preventScreenshots": false
    }
  }
}
```

| Option               | Type    | Default    | Description                                                        | Platform |
| -------------------- | ------- | ---------- | ------------------------------------------------------------------ | -------- |
| `enable`             | boolean | `true`     | Enable privacy screen on startup.                                  | Both     |
| `imageName`          | string  | `""`       | Custom image from assets to display instead of a gray background.  | iOS      |
| `contentMode`        | string  | `"center"` | Content mode: `center`, `scaleToFill`, `scaleAspectFit`, `scaleAspectFill`. | iOS |
| `preventScreenshots` | boolean | `true`     | Prevent screenshots when enabled.                                  | iOS      |

## Usage

```typescript
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

await PrivacyScreen.enable();
await PrivacyScreen.disable();

// Listen for screen recording and screenshot events (iOS only)
PrivacyScreen.addListener('screenRecordingStarted', () => {});
PrivacyScreen.addListener('screenRecordingStopped', () => {});
PrivacyScreen.addListener('screenshotTaken', () => {});
```

## Notes

- On Android, sets `FLAG_SECURE` to prevent screenshots and display in recents.
- On iOS, hides the webview when the app loses focus and prevents screenshots (captures a black screen).
- Disabling screenshots can interfere with plugins that hide the WebView (e.g., Camera plugin). Call `disable()` before using such plugins and `enable()` afterward.
- This plugin is in **maintenance mode**. Consider using the official Capacitor Privacy Screen plugin (available since Capacitor 7) for new projects.
