# Text to Speech

Capacitor community plugin for synthesizing speech from text.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/text-to-speech
npx cap sync
```

## Usage

```typescript
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Speak text
await TextToSpeech.speak({
  text: 'This is a sample text.',
  lang: 'en-US',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  category: 'ambient',
  queueStrategy: 1,
});

// Stop speaking
await TextToSpeech.stop();

// Get supported languages (BCP 47 tags)
const { languages } = await TextToSpeech.getSupportedLanguages();

// Get supported voices
const { voices } = await TextToSpeech.getSupportedVoices();

// Check if a language is supported
const { supported } = await TextToSpeech.isLanguageSupported({ lang: 'en-US' });

// Listen for word range events
await TextToSpeech.addListener('onRangeStart', (info) => {
  console.log(info.start, info.end, info.spokenWord);
});
```

## Notes

- `queueStrategy`: `0` (Flush) stops the current utterance when a new one is requested. `1` (Add) buffers requests and plays them sequentially.
- `category` option (`ambient` or `playback`) is iOS only. Use `playback` to play audio while the app is in the background.
- `openInstall()` is available on Android only to verify TTS resource file installation.
