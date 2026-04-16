# Firebase Authentication

Unofficial Capacitor plugin for Firebase Authentication. Supports many sign-in providers with native SDKs.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/authentication firebase
npx cap sync
```

## Configuration

### iOS

Verify `ios/App/App/AppDelegate.swift` contains the `application(_:open:options:)` method with `ApplicationDelegateProxy`.

If combined with `@capacitor-firebase/messaging`, add `import FirebaseAuth` and `Auth.auth().canHandle(url)` check.

### Capacitor Config

```json
{
  "plugins": {
    "FirebaseAuthentication": {
      "skipNativeAuth": false,
      "providers": ["apple.com", "google.com"]
    }
  }
}
```

- `skipNativeAuth` (boolean, default `false`): Skip native auth, use Firebase JS SDK only.
- `providers` (string[]): `"apple.com"`, `"facebook.com"`, `"google.com"`, `"github.com"`, `"microsoft.com"`, `"twitter.com"`, `"yahoo.com"`, `"phone"`, `"gc.apple.com"`, `"playgames.google.com"`.

## Usage

```typescript
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const result = await FirebaseAuthentication.signInWithGoogle();

const result2 = await FirebaseAuthentication.signInWithEmailAndPassword({
  email: 'mail@example.com',
  password: '1234',
});

const { user } = await FirebaseAuthentication.getCurrentUser();
await FirebaseAuthentication.signOut();
```

## Notes

- Native auth logs the user in only on the native layer. To also log in on the web layer (e.g., for Firestore via Firebase JS SDK), additional steps are needed.
- Phone number sign-in uses a listener pattern: attach `phoneCodeSent` listener, then call `signInWithPhoneNumber()`, then `confirmVerificationCode()`.
- Each provider has its own setup guide (Apple, Facebook, Google, etc.).
