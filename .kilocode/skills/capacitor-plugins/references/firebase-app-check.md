# Firebase App Check

Unofficial Capacitor plugin for Firebase App Check. Protects backend resources from abuse.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/app-check firebase
npx cap sync
```

## Configuration

### Android

Set up Play Integrity via Firebase Console. Set Gradle variables in `variables.gradle`:
- `firebaseAppCheckPlayIntegrityVersion` (default: `19.0.1`)
- `firebaseAppCheckDebugVersion` (default: `19.0.1`)

### iOS

- iOS 14+: Set up App Attest provider via Firebase Console.
- iOS 13: Set up DeviceCheck provider via Firebase Console.

### Web

Set up reCAPTCHA provider via Firebase Console.

## Usage

```typescript
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';

await FirebaseAppCheck.initialize({
  debugToken: true, // For development only
});

const { token } = await FirebaseAppCheck.getToken({ forceRefresh: false });

await FirebaseAppCheck.addListener('tokenChanged', (event) => {
  console.log('tokenChanged', event);
});
```

## Notes

- `initialize()` can only be called once per app.
- For Android debug: run `adb logcat | grep DebugAppCheckProvider` to get debug secret, register in Firebase Console.
- Do not use `debugToken` in production.
