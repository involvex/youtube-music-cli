# Biometrics

Capacitor plugin for biometric authentication (face recognition, fingerprint, iris).

**Package:** `@capawesome-team/capacitor-biometrics`

**Platforms:** Android, iOS, Web

**Availability:** [Capawesome Insiders](https://capawesome.io/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install the package:

```bash
npm install @capawesome-team/capacitor-biometrics
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

#### Variables

Optionally define in `variables.gradle`:

- `$androidxBiometricVersion` version of `androidx.biometric:biometric` (default: `1.1.0`)

### iOS

#### Privacy Descriptions

Add to `ios/App/App/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>This app uses Face ID for authentication.</string>
```

## Usage

### Authenticate

```typescript
import { Biometrics, ErrorCode } from '@capawesome-team/capacitor-biometrics';

try {
  await Biometrics.authenticate({
    title: 'Authentication Required',
    subtitle: 'Please authenticate to continue',
    cancelButtonText: 'Cancel',
    iosFallbackButtonText: 'Use Passcode',
    allowDeviceCredential: true,
  });
  // Authentication successful
} catch (error) {
  if (error.code === ErrorCode.USER_CANCELED) {
    console.log('User canceled');
  } else if (error.code === ErrorCode.NOT_ENROLLED) {
    console.log('No biometric enrolled');
  } else if (error.code === ErrorCode.NOT_AVAILABLE) {
    console.log('Biometric not available');
  }
}
```

### Check availability and enrollment

```typescript
const { isAvailable } = await Biometrics.isAvailable();
const { isEnrolled } = await Biometrics.isEnrolled();
const { hasDeviceCredential } = await Biometrics.hasDeviceCredential();
const { strengthLevel } = await Biometrics.getBiometricStrengthLevel(); // Android only
const { biometricType } = await Biometrics.getBiometricType(); // Face, Fingerprint, Iris, None
```

### Other operations

```typescript
await Biometrics.cancelAuthentication(); // Android SDK 29+, iOS
await Biometrics.enroll(); // Android only
```

## Notes

- `allowDeviceCredential` lets users fall back to PIN/password if biometrics fail (default: `false`).
- `androidBiometricStrength` can be `Strong` or `Weak` (default: `Weak`). On Android API 28-29, it is always `Weak` when `allowDeviceCredential` is `true`.
- On iOS, the first authentication prompt will ask for biometric permission.
- `biometricType` priority: Face > Iris > Fingerprint when multiple are available.
- Compatible with the Secure Preferences plugin.
