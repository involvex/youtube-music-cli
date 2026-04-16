# Volume Buttons

Listen to hardware volume button presses.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/volume-buttons
npx cap sync
```

## Usage

```typescript
import { VolumeButtons } from '@capacitor-community/volume-buttons';

// Start watching volume button presses
await VolumeButtons.watchVolume(
  {
    disableSystemVolumeHandler: true, // iOS: prevent system volume change
    suppressVolumeIndicator: true,    // Android: hide volume indicator
  },
  (result, err) => {
    console.log(result.direction); // 'up' or 'down'
  },
);

// Check if currently watching
const { value } = await VolumeButtons.isWatching();

// Stop watching
await VolumeButtons.clearWatch();
```

## Notes

- `disableSystemVolumeHandler` (iOS only): When `true`, the system volume is reset to its initial level on each button press, so events keep firing even at min/max volume.
- `suppressVolumeIndicator` (Android only): When `true`, the system volume UI overlay is hidden on button press.
- The watcher continues to receive events after the app returns from the background.
- Version 8.x is compatible with Capacitor 8; version 7.x with Capacitor 7; version 6.x with Capacitor 6; version 1.x with Capacitor 5.
