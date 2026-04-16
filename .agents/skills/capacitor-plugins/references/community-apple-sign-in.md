# Apple Sign In

Capacitor plugin to support Sign in With Apple.

**Package:** `@capacitor-community/apple-sign-in`

**Platforms:** iOS, Web

## Installation

```bash
npm install @capacitor-community/apple-sign-in
npx cap sync
```

## Usage

```typescript
import {
  SignInWithApple,
  SignInWithAppleResponse,
  SignInWithAppleOptions,
} from '@capacitor-community/apple-sign-in';

const options: SignInWithAppleOptions = {
  clientId: 'com.your.webservice',
  redirectURI: 'https://www.yourfrontend.com/login',
  scopes: 'email name',
  state: '12345',
  nonce: 'nonce',
};

SignInWithApple.authorize(options)
  .then((result: SignInWithAppleResponse) => {
    // Handle user information
    // Validate token with server and create new session
  })
  .catch((error) => {
    // Handle error
  });
```

## Notes

- Android is not supported.
- On iOS, the `clientId` and `redirectURI` are required for web-based flows but the native Sign in with Apple sheet uses the app's bundle identifier automatically.
- On Web, `clientId` must be a Services ID registered with Apple, and `redirectURI` must match the one configured in the Apple Developer portal.
