# Speech Synthesis

Synthesize speech from text (text-to-speech) with voice selection, pitch, rate, and volume control.

**Package:** `@capawesome-team/capacitor-speech-synthesis`
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
npm install @capawesome-team/capacitor-speech-synthesis
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

## Usage

### Speak text

```typescript
import { SpeechSynthesis, QueueStrategy } from '@capawesome-team/capacitor-speech-synthesis';

const { utteranceId } = await SpeechSynthesis.speak({
  language: 'en-US',
  pitch: 1.0,
  queueStrategy: QueueStrategy.Add,
  rate: 1.0,
  text: 'Hello, World!',
  volume: 1.0,
});

// Wait for the utterance to finish
await new Promise(resolve => {
  void SpeechSynthesis.addListener('end', event => {
    if (event.utteranceId === utteranceId) {
      resolve();
    }
  });
});
```

### Synthesize to file

```typescript
import { SpeechSynthesis, QueueStrategy } from '@capawesome-team/capacitor-speech-synthesis';

const { path, utteranceId } = await SpeechSynthesis.synthesizeToFile({
  language: 'en-US',
  text: 'Hello, World!',
  queueStrategy: QueueStrategy.Add,
});
// The file at `path` is available after the 'end' event fires.
```

### Pause, resume, and cancel

```typescript
import { SpeechSynthesis } from '@capawesome-team/capacitor-speech-synthesis';

await SpeechSynthesis.pause();
await SpeechSynthesis.resume();
await SpeechSynthesis.cancel();
```

### Get available voices and languages

```typescript
import { SpeechSynthesis } from '@capawesome-team/capacitor-speech-synthesis';

const { languages } = await SpeechSynthesis.getLanguages();
const { voices } = await SpeechSynthesis.getVoices();
// Each voice has: id, name, language, gender (iOS), isNetworkConnectionRequired
```

## Notes

- `speak()` options: `text`, `language` (BCP-47), `voiceId`, `pitch` (default 1.0), `rate` (default 1.0), `volume` (default 1.0), `queueStrategy` (`Add` or `Flush`), `audioSessionCategory` (iOS only).
- `synthesizeToFile()` is only available on Android and iOS.
- Events: `boundary`, `end`, `error`, `start`. Each event includes an `utteranceId`.
- `initialize()` can be called to warm up the engine before first use (Android/iOS).
- `isAvailable()`, `isLanguageAvailable()`, and `isVoiceAvailable()` check platform capabilities.
- Compatible with the Audio Player, Audio Recorder, and Speech Recognition plugins.
