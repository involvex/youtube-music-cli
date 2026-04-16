# Speech Recognition

Transcribe speech into text (speech-to-text) with silence detection, contextual strings, and more.

**Package:** `@capawesome-team/capacitor-speech-recognition`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-speech-recognition
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>Speech recognition is used to transcribe speech into text.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone is used to record audio for speech recognition.</string>
```

## Usage

### Start and stop listening

```typescript
import { SpeechRecognition } from '@capawesome-team/capacitor-speech-recognition';

await SpeechRecognition.startListening({
  language: 'en-US',
  silenceThreshold: 2000,
});

await SpeechRecognition.stopListening();
```

### Listen for results

```typescript
import { SpeechRecognition } from '@capawesome-team/capacitor-speech-recognition';

SpeechRecognition.addListener('partialResult', (event) => {
  console.log('Partial result:', event.result);
});

SpeechRecognition.addListener('result', (event) => {
  console.log('Final result:', event.result);
});

SpeechRecognition.addListener('error', (event) => {
  console.error('Error:', event.message);
});
```

### Check and request permissions

```typescript
import { SpeechRecognition } from '@capawesome-team/capacitor-speech-recognition';

const { audioRecording, speechRecognition } = await SpeechRecognition.checkPermissions();

await SpeechRecognition.requestPermissions({
  permissions: ['audioRecording', 'speechRecognition'],
});
```

### Check availability and get languages

```typescript
import { SpeechRecognition } from '@capawesome-team/capacitor-speech-recognition';

const { isAvailable } = await SpeechRecognition.isAvailable();
const { isListening } = await SpeechRecognition.isListening();
const { languages } = await SpeechRecognition.getLanguages();
```

## Notes

- `startListening()` options include `language` (BCP-47 tag), `silenceThreshold` (ms), `contextualStrings` (Android SDK 33+, iOS), and `enableFormatting` (Android SDK 33+, iOS 16+).
- The `silenceThreshold` option may not work reliably on all devices due to platform limitations.
- `getLanguages()` is not supported on all Android devices; set a timeout for the promise.
- Events: `start`, `end`, `speechStart` (Android/Web), `speechEnd` (Android/Web), `partialResult`, `result`, `error`, `soundLevel` (Android/iOS).
- Compatible with the Audio Player, Audio Recorder, and Speech Synthesis plugins.
