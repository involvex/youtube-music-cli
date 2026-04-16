# Camera Preview

Live camera preview from HTML with capture, flash control, and video recording.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/camera-preview
npx cap sync
```

## Configuration

### Android

Add the camera permission to `android/app/src/main/AndroidManifest.xml` above the closing `</manifest>` tag:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Optionally set the ExifInterface version in `android/variables.gradle`:

```groovy
androidxExifInterfaceVersion = '1.3.6'
```

### iOS

Add the following keys to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for the camera preview.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is required for audio capture.</string>
```

`NSMicrophoneUsageDescription` is only required if audio is used. Set `disableAudio: true` to skip the microphone permission request.

## Usage

```typescript
import { CameraPreview } from '@capacitor-community/camera-preview';

// Start preview
await CameraPreview.start({
  position: 'rear',
  width: 1080,
  height: 1920,
  toBack: true,
});

// Capture a photo (returns base64 by default)
const result = await CameraPreview.capture({ quality: 85 });
const base64Data = result.value;

// Flip between front/rear camera (Android/iOS only)
await CameraPreview.flip();

// Record video (Android/iOS only)
await CameraPreview.startRecordVideo({ position: 'rear' });
const video = await CameraPreview.stopRecordVideo();

// Stop preview
await CameraPreview.stop();
```

## Notes

- When using `toBack: true`, make the `ion-content` background transparent so the preview is visible behind the webview.
- `captureSample()` captures a frame from the live video stream for real-time analysis (Android/iOS only; falls back to `capture` on web).
- Flash modes: `off`, `on`, `auto`, `red-eye` (Android only), `torch`.
- `storeToFile: true` returns a file path instead of base64 data.
- `setOpacity()` is Android-only and requires `enableOpacity: true` in the start options.
- Video output format is `.mp4`.
- Version 7 requires Capacitor 7.
