# Barometer

Capacitor plugin to obtain static air pressure in hectopascals (hPa).

**Package:** `@capawesome-team/capacitor-barometer`

**Platforms:** Android, iOS

**Availability:** [Capawesome Insiders](https://capawesome.io/sponsors/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install the package:

```bash
npm install @capawesome-team/capacitor-barometer
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `proguard-rules.pro`:

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

### Get a single measurement

```typescript
import { Barometer } from '@capawesome-team/capacitor-barometer';

const { pressure, relativeAltitude, timestamp } = await Barometer.getMeasurement();
console.log('Pressure:', pressure, 'hPa');
```

### Check availability

```typescript
const { isAvailable } = await Barometer.isAvailable();
```

### Continuous measurement updates

```typescript
Barometer.addListener('measurement', (event) => {
  console.log('Pressure:', event.pressure, 'hPa');
  console.log('Timestamp:', new Date(event.timestamp));
});
await Barometer.startMeasurementUpdates();

// To stop:
await Barometer.stopMeasurementUpdates();
Barometer.removeAllListeners();
```

### Permissions

```typescript
const { barometer } = await Barometer.checkPermissions();
const { barometer } = await Barometer.requestPermissions();
```

## Notes

- Pressure is measured in hectopascals (hPa).
- `relativeAltitude` (in meters) is only available on iOS.
- Each measurement includes a `timestamp` in milliseconds since epoch.
