# Bluetooth Low Energy

Capacitor plugin for Bluetooth Low Energy (BLE) communication in central and peripheral roles.

**Package:** `@capawesome-team/capacitor-bluetooth-low-energy`

**Platforms:** Android, iOS

**Availability:** [Capawesome Insiders](https://capawesome.io/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install the package:

```bash
npm install @capawesome-team/capacitor-bluetooth-low-energy
npx cap sync
```

## Configuration

### Android

#### Features

Add to `AndroidManifest.xml` before or after the `application` tag:

```xml
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
```

Set `android:required="false"` if the app can function without BLE.

#### Permissions

Add to `AndroidManifest.xml` before or after the `application` tag:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

#### Services

Add **inside** the `application` tag in `AndroidManifest.xml` (usually `android/app/src/main/AndroidManifest.xml`):

```xml
<service android:name="io.capawesome.capacitorjs.plugins.bluetoothle.BluetoothLowEnergyService" android:foregroundServiceType="connectedDevice" />
```

#### Proguard

If using Proguard, add to `proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>The app needs access to Bluetooth peripherals to communicate with Bluetooth devices.</string>
```

#### Background BLE

To maintain BLE connections in the background, enable `Background Modes` capability with `bluetooth-central` in the Xcode project.

## Usage

### Initialize and scan for devices

```typescript
import { BluetoothLowEnergy } from '@capawesome-team/capacitor-bluetooth-low-energy';

await BluetoothLowEnergy.initialize({ mode: 'central' });

BluetoothLowEnergy.addListener('deviceScanned', (event) => {
  console.log('Found device:', event.id, event.name);
});
await BluetoothLowEnergy.startScan();
```

### Connect and read a characteristic

```typescript
await BluetoothLowEnergy.connect({ deviceId: '00:00:00:00:00:00' });
await BluetoothLowEnergy.discoverServices({ deviceId: '00:00:00:00:00:00' });

const { value } = await BluetoothLowEnergy.readCharacteristic({
  characteristicId: '00002a00-0000-1000-8000-00805f9b34fb',
  deviceId: '00:00:00:00:00:00',
  serviceId: '00001800-0000-1000-8000-00805f9b34fb',
});
```

### Write to a characteristic

```typescript
await BluetoothLowEnergy.writeCharacteristic({
  characteristicId: '00002a00-0000-1000-8000-00805f9b34fb',
  deviceId: '00:00:00:00:00:00',
  serviceId: '00001800-0000-1000-8000-00805f9b34fb',
  value: [1, 2, 3],
});
```

### Listen for characteristic changes

```typescript
BluetoothLowEnergy.addListener('characteristicChanged', (event) => {
  console.log('Value changed:', event.value);
});
await BluetoothLowEnergy.startCharacteristicNotifications({
  characteristicId: '00002a00-0000-1000-8000-00805f9b34fb',
  deviceId: '00:00:00:00:00:00',
  serviceId: '00001800-0000-1000-8000-00805f9b34fb',
});
```

## Notes

- `initialize()` must be called before any other method. On iOS it prompts for Bluetooth permissions.
- Supports both central and peripheral roles (`mode: 'central'` or `mode: 'peripheral'`).
- Foreground service keeps connections alive in the background (Android only, use `startForegroundService()`).
- Auto-reconnection supported via `autoReconnect: true` in `connect()` (Android, iOS 17.0+).
- Headless task support on Android for running native code on BLE events.
- Utility class `BluetoothLowEnergyUtils` provides helpers like `convertBytesToHex()`.
- Events: `deviceScanned`, `deviceConnected`, `deviceDisconnected`, `characteristicChanged`, `characteristicWriteRequest`.
