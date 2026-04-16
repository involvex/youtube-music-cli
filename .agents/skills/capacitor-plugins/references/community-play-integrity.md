# Play Integrity

Verify app integrity and device trust using the Google Play Integrity API.

**Platforms:** Android

## Installation

```bash
npm install @capacitor-community/play-integrity
npx cap sync
```

## Configuration

### Android

This plugin uses the following project variable (defined in `android/variables.gradle`):

- `googlePlayIntegrityVersion` - version of `com.google.android.play:integrity` (default: `1.6.0`)

## Usage

```typescript
import { PlayIntegrity } from '@capacitor-community/play-integrity';

try {
  const result = await PlayIntegrity.requestIntegrityToken({
    nonce: 'your-unique-nonce',
    googleCloudProjectNumber: 0, // 0 for default, or your Firebase project number
  });
  // Send result.token to your backend for decryption and verification
  console.log('Play Integrity token', result.token);
} catch (err) {
  // Handle error - consider reporting to backend and exiting the app
}
```

## Notes

- `requestIntegrityToken()` requires a `nonce` (see [Google's nonce documentation](https://developer.android.com/google/play/integrity/classic)) and a `googleCloudProjectNumber` (use `0` for the default, or get it from Firebase Console > Project Settings > General).
- The returned token must be decrypted and verified server-side. See [Google's verification docs](https://developer.android.com/google/play/integrity/classic#decrypt-verify).
- The Integrity API must be enabled in the Google Play Console.
- Common errors: `Integrity API is not available` (API not enabled or Play Store outdated), `Play Services not found`.
