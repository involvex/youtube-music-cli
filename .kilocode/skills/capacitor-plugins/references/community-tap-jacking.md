# Tap Jacking

Prevent tap jacking attacks by disabling touch events when the app is obscured by an overlay.

**Platforms:** Android

## Installation

```bash
npm install @capacitor-community/tap-jacking
npx cap sync
```

## Usage

```typescript
import { TapJacking } from '@capacitor-community/tap-jacking';

// Prevent overlays from intercepting touches
await TapJacking.preventOverlays();

// Re-enable overlays
await TapJacking.enableOverlays();
```

## Notes

- Uses `setFilterTouchesWhenObscured(true)` on Android 11 and below, and `setHideOverlayWindows` on Android 12+.
- On iOS and Web, all calls are no-ops.
- `preventOverlays()` blocks touch events when the app UI is obscured; `enableOverlays()` reverses it.
