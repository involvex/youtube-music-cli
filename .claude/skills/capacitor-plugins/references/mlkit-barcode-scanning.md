# MLKit Barcode Scanning

Unofficial Capacitor plugin for ML Kit Barcode Scanning. Scanning via camera or from static images with a customizable scanning view.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-mlkit/barcode-scanning
npx cap sync
```

## Configuration

### Android

Add to `android/app/src/main/AndroidManifest.xml` before `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Add inside `<application>`:

```xml
<meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui"/>
```

Optional `variables.gradle` variables:
- `mlkitBarcodeScanningVersion` (default: `17.3.0`)
- `playServicesCodeScannerVersion` (default: `16.1.0`)

### iOS

Set minimum deployment target in `ios/App/Podfile`:

```ruby
platform :ios, '15.5'
```

Add to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>The app enables the scanning of various barcodes.</string>
```

CocoaPods only — SPM is not supported.

### Web

Optional polyfill: `npm install barcode-detector` then `import "barcode-detector/polyfill";`

## Usage

### Continuous Scanning

```typescript
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

document.querySelector('body')?.classList.add('barcode-scanner-active');

const listener = await BarcodeScanner.addListener('barcodeScanned', async (result) => {
  console.log(result.barcode);
});
await BarcodeScanner.startScan();
```

To stop:

```typescript
document.querySelector('body')?.classList.remove('barcode-scanner-active');
await BarcodeScanner.removeAllListeners();
await BarcodeScanner.stopScan();
```

### Ready-to-Use Interface

```typescript
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

const { barcodes } = await BarcodeScanner.scan({
  formats: [BarcodeFormat.QrCode],
});
```

### Scan from Image

```typescript
const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
  path: '/path/to/image',
  formats: [BarcodeFormat.QrCode],
});
```

## Notes

- Camera renders behind the WebView. Hide non-scanner UI via CSS:
  ```css
  body.barcode-scanner-active {
    visibility: hidden;
    --background: transparent;
    --ion-background-color: transparent;
  }
  .barcode-scanner-modal { visibility: visible; }
  ```
- `scan()` on Android requires Google Play Services. Check with `isGoogleBarcodeScannerModuleAvailable()` first.
- Supported formats: Aztec, Codabar, Code39, Code93, Code128, DataMatrix, Ean8, Ean13, Itf, Pdf417, QrCode, UpcA, UpcE.
