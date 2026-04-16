# Google Sign-In

Unofficial Capacitor plugin to sign in with Google. Supports authentication (ID tokens) and authorization (access tokens, server auth codes).

**Package:** `@capawesome/capacitor-google-sign-in`

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capawesome/capacitor-google-sign-in
npx cap sync
```

### Android

#### Variables

These project variables can be set in `android/app/variables.gradle`:

- `$androidxCredentialsVersion` version of `androidx.credentials:credentials` (default: `1.5.0`)
- `$googleIdVersion` version of `com.google.android.libraries.identity.googleid:googleid` (default: `1.1.1`)
- `$playServicesAuthVersion` version of `com.google.android.gms:play-services-auth` (default: `21.5.0`)

### iOS

Add the following to `ios/App/App/Info.plist`:

```xml
<key>GIDClientID</key>
<string>YOUR_IOS_CLIENT_ID</string>
```

Also add the URL scheme for the iOS client ID:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

Replace `YOUR_IOS_CLIENT_ID` with the reversed client ID from Google Cloud Console (e.g. `com.googleusercontent.apps.123456789-abc`).

## Usage

```typescript
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

const initialize = async () => {
  await GoogleSignIn.initialize({
    clientId: '123456789-abc.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/userinfo.profile'],
  });
};

const signIn = async () => {
  const result = await GoogleSignIn.signIn();
  console.log(result.idToken);
  console.log(result.userId);
  console.log(result.email);
  console.log(result.displayName);
  console.log(result.accessToken);
  console.log(result.serverAuthCode);
};

const signOut = async () => {
  await GoogleSignIn.signOut();
};
```

### Web Redirect Flow

On Web, `signIn()` redirects to Google OAuth and the promise never resolves. After redirect, call `handleRedirectCallback()`:

```typescript
import { Capacitor } from '@capacitor/core';

const handleRedirectCallback = async () => {
  if (Capacitor.getPlatform() !== 'web') return;
  const result = await GoogleSignIn.handleRedirectCallback();
};
```

## Key Options

### Initialize Options

- `clientId`: Web client ID from Google Cloud Console. Must be a web client ID on all platforms.
- `redirectUrl`: URL to redirect to after OAuth flow (Web only).
- `scopes`: OAuth scopes to request. Enables `accessToken` and `serverAuthCode` in the result.

### Sign-In Options

- `nonce`: Nonce to prevent replay attacks (Android and Web only).

## Notes

- `initialize()` must be called once before any other methods.
- The `idToken` (JWT) must be verified server-side using Google's public keys.
- Exchange `serverAuthCode` on your backend for access and refresh tokens; never exchange it client-side.
- Uses Credential Manager on Android and Google Sign-In SDK on iOS.
- `signOut()` clears credential state on Android, signs out from SDK on iOS, and is a no-op on Web.
