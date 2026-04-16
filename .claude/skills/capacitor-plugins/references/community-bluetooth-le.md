# Bluetooth Low Energy

Capacitor plugin for Bluetooth Low Energy (central role).

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/bluetooth-le
npx cap sync
```

## Configuration

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Uses Bluetooth to connect and interact with peripheral BLE devices.</string>
```

For background BLE usage, also add:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
</array>
```

Bluetooth is not available in the iOS simulator. You must test on a real device.

### Android

No additional steps required. The plugin handles permissions automatically.

To scan without location permission on Android 12+ (API 31+), add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
  android:usesPermissionFlags="neverForLocation"
  tools:targetApi="s" />
```

Then initialize with `androidNeverForLocation: true`:

```typescript
await BleClient.initialize({ androidNeverForLocation: true });
```

### Optional: Display Strings

Customize the device selection dialog via `capacitor.config.json`:

```json
{
  "plugins": {
    "BluetoothLe": {
      "displayStrings": {
        "scanning": "Scanning...",
        "cancel": "Cancel",
        "availableDevices": "Available devices",
        "noDeviceFound": "No device found"
      }
    }
  }
}
```

## Usage

```typescript
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

const HEART_RATE_SERVICE = numberToUUID(0x180d);
const HEART_RATE_CHARACTERISTIC = numberToUUID(0x2a37);

// Initialize
await BleClient.initialize();

// Request a device
const device = await BleClient.requestDevice({
  services: [HEART_RATE_SERVICE],
});

// Connect
await BleClient.connect(device.deviceId, (deviceId) => {
  console.log(`Device ${deviceId} disconnected`);
});

// Read a characteristic
const value = await BleClient.read(device.deviceId, HEART_RATE_SERVICE, HEART_RATE_CHARACTERISTIC);

// Start notifications
await BleClient.startNotifications(
  device.deviceId,
  HEART_RATE_SERVICE,
  HEART_RATE_CHARACTERISTIC,
  (value) => {
    console.log('Received value:', value);
  },
);

// Stop notifications and disconnect
await BleClient.stopNotifications(device.deviceId, HEART_RATE_SERVICE, HEART_RATE_CHARACTERISTIC);
await BleClient.disconnect(device.deviceId);
```

### Scanning API

```typescript
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

await BleClient.initialize();

await BleClient.requestLEScan(
  { services: [numberToUUID(0x180d)] },
  (result) => {
    console.log('Found device:', result.device.name);
  },
);

// Stop scanning after 5 seconds
setTimeout(() => BleClient.stopLEScan(), 5000);
```

## Notes

- Only supports the BLE **central** role (not peripheral).
- Use `BleClient` wrapper class, not the `BluetoothLe` plugin class directly.
- All UUIDs must be 128-bit strings (e.g. `'0000180d-0000-1000-8000-00805f9b34fb'`). Use `numberToUUID()` to convert 16-bit UUIDs.
- Web support depends on browser Web Bluetooth API availability.
- `getBondedDevices()` and `createBond()` are Android-only.
- If `connect()` fails on Android, try calling `disconnect()` first.
- On Android, if no devices are found, verify that location services are enabled on the device.
