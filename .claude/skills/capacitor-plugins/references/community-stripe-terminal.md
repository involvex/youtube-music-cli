# Stripe Terminal

Stripe Terminal SDK bindings for Capacitor applications. Enables in-person payments with Stripe reader devices.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/stripe-terminal
npx cap sync
```

## Configuration

### iOS

Stripe Terminal requires iOS deployment target 14.0 or later. Update `ios/App/Podfile`:

```diff
- platform :ios, '13.0'
+ platform :ios, '14.0'
```

See also [Stripe iOS configuration docs](https://stripe.com/docs/terminal/payments/setup-integration?terminal-sdk-platform=ios#configure) for additional setup.

### Android

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```diff
+ <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
+ <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
+ <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
+ <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
+ <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
+ <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

Update `minSdkVersion` to 26 in `android/app/build.gradle`:

```diff
  ext {
-    minSdkVersion = 23
+    minSdkVersion = 26
```

### Web

No additional steps are necessary. Note: the Stripe Web Terminal SDK is in beta.

## Usage

```typescript
import { StripeTerminal, TerminalConnectTypes, TerminalEventsEnum } from '@capacitor-community/stripe-terminal';

// Initialize with a token provider endpoint
await StripeTerminal.initialize({
  tokenProviderEndpoint: 'https://example.com/token',
  isTest: true,
});

// Discover readers
const { readers } = await StripeTerminal.discoverReaders({
  type: TerminalConnectTypes.TapToPay,
  locationId: 'tml_xxx',
});

// Connect to a reader
await StripeTerminal.connectReader({ reader: readers[0] });

// Collect payment
await StripeTerminal.collectPaymentMethod({ paymentIntent: 'pi_xxx' });

// Confirm payment
await StripeTerminal.confirmPaymentIntent();

// Disconnect reader
await StripeTerminal.disconnectReader();
```

### Manual Token Provider

```typescript
// Set up a listener before initialize()
StripeTerminal.addListener(TerminalEventsEnum.RequestedConnectionToken, async () => {
  const { token } = await (await fetch('https://example.com/token')).json();
  StripeTerminal.setConnectionToken({ token });
});

await StripeTerminal.initialize({ isTest: true });
```

## Notes

- Reader connection types: `Simulated`, `Internet`, `Bluetooth`, `Usb`, `TapToPay`, `HandOff`.
- `setReaderDisplay()` shows cart information on readers with a display screen. Call before `collectPaymentMethod()`.
- `clearReaderDisplay()` clears the reader screen.
- `setSimulatorConfiguration()` allows setting simulated reader state (e.g., `SimulateReaderUpdate.UpdateAvailable`) for testing.
- `setTapToPayUxConfiguration()` customizes the Tap to Pay screen appearance (Android only). Call after `initialize()` but before `connectReader()`.
- Device update events: `ReportAvailableUpdate`, `StartInstallingUpdate`, `ReaderSoftwareUpdateProgress`, `FinishInstallingUpdate`.
- Status events: `BatteryLevel`, `ReaderEvent`, `RequestDisplayMessage`, `RequestReaderInput`, `ConnectionStatusChange`, `PaymentStatusChange`.
- Reconnection events: `ReaderReconnectStarted`, `ReaderReconnectSucceeded`, `ReaderReconnectFailed`.
- This plugin is still in the release candidate (RC) phase.
