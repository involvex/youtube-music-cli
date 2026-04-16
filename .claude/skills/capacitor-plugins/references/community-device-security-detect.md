# Device Security Detect

Capacitor community plugin for detecting device security status, including root/jailbreak detection and lock screen checks.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/device-security-detect
npx cap sync
```

## Usage

```typescript
import { DeviceSecurityDetect } from '@capacitor-community/device-security-detect';

// Check if device is rooted (Android) or jailbroken (iOS)
const { value: isCompromised } = await DeviceSecurityDetect.isJailBreakOrRooted();
if (isCompromised) {
  console.warn('Device is rooted or jailbroken.');
}

// Check if PIN, password, or biometric lock is enabled
const { value: hasLock } = await DeviceSecurityDetect.pinCheck();
if (!hasLock) {
  console.warn('No secure lock mechanism detected.');
}
```

## Notes

- `isJailBreakOrRooted()` returns `true` if the device has been tampered with (rooted on Android, jailbroken on iOS).
- `pinCheck()` returns `true` if the user has set up a PIN, password, or biometric authentication on the device.
- Plugin version matches the major Capacitor version (e.g., v8.x for Capacitor 8, v7.x for Capacitor 7).
