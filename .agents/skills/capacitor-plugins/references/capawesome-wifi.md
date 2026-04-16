# Wi-Fi

Manage Wi-Fi connectivity: add, connect, disconnect networks, scan for available networks, and retrieve device info.

**Package:** `@capawesome-team/capacitor-wifi`
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
npm install @capawesome-team/capacitor-wifi
npx cap sync
```

## Configuration

### Android

#### Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Entitlements

Enable `Access Wi-Fi Information` and `Hotspot` capabilities in Xcode for your app target.

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to request Wi-Fi information.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location to request Wi-Fi information.</string>
```

### Plugin Configuration

Optional configuration in `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  plugins: {
    Wifi: {
      useWifiManager: false, // Use deprecated WifiManager API on Android (default: false)
    },
  },
};
```

## Usage

### Connect and disconnect

```typescript
import { Wifi } from '@capawesome-team/capacitor-wifi';

await Wifi.connect({
  ssid: 'MyNetwork',
  password: 'MyPassword',
  isHiddenSsid: false,
});

await Wifi.disconnect();
```

### Get network info

```typescript
import { Wifi } from '@capawesome-team/capacitor-wifi';

const { ssid } = await Wifi.getSsid();
const { address } = await Wifi.getIpAddress();
const { rssi } = await Wifi.getRssi();
const { enabled } = await Wifi.isEnabled();
```

### Scan for networks

```typescript
import { Wifi } from '@capawesome-team/capacitor-wifi';

await Wifi.addListener('networksScanned', (event) => {
  console.log('Networks:', event.networks);
});

await Wifi.startScan();
const { networks } = await Wifi.getAvailableNetworks();
```

## Notes

- `connect()` on Android does NOT add the network to known networks and does NOT route traffic through it. Use `addNetwork()` (Android SDK 30+, iOS) to add and route traffic.
- `disconnect()` on iOS only works for networks connected via this plugin and also removes the network from known networks.
- `getAvailableNetworks()`, `getRssi()`, `isEnabled()`, and `startScan()` are Android-only.
- On iOS 14+, `getSsid()` requires the network to have been connected via the plugin or the app to have precise location permission.
- Scan requests may be throttled on Android due to platform limitations.
