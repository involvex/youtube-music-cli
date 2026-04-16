# Torch

Switch the device flashlight on and off.

**Package:** `@capawesome/capacitor-torch`
**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capawesome/capacitor-torch
npx cap sync
```

## Configuration

### Android

#### Permissions

Add to `android/app/src/main/AndroidManifest.xml` before the `<application>` tag:

```xml
<uses-permission android:name="android.permission.FLASHLIGHT"/>
```

## Usage

### Enable, disable, and toggle

```typescript
import { Torch } from '@capawesome/capacitor-torch';

await Torch.enable();
await Torch.disable();
await Torch.toggle();
```

### Check availability and status

```typescript
import { Torch } from '@capawesome/capacitor-torch';

const { available } = await Torch.isAvailable();
const { enabled } = await Torch.isEnabled();
```

## Notes

- On Web, the torch is controlled via the MediaStream API. Methods accept an optional `stream` parameter with a video track whose facing mode corresponds to the torch.
- `enable()`, `disable()`, and `toggle()` require Android SDK 23+.
- The `$androidxCameraCoreVersion` variable in `variables.gradle` can override the default `androidx.camera:camera-core` version (default: `1.5.2`).
