# Square Mobile Payments

Unofficial Capacitor plugin for the Square Mobile Payments SDK for in-person payment processing with Square card readers.

**Package:** `@capawesome/capacitor-square-mobile-payments`
**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-square-mobile-payments
npx cap sync
```

## Configuration

### Android

#### SDK Initialization

Create `android/app/src/main/java/<your-package>/MainApplication.java`:

```java
package com.example.app;

import android.app.Application;
import com.squareup.sdk.mobilepayments.MobilePaymentsSdk;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        MobilePaymentsSdk.initialize("YOUR_SQUARE_APPLICATION_ID", this);
    }
}
```

Register in `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:name=".MainApplication"
    ...>
```

### iOS

#### SDK Initialization

Add to `ios/App/App/Info.plist`:

```xml
<key>SquareApplicationID</key>
<string>YOUR_SQUARE_APPLICATION_ID</string>
```

Add to `AppDelegate.swift`:

```swift
import SquareMobilePaymentsSDK

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    if let squareAppID = Bundle.main.object(forInfoDictionaryKey: "SquareApplicationID") as? String,
       !squareAppID.isEmpty {
        MobilePaymentsSDK.initialize(
            applicationLaunchOptions: launchOptions,
            squareApplicationID: squareAppID
        )
    }
    return true
}
```

#### Build Phases

Add a Run Script Phase in Xcode (must be the last build phase):

```
FRAMEWORKS="${BUILT_PRODUCTS_DIR}/${FRAMEWORKS_FOLDER_PATH}"
"${FRAMEWORKS}/SquareMobilePaymentsSDK.framework/setup"
```

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>We need Bluetooth access to connect to Square card readers.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to confirm payments are occurring in a supported Square location.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to receive data from magstripe card readers.</string>
```

## Usage

### Initialize and authorize

```typescript
import { SquareMobilePayments } from '@capawesome/capacitor-square-mobile-payments';

await SquareMobilePayments.initialize({ locationId: 'YOUR_LOCATION_ID' });
await SquareMobilePayments.authorize({ accessToken: 'YOUR_ACCESS_TOKEN' });
```

### Process a payment

```typescript
import { SquareMobilePayments } from '@capawesome/capacitor-square-mobile-payments';

await SquareMobilePayments.startPayment({
  paymentParameters: {
    amountMoney: { amount: 100, currency: 'USD' },
    paymentAttemptId: crypto.randomUUID(),
  },
  promptParameters: {
    mode: 'DEFAULT',
    additionalMethods: ['KEYED'],
  },
});
```

### Listen for payment events

```typescript
import { SquareMobilePayments } from '@capawesome/capacitor-square-mobile-payments';

SquareMobilePayments.addListener('paymentDidFinish', (event) => {
  console.log('Payment completed:', event.payment.id);
});

SquareMobilePayments.addListener('paymentDidFail', (event) => {
  console.error('Payment failed:', event.message);
});

SquareMobilePayments.addListener('paymentDidCancel', (event) => {
  console.log('Payment cancelled');
});
```

## Notes

- Payment methods: TAP (NFC), DIP (chip), SWIPE (magstripe), KEYED (manual entry).
- Processing modes: `AUTO_DETECT`, `ONLINE_ONLY`, `OFFLINE_ONLY`.
- Reader management: `startPairing()`, `stopPairing()`, `getReaders()`, `forgetReader()`.
- iOS-specific: `linkAppleAccount()` and `isDeviceCapable()` for Tap to Pay on iPhone.
- This plugin is not affiliated with or endorsed by Square, Inc.
