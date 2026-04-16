# OAuth

Capacitor plugin for communicating with OAuth 2.0 and OpenID Connect providers. Implements Authorization Code flow with PKCE.

**Package:** `@capawesome-team/capacitor-oauth`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-oauth
npx cap sync
```

## Configuration

### Android

#### Redirect Scheme

Add to `android/app/build.gradle` inside the `android > defaultConfig` block:

```groovy
android {
    defaultConfig {
        manifestPlaceholders = [appAuthRedirectScheme: "com.example.app"]
    }
}
```

Replace `com.example.app` with the scheme of your redirect URI.

#### Variables

Defined in `android/variables.gradle`:

- `$appAuthVersion` version of `net.openid:appauth` (default: `0.11.1`)

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

## Usage

### Login

```typescript
import { Oauth } from '@capawesome-team/capacitor-oauth';

const result = await Oauth.login({
  issuerUrl: 'https://accounts.google.com',
  clientId: 'YOUR_CLIENT_ID',
  redirectUrl: 'com.example.app://oauth/callback',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
});
console.log('Access token:', result.accessToken);
console.log('ID token:', result.idToken);
console.log('Refresh token:', result.refreshToken);
```

### Refresh token

```typescript
import { Oauth } from '@capawesome-team/capacitor-oauth';

const result = await Oauth.refreshToken({
  issuerUrl: 'https://accounts.google.com',
  clientId: 'YOUR_CLIENT_ID',
  refreshToken: 'YOUR_REFRESH_TOKEN',
});
console.log('New access token:', result.accessToken);
```

### Logout

```typescript
import { Oauth } from '@capawesome-team/capacitor-oauth';

await Oauth.logout({
  issuerUrl: 'https://accounts.google.com',
  idToken: 'YOUR_ID_TOKEN',
  postLogoutRedirectUrl: 'com.example.app://oauth/logout',
});
```

### Handle web redirect callback

```typescript
import { Oauth } from '@capawesome-team/capacitor-oauth';
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() === 'web') {
  const result = await Oauth.handleRedirectCallback();
  console.log('Access token:', result.accessToken);
}
```

### Decode an ID token

```typescript
import { Oauth } from '@capawesome-team/capacitor-oauth';

const { payload } = await Oauth.decodeIdToken({ token: 'YOUR_ID_TOKEN' });
console.log('Claims:', payload);
```

## Notes

- Works with any OAuth 2.0 / OpenID Connect provider (Auth0, Azure AD, Amazon Cognito, Okta, OneLogin, etc.).
- Supports auto-discovery via `issuerUrl` (fetches `.well-known/openid-configuration`). Alternatively, provide `authorizationEndpoint` and `tokenEndpoint` directly.
- `handleRedirectCallback()` is only available on Web. Call it on page load when the URL contains authorization response parameters.
- Some providers (e.g. Microsoft Entra ID) may not redirect back after logout, resulting in a `USER_CANCELED` error even though logout succeeded.
- `decodeIdToken()` decodes the JWT without verification. Use server-side validation for production.
- Compatible with `@capawesome-team/capacitor-secure-preferences` for secure token storage.
