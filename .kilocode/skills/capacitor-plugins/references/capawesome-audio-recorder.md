# Audio Recorder

Capacitor plugin for audio recording using the device's microphone.

**Package:** `@capawesome-team/capacitor-audio-recorder`

**Platforms:** Android, iOS, Web

**Availability:** [Capawesome Insiders](https://capawesome.io/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install the package:

```bash
npm install @capawesome-team/capacitor-audio-recorder
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Background Audio

To record audio in the background, enable `Background Modes` capability with `Audio, AirPlay, and Picture in Picture` in the Xcode project.

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio.</string>
```

## Usage

### Start and stop recording

```typescript
import { AudioRecorder } from '@capawesome-team/capacitor-audio-recorder';

await AudioRecorder.startRecording({
  bitRate: 192000,
  sampleRate: 44100
});

const { blob, uri, duration } = await AudioRecorder.stopRecording();
// blob is available on Web, uri on Android/iOS
```

### Pause and resume recording

```typescript
await AudioRecorder.pauseRecording();  // Android SDK 24+, iOS, Web
await AudioRecorder.resumeRecording(); // Android SDK 24+, iOS, Web
```

### Cancel recording

```typescript
await AudioRecorder.cancelRecording();
```

### Check recording status

```typescript
const { status } = await AudioRecorder.getRecordingStatus();
// status: 'INACTIVE' | 'RECORDING' | 'PAUSED'
```

### Permissions

```typescript
const { recordAudio } = await AudioRecorder.checkPermissions();
const { recordAudio } = await AudioRecorder.requestPermissions();
```

### Event listeners

```typescript
await AudioRecorder.addListener('recordingError', (event) => {
  console.error('Recording error:', event.message);
});

await AudioRecorder.addListener('recordingStopped', (event) => {
  console.log('Recording stopped:', event.uri);
});
```

## Notes

- Records audio in AAC format.
- `bitRate` default is 192000 bytes/s (Android and iOS only).
- `sampleRate` default is 44100 Hz (Android and iOS only).
- iOS-specific options: `audioSessionMode` and `audioSessionCategoryOptions` for fine-grained audio session control.
- The `recordingError` event is only available on iOS.
