# App Update

Retrieve app update information and perform in-app updates on Android. Check for available updates on iOS.

**Package:** `@capawesome/capacitor-app-update`
**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-app-update
npx cap sync
```

### Android

#### Variables

Optionally define in `android/variables.gradle`:

- `$androidPlayAppUpdateVersion` version of `com.google.android.play:app-update` (default: `2.1.0`)
- `$androidPlayServicesBaseVersion` version of `com.google.android.gms:play-services-base` (default: `18.9.0`)

## Usage

### Get app update info

```typescript
import { Capacitor } from '@capacitor/core';
import { AppUpdate } from '@capawesome/capacitor-app-update';

const result = await AppUpdate.getAppUpdateInfo();
if (Capacitor.getPlatform() === 'android') {
  console.log('Current version code:', result.currentVersionCode);
  console.log('Available version code:', result.availableVersionCode);
} else {
  console.log('Current version:', result.currentVersionName);
  console.log('Available version:', result.availableVersionName);
}
```

### Open the app store

```typescript
import { AppUpdate } from '@capawesome/capacitor-app-update';

await AppUpdate.openAppStore();

// With options:
await AppUpdate.openAppStore({
  androidPackageName: 'com.example.app',  // Android only
  appId: '123456789',                      // iOS only
});
```

### Perform an immediate update (Android only)

```typescript
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';

const info = await AppUpdate.getAppUpdateInfo();
if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE && info.immediateUpdateAllowed) {
  await AppUpdate.performImmediateUpdate();
}
```

### Flexible update flow (Android only)

```typescript
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';

const info = await AppUpdate.getAppUpdateInfo();
if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE && info.flexibleUpdateAllowed) {
  await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
    console.log('Install status:', state.installStatus);
    console.log('Bytes downloaded:', state.bytesDownloaded);
  });

  await AppUpdate.startFlexibleUpdate();

  // After download completes, restart to install:
  await AppUpdate.completeFlexibleUpdate();
}
```

## Notes

- On iOS, `getAppUpdateInfo()` accepts a `country` option (ISO 3166-1 alpha-2 code) to search a specific App Store region.
- `AppUpdateAvailability` values: `UNKNOWN` (0), `UPDATE_NOT_AVAILABLE` (1), `UPDATE_AVAILABLE` (2), `UPDATE_IN_PROGRESS` (3).
- In-app updates (immediate and flexible) are Android-only features using Google Play's in-app update API.
- `availableVersionName` is iOS-only. `availableVersionCode` is Android-only.
- For testing on Android, use internal app sharing: https://developer.android.com/guide/playcore/in-app-updates/test
