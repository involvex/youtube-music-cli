# Video Recorder

Capacitor plugin to record video using the device camera.

**Package:** `@capacitor-community/video-recorder`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/video-recorder
npx cap sync
```

### Android

Add the JitPack repository to your project's `android/build.gradle` file under the `repositories` section:

```groovy
repositories {
  google()
  mavenCentral()
  maven {
    url "https://jitpack.io"
  }
}
```

## Usage

```typescript
import {
  VideoRecorder,
  VideoRecorderCamera,
  VideoRecorderPreviewFrame,
} from '@capacitor-community/video-recorder';

// Initialize camera preview
const config: VideoRecorderPreviewFrame = {
  id: 'video-record',
  stackPosition: 'back',
  width: 'fill',
  height: 'fill',
  x: 0,
  y: 0,
  borderRadius: 0,
};
await VideoRecorder.initialize({
  camera: VideoRecorderCamera.FRONT,
  previewFrames: [config],
});

// Start recording
await VideoRecorder.startRecording();

// Stop recording and get the file path
const res = await VideoRecorder.stopRecording();
console.log(res.videoUrl);

// Flip camera
await VideoRecorder.flipCamera();

// Destroy camera session
await VideoRecorder.destroy();
```

## Notes

- To overlay your web UI on top of the camera output, use `stackPosition: 'back'` and make all layers of your app transparent so the camera is visible under the webview.
- To make the webview transparent on iOS, set `backgroundColor: '#ff000000'` in `capacitor.config.ts`.
- Make the page background transparent in CSS: `ion-content { --background: transparent; }`.
- On Web, the plugin fakes camera behavior to allow for easier development.
- The Android implementation uses `triniwiz/FancyCamera`. The iOS implementation uses AVFoundation.
- Quality options: `MAX_480P`, `MAX_720P`, `MAX_1080P`, `MAX_2160P`, `HIGHEST`, `LOWEST`, `QVGA`.
- Default video bitrate is 4.5 Mbps.
