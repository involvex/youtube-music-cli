# RealtimeKit

Unofficial Capacitor plugin for using the Cloudflare RealtimeKit SDK for video/audio meetings with a built-in UI.

**Package:** `@capawesome/capacitor-realtimekit`
**Platforms:** Android, iOS
**Capawesome Insiders:** No

## Installation

```bash
npm install @capawesome/capacitor-realtimekit
npx cap sync
```

### Android

Requires Android SDK 24+.

#### Variables

Defined in `android/variables.gradle`:

- `$realtimekitUiVersion` version of `com.cloudflare.realtimekit:ui-android` (default: `0.3.1`)

### iOS

#### Privacy Descriptions

Add the following keys to `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothPeripheralUsageDescription</key>
<string>We will use your Bluetooth to access your Bluetooth headphones.</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>We will use your Bluetooth to access your Bluetooth headphones.</string>
<key>NSCameraUsageDescription</key>
<string>For people to see you during meetings, we need access to your camera.</string>
<key>NSMicrophoneUsageDescription</key>
<string>For people to hear you during meetings, we need access to your microphone.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>For people to share, we need access to your photos.</string>
```

Add background modes to `ios/App/App/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>voip</string>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

## Usage

### Initialize and start a meeting

```typescript
import { RealtimeKit } from '@capawesome/capacitor-realtimekit';

await RealtimeKit.initialize();

await RealtimeKit.startMeeting({
  authToken: 'YOUR_AUTH_TOKEN',
  enableAudio: true,
  enableVideo: true,
});
```

## Notes

- `initialize()` must be called before any other method.
- `startMeeting()` launches the built-in meeting UI and is only available on Android and iOS.
- `enableAudio` and `enableVideo` both default to `true`.
- This project is not affiliated with Cloudflare, Inc.
