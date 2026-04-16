# Android Battery Optimization

Manage battery optimization settings, request exemptions, and enhance app performance under Doze and App Standby modes.

**Package:** `@capawesome-team/capacitor-android-battery-optimization`
**Platforms:** Android

## Installation

```bash
npm install @capawesome-team/capacitor-android-battery-optimization
npx cap sync
```

### Android

To request direct exemption from battery optimization, add to `android/app/src/main/AndroidManifest.xml` before the `application` tag:

```xml
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

**Warning:** Google Play policies prohibit apps from requesting direct exemption from Power Management features in Android 6.0+ (Doze and App Standby) unless the core function of the app is adversely affected.

## Usage

### Check if battery optimization is enabled

```typescript
import { Capacitor } from '@capacitor/core';
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';

const isBatteryOptimizationEnabled = async () => {
  if (Capacitor.getPlatform() !== 'android') {
    return false;
  }
  const { enabled } = await BatteryOptimization.isBatteryOptimizationEnabled();
  return enabled;
};
```

### Open battery optimization settings

```typescript
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';

await BatteryOptimization.openBatteryOptimizationSettings();
```

### Request ignore battery optimization

```typescript
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';

await BatteryOptimization.requestIgnoreBatteryOptimization();
```

## Notes

- This plugin is Android-only. Guard calls with `Capacitor.getPlatform() === 'android'`.
- `requestIgnoreBatteryOptimization()` requires the `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission in the manifest.
- Only use `requestIgnoreBatteryOptimization()` if your app meets an acceptable use case per Google Play policy.
