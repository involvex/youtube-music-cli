# Keep Awake

Prevent devices from dimming or locking the screen.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/keep-awake
npx cap sync
```

## Usage

```typescript
import { KeepAwake } from '@capacitor-community/keep-awake';

await KeepAwake.keepAwake();
await KeepAwake.allowSleep();

const { isSupported } = await KeepAwake.isSupported();
const { isKeptAwake } = await KeepAwake.isKeptAwake();
```

## Notes

- `keepAwake()` prevents the device from dimming the screen; `allowSleep()` reverses it.
- `isSupported()` checks whether keep-awake is supported on the current platform.
- `isKeptAwake()` checks whether the screen is currently being kept awake.
- No configuration required.
