# Native Audio

Capacitor plugin for playing sounds natively.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/native-audio
npx cap sync
```

## Configuration

Audio files must be placed in platform-specific folders:

- **Android:** `android/app/src/assets`
- **iOS:** `ios/App/App/sounds`
- **Web:** `assets/sounds`

## Usage

```typescript
import { NativeAudio } from '@capacitor-community/native-audio';

// Preload an audio file
await NativeAudio.preload({
  assetId: 'fire',
  assetPath: 'fire.mp3',
  audioChannelNum: 1,
  isUrl: false,
});

// Play
await NativeAudio.play({ assetId: 'fire' });

// Play with seek (start at 6 seconds)
await NativeAudio.play({ assetId: 'fire', time: 6.0 });

// Loop
await NativeAudio.loop({ assetId: 'fire' });

// Pause / Resume
await NativeAudio.pause({ assetId: 'fire' });
await NativeAudio.resume({ assetId: 'fire' });

// Set volume (0.1 - 1.0)
await NativeAudio.setVolume({ assetId: 'fire', volume: 0.4 });

// Get duration and current time (only works if audioChannelNum == 1)
const { duration } = await NativeAudio.getDuration({ assetId: 'fire' });
const { currentTime } = await NativeAudio.getCurrentTime({ assetId: 'fire' });

// Check if playing
const { isPlaying } = await NativeAudio.isPlaying({ assetId: 'fire' });

// Stop and unload
await NativeAudio.stop({ assetId: 'fire' });
await NativeAudio.unload({ assetId: 'fire' });

// Listen for playback completion
await NativeAudio.addListener('complete', (event) => {
  console.log(`Asset ${event.assetId} finished playing`);
});
```

## Notes

- `configure()` supports `fade` (enable audio fade) and `focus` (disable mixed audio) options. Not available on Web.
- `getDuration()` and `getCurrentTime()` only work when `audioChannelNum` is set to `1`.
- `assetPath` can be a relative path to the platform asset folder or an absolute `file://` URL (set `isUrl: true`).
- The `complete` event fires when an asset finishes playing.
