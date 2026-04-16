# Device Check

Reduce fraudulent use of services by generating a DeviceCheck token for server-side verification with Apple.

**Platforms:** iOS

## Installation

```bash
npm install @capacitor-community/device-check
npx cap sync
```

## Usage

```typescript
import { DeviceCheck } from '@capacitor-community/device-check';

try {
  const { token } = await DeviceCheck.generateToken();
  // Send the base64-encoded token to your backend for verification with Apple servers
  console.log('DeviceCheck token', token);
} catch (err) {
  // Handle error - consider reporting to backend and exiting the app
}
```

## Notes

- `generateToken()` returns a base64-encoded token from Apple's `DCDevice.current.generateToken`.
- The token must be verified server-side with Apple. See [Apple's documentation](https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server).
- On Web and Android, `generateToken()` returns an empty token (`""`).
- Possible iOS errors: `DeviceCheck is not supported on this device` (iOS < 11), `DeviceCheck token encoding failed`, or `DeviceCheck error: [description]`.
