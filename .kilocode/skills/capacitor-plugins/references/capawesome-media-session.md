# Media Session

Capacitor plugin to interact with media controllers, volume keys, and media buttons. Display metadata on lock screen and notification controls.

**Package:** `@capawesome-team/capacitor-media-session`

**Platforms:** Android, iOS, Web

**Availability:** [Capawesome Insiders](https://capawesome.io/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install:

```bash
npm install @capawesome-team/capacitor-media-session
npx cap sync
```

### Android

#### Variables

Optional variable in `android/app/variables.gradle`:

- `$androidMediaVersion` version of `androidx.media:media` (default: `1.7.1`)

## Configuration

| Prop        | Type     | Description                                                                 | Default           |
| ----------- | -------- | --------------------------------------------------------------------------- | ----------------- |
| `smallIcon` | `string` | Drawable resource name for notification icon (Android only, no prefix/ext). | `"ic_media_play"` |

In `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  plugins: {
    MediaSession: {
      smallIcon: 'ic_notification',
    },
  },
};
```

For a custom icon, add it to `android/app/src/main/res/drawable/` (single-color white with transparent background).

## Usage

### Set Metadata

```typescript
import { MediaSession } from '@capawesome-team/capacitor-media-session';

await MediaSession.setMetadata({
  title: 'Test Song',
  artist: 'My Awesome Artist',
  album: 'My Awesome Album',
  artwork: [
    { src: 'https://example.com/cover-512x512.png', sizes: '512x512', type: 'image/png' },
  ],
});
```

### Register Action Handlers and Listen for Actions

```typescript
import { MediaSession, MediaSessionAction, MediaSessionPlaybackState } from '@capawesome-team/capacitor-media-session';

await MediaSession.registerActionHandler({ action: MediaSessionAction.Play });
await MediaSession.registerActionHandler({ action: MediaSessionAction.Pause });
await MediaSession.registerActionHandler({ action: MediaSessionAction.SeekTo });
await MediaSession.registerActionHandler({ action: MediaSessionAction.Stop });

MediaSession.addListener('action', async (event) => {
  switch (event.action) {
    case MediaSessionAction.Play:
      await MediaSession.setPlaybackState({
        playbackState: MediaSessionPlaybackState.Playing,
      });
      break;
    case MediaSessionAction.Pause:
      await MediaSession.setPlaybackState({
        playbackState: MediaSessionPlaybackState.Paused,
      });
      break;
  }
});
```

### Set Position State

```typescript
await MediaSession.setPositionState({
  duration: 180,
  playbackRate: 1.0,
  position: 30,
});
```

## Key Methods

- `setMetadata()`: Set title, artist, album, and artwork.
- `registerActionHandler()` / `unregisterActionHandler()`: Register/unregister media action handlers.
- `setPlaybackState()`: Set state to `None`, `Paused`, or `Playing`.
- `setPositionState()`: Set duration, playback rate, and current position (in seconds).
- `addListener('action', ...)`: Listen for media action events (play, pause, seek, stop, etc.).

## Notes

- Artwork is only available on iOS and Web.
- Actions like `SkipAd`, `ToggleMicrophone`, `ToggleCamera`, `HangUp`, etc. are Web only.
- Uses MediaSession API on Android and MPNowPlayingInfoCenter on iOS.
- Always unregister action handlers when no longer needed.
