# Speech Recognition

Capacitor community plugin for speech recognition.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/speech-recognition
npx cap sync
```

## Configuration

### iOS

Add the following usage descriptions to `ios/App/App/Info.plist`:

```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>Speech recognition is used to convert your voice to text.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is required for speech recognition.</string>
```

### Android

No additional configuration required.

## Usage

```typescript
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// Check availability
const { available } = await SpeechRecognition.available();

// Request permissions
await SpeechRecognition.requestPermissions();

// Start listening
SpeechRecognition.start({
  language: 'en-US',
  maxResults: 5,
  prompt: 'Say something',
  partialResults: true,
  popup: true,
});

// Listen for partial results
SpeechRecognition.addListener('partialResults', (data) => {
  console.log('Partial results:', data.matches);
});

// Listen for state changes
SpeechRecognition.addListener('listeningState', (data) => {
  console.log('Listening state:', data.status); // 'started' or 'stopped'
});

// Stop listening
await SpeechRecognition.stop();

// Check if currently listening
const { listening } = await SpeechRecognition.isListening();

// Get supported languages
const { languages } = await SpeechRecognition.getSupportedLanguages();

// Remove all listeners
await SpeechRecognition.removeAllListeners();
```

## Notes

- `popup` option (Android only) shows a system dialog while listening. When `popup` is `true`, `partialResults` events do not fire on Android.
- `prompt` option (Android only) sets the message displayed on the popup dialog.
- `maxResults` accepts up to 5.
- `getSupportedLanguages()` is not available on Android 13+.
- On Android, permission checks use `RECORD_AUDIO`. On iOS, both speech recognition and microphone permissions are requested.
