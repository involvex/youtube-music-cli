# Screen Brightness

Control screen brightness on iOS and Android devices.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/screen-brightness
npx cap sync
```

## Usage

```typescript
import { ScreenBrightness } from '@capacitor-community/screen-brightness';

// Set brightness (0.0 = very dim, 1.0 = full brightness)
await ScreenBrightness.setBrightness({ brightness: 0.5 });

// Get current brightness
const { brightness } = await ScreenBrightness.getBrightness();
```

## Notes

- Brightness values range from `0.0` (very dim) to `1.0` (full brightness).
- On Android, setting brightness to `-1` restores the user-configured brightness.
- On Android, `getBrightness()` returns `-1` if the brightness has not been changed by the app.
- On iOS, `setBrightness()` sets the system-level brightness. On Android, it sets the brightness for the current view only.
- No configuration required.
