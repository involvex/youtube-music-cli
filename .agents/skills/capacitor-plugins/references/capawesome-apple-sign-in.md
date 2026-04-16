# Apple Sign-In

Sign in with Apple using native AuthenticationServices (iOS) and WebView OAuth (Android).

**Package:** `@capawesome/capacitor-apple-sign-in`
**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capawesome/capacitor-apple-sign-in
npx cap sync
```

### iOS

Add the **Sign in with Apple** capability:

1. Open your app target in Xcode.
2. Go to the **Signing & Capabilities** tab.
3. Click **+ Capability** and add **Sign in with Apple**.

### Web

The plugin loads the Apple JS SDK automatically. Configure your Apple Service ID with the correct redirect URL and web domain in the [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId).

## Usage

### Initialize (Android and Web only)

```typescript
import { AppleSignIn } from '@capawesome/capacitor-apple-sign-in';

await AppleSignIn.initialize({
  clientId: 'com.example.app.signin',
});
```

### Sign in

```typescript
import { AppleSignIn, SignInScope } from '@capawesome/capacitor-apple-sign-in';

const result = await AppleSignIn.signIn({
  scopes: [SignInScope.Email, SignInScope.FullName],
  redirectUrl: 'https://example.com/callback',
  nonce: 'random-nonce',
  state: 'random-state',
});

console.log('User:', result.user);
console.log('ID Token:', result.idToken);
console.log('Authorization Code:', result.authorizationCode);
console.log('Email:', result.email);
console.log('Given Name:', result.givenName);
console.log('Family Name:', result.familyName);
```

## Notes

- `initialize()` must be called before `signIn()` on Android and Web. Not needed on iOS.
- On iOS, `email`, `givenName`, and `familyName` are only provided on the **first** sign-in.
- `redirectUrl` and `state` are only available on Android and Web.
- `realUserStatus` is iOS-only. Values: `LikelyReal`, `Unknown`, `Unsupported`.
- `SignInScope` values: `Email`, `FullName`.
- **Security**: The `idToken` (JWT) must be verified server-side using Apple's public keys. Never use client-side token data for authorization without server verification.
- **Security**: Validate the `state` parameter server-side to protect against CSRF attacks.
- On Android, Apple's sign-in page is rendered in a WebView. Ensure `redirectUrl` uses HTTPS and points to a domain you control.
