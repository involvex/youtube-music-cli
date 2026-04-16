# Pedometer

Capacitor plugin to retrieve motion data such as step count, distance, pace, cadence, and floor counting.

**Package:** `@capawesome-team/capacitor-pedometer`
**Platforms:** Android, iOS
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-pedometer
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSMotionUsageDescription</key>
<string>The app needs to access the motion activity.</string>
```

## Usage

### Get a measurement

```typescript
import { Pedometer } from '@capawesome-team/capacitor-pedometer';

const { measurement } = await Pedometer.getMeasurement();
console.log('Steps:', measurement.numberOfSteps);
```

On iOS, you must provide `start` and `end` timestamps:

```typescript
const result = await Pedometer.getMeasurement({
  start: Date.now() - 86400000, // 24 hours ago
  end: Date.now(),
});
```

### Real-time measurement updates

```typescript
import { Pedometer } from '@capawesome-team/capacitor-pedometer';

await Pedometer.addListener('measurement', (event) => {
  console.log('Steps:', event.numberOfSteps);
});

await Pedometer.startMeasurementUpdates();

// Later, stop updates:
await Pedometer.stopMeasurementUpdates();
await Pedometer.removeAllListeners();
```

### Check feature availability

```typescript
import { Pedometer } from '@capawesome-team/capacitor-pedometer';

const { cadence, distance, floorCounting, pace, stepCounting } = await Pedometer.isAvailable();
```

### Check and request permissions

```typescript
import { Pedometer } from '@capawesome-team/capacitor-pedometer';

const status = await Pedometer.checkPermissions();
if (status.activityRecognition !== 'granted') {
  await Pedometer.requestPermissions();
}
```

## Notes

- On Android, only step counting is supported. Cadence, distance, floor counting, and pace always return `false` for `isAvailable()`.
- On Android, `getMeasurement()` always uses device boot time as the start date (the `start` option is ignored).
- On iOS, `getMeasurement()` requires both `start` and `end` options.
- The `measurement` event listener requires calling `startMeasurementUpdates()` first.
- Measurement updates pause when the app is suspended and resume when the app is active again.
