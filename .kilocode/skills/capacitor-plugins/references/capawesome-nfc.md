# NFC

Capacitor plugin for NFC tag reading, writing, and emulation. Supports NDEF, Host Card Emulation (HCE), and raw command handling.

**Package:** `@capawesome-team/capacitor-nfc`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-nfc
npx cap sync
```

## Configuration

### Android

#### Features

Add to `android/app/src/main/AndroidManifest.xml` before or after the `application` tag:

```xml
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

Set `android:required` to `false` if the app can function without NFC.

#### HCE Service

To use Host Card Emulation, add the following service **inside** the `application` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<service android:name=".MyHostApduService" android:exported="true"
         android:permission="android.permission.BIND_NFC_SERVICE">
    <intent-filter>
        <action android:name="android.nfc.cardemulation.action.HOST_APDU_SERVICE"/>
    </intent-filter>
    <meta-data android:name="android.nfc.cardemulation.host_apdu_service"
               android:resource="@xml/apduservice"/>
</service>
```

Create `android/app/src/main/res/xml/apduservice.xml`:

```xml
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
           android:description="@string/servicedesc"
           android:requireDeviceUnlock="false">
    <aid-group android:description="@string/aiddescription"
               android:category="other">
        <aid-filter android:name="F0010203040506"/>
        <aid-filter android:name="F0394148148100"/>
    </aid-group>
</host-apdu-service>
```

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Entitlements

The `ios/App/App/App.entitlements` file must contain:

```xml
<key>com.apple.developer.nfc.readersession.formats</key>
<array>
    <string>NDEF</string>
    <string>TAG</string>
</array>
```

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NFCReaderUsageDescription</key>
<string>The app enables the reading and writing of various NFC tags.</string>
```

## Usage

### Read an NFC tag

```typescript
import { Nfc } from '@capawesome-team/capacitor-nfc';

const read = async () => {
  return new Promise((resolve) => {
    Nfc.addListener('nfcTagScanned', async (event) => {
      await Nfc.stopScanSession();
      resolve(event.nfcTag);
    });
    Nfc.startScanSession();
  });
};
```

### Write to an NFC tag

```typescript
import { Nfc, NfcUtils } from '@capawesome-team/capacitor-nfc';

const write = async () => {
  return new Promise((resolve) => {
    const utils = new NfcUtils();
    const { record } = utils.createNdefTextRecord({ text: 'Hello NFC' });

    Nfc.addListener('nfcTagScanned', async (event) => {
      await Nfc.write({ message: { records: [record] } });
      await Nfc.stopScanSession();
      resolve();
    });
    Nfc.startScanSession();
  });
};
```

### Check NFC support and status

```typescript
import { Nfc } from '@capawesome-team/capacitor-nfc';

const { nfc } = await Nfc.isSupported();
const { isEnabled } = await Nfc.isEnabled(); // Android only
```

## Notes

- Only one scan session can be active at a time. Always call `stopScanSession()` when done.
- `write()`, `makeReadOnly()`, `erase()`, `format()`, and `transceive()` must be called from within a `nfcTagScanned` handler.
- `makeReadOnly()` is permanent and cannot be undone.
- `format()` is only available on Android.
- On Android, `transceive()` requires calling `connect()` first and `close()` after.
- On iOS, the scan session displays a system NFC Reader Session alert.
- The `NfcUtils` class provides helper methods for creating NDEF records (text, URI, etc.).
