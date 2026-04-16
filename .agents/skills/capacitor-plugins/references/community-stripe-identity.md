# Stripe Identity

Stripe Identity SDK bindings for Capacitor applications. Enables identity verification flows.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/stripe-identity
npx cap sync
```

## Configuration

### iOS

Add camera usage description to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for identity verification.</string>
```

### Android

Change the base application theme to a MaterialComponents theme in `android/app/src/main/res/values/styles.xml`:

```diff
- <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
+ <style name="AppTheme" parent="Theme.MaterialComponents.DayNight">
```

## Usage

```typescript
import { StripeIdentity, IdentityVerificationSheetEventsEnum } from '@capacitor-community/stripe-identity';

// Listen for verification result
const listener = await StripeIdentity.addListener(
  IdentityVerificationSheetEventsEnum.VerificationResult,
  (result) => {
    console.log(result);
    listener.remove();
  },
);

// Initialize (required only for Web)
await StripeIdentity.initialize({ publishableKey: 'pk_test_xxx' });

// Create verification sheet
await StripeIdentity.create({
  ephemeralKeySecret: 'ek_xxx',
  verificationId: 'vs_xxx',
  clientSecret: 'cs_xxx', // required only for Web
});

// Present verification sheet
await StripeIdentity.present();
```

## Notes

- `initialize()` is only needed on the Web platform; native platforms configure automatically.
- `clientSecret` in `create()` is only required for the Web platform.
- Verification result includes `result` (Completed, Canceled, or Failed) and an optional `error` object with `code` and `message`.
- Events: `IdentityVerificationSheetEventsEnum.Loaded`, `FailedToLoad`, and `VerificationResult`.
