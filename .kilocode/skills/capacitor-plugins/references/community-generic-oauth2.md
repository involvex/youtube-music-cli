# Generic OAuth2

Generic OAuth 2 client plugin that works with various identity providers without requiring provider-specific SDKs.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/generic-oauth2
npx cap sync
```

## Configuration

### Android

In `android/app/src/main/AndroidManifest.xml`, add `android:host` to the existing `custom_url_scheme` data element in the main activity intent filter:

```diff
- <data android:scheme="@string/custom_url_scheme"/>
+ <data android:scheme="@string/custom_url_scheme" android:host="oauth"/>
```

In `android/app/src/main/res/values/strings.xml`, set the custom URL scheme to your app's package name (do not include `://` or paths):

```xml
<string name="custom_url_scheme">com.example.yourapp</string>
```

In `android/app/build.gradle`, add the redirect scheme placeholder:

```groovy
android.defaultConfig.manifestPlaceholders = [
    "appAuthRedirectScheme": "com.example.yourapp"
]
```

### iOS

In `ios/App/App/Info.plist`, add a URL scheme matching the `redirectUrl` value (without `:/`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.companyname.appname</string>
    </array>
  </dict>
</array>
```

## Usage

```typescript
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';

// Authenticate
const response = await GenericOAuth2.authenticate({
  appId: 'your-client-id',
  authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/auth',
  accessTokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  scope: 'email profile',
  resourceUrl: 'https://www.googleapis.com/userinfo/v2/me',
  responseType: 'code',
  pkceEnabled: true,
  web: {
    redirectUrl: 'http://localhost:4200',
    windowOptions: 'height=600,left=0,top=0',
  },
  android: {
    redirectUrl: 'com.example.yourapp:/',
  },
  ios: {
    redirectUrl: 'com.example.yourapp:/',
  },
});

const accessToken = response['access_token'];

// Refresh token (iOS/Android only)
const refreshResponse = await GenericOAuth2.refreshToken({
  appId: 'your-client-id',
  accessTokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
  refreshToken: 'your-refresh-token',
});

// Logout
await GenericOAuth2.logout();
```

## Notes

- Supports implicit flow (`responseType: "token"`) and code flow with PKCE (`responseType: "code"`, `pkceEnabled: true`).
- Code flow without PKCE is intentionally not supported for security reasons (would require storing client secret in client code).
- Platform-specific options (`web`, `android`, `ios` objects) override base parameters.
- If `accessTokenEndpoint` is empty, the authorization code is returned directly.
- If both `accessTokenEndpoint` and `resourceUrl` are empty/null, only tokens are returned (useful for `id_token` JWT).
- `refreshToken()` is only available on iOS and Android.
- The `logout()` method has known issues. See [Issue #97](https://github.com/capacitor-community/generic-oauth2/issues/97) for workarounds.
- Android supports custom OAuth handler classes via `android.customHandlerClass` for provider SDKs (e.g., Facebook).
- iOS supports custom OAuth handler classes via `ios.customHandlerClass`.
- Tested with Google, Facebook, Azure AD / Azure AD B2C, and Apple (iOS 13+ only).
