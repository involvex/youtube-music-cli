# Audio Player

Capacitor plugin to play audio with background support.

**Package:** `@capawesome-team/capacitor-audio-player`

**Platforms:** Android, iOS, Web

**Availability:** [Capawesome Insiders](https://capawesome.io/sponsors/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install the package:

```bash
npm install @capawesome-team/capacitor-audio-player
npx cap sync
```

## Configuration

### iOS

#### Background Audio

To play audio in the background, enable `Background Modes` capability with `Audio, AirPlay, and Picture in Picture` in the Xcode project.

## Usage

### Play audio from a web asset

```typescript
import { AudioPlayer } from '@capawesome-team/capacitor-audio-player';

await AudioPlayer.play({
  src: '/assets/audio.mp3',
  loop: false,
  volume: 100,
  position: 0
});
```

### Play audio from a native file

```typescript
import { AudioPlayer } from '@capawesome-team/capacitor-audio-player';
import { Filesystem, Directory } from '@capacitor/filesystem';

const { uri } = await Filesystem.getUri({
  directory: Directory.Documents,
  path: 'audio.mp3',
});
await AudioPlayer.play({ uri, loop: false, volume: 100, position: 0 });
```

### Playback controls

```typescript
await AudioPlayer.pause();
await AudioPlayer.resume();
await AudioPlayer.stop();
await AudioPlayer.seekTo({ position: 30_000 }); // 30 seconds
await AudioPlayer.setVolume({ volume: 50 });
await AudioPlayer.setRate({ rate: 1.5 }); // Android SDK 23+, iOS, Web

const { position } = await AudioPlayer.getCurrentPosition();
const { duration } = await AudioPlayer.getDuration();
const { isPlaying } = await AudioPlayer.isPlaying();
```

### Listen for stop event

```typescript
await AudioPlayer.addListener('stop', () => {
  console.log('Audio stopped');
});
```

## Notes

- `src` supports web asset paths and remote URLs on all platforms.
- `uri` supports native file paths (Android and iOS only).
- `blob` is only available on Web.
- Priority: `blob` > `uri` > `src`.
- Volume range is 0-100 (default: 100).
- Playback rate range 0.5-2.0 recommended (available on Android SDK 23+, iOS, Web).
- When calling `play()` shortly after `stop()`, pass `{ deactivateAudioSession: false }` to `stop()` to avoid `CoreMediaErrorDomain -16042` errors on iOS.
