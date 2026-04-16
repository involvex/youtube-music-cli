# Facebook Login

Capacitor plugin for native Facebook Login.

**Package:** `@capacitor-community/facebook-login`

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/facebook-login
npx cap sync
```

## Configuration

### Android

In `android/app/src/main/AndroidManifest.xml`, add the following under `<manifest><application>`:

```xml
<meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id"/>
<meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token"/>
```

In `android/app/src/main/res/values/strings.xml`, add:

```xml
<string name="facebook_app_id">[APP_ID]</string>
<string name="facebook_client_token">[CLIENT_TOKEN]</string>
```

Replace `[APP_ID]` and `[CLIENT_TOKEN]` with your Facebook application credentials.

#### Variables

This plugin uses the following variable (defined in `android/app/variables.gradle`):

- `$facebookSDKVersion`: version of `com.facebook.android:facebook-login` (default: `18.1.3`)

### iOS

In `ios/App/Podfile`, add the Facebook SDK pod:

```diff
  target 'App' do
    capacitor_pods
    # Add your Pods here
+   pod 'FBSDKCoreKit'
  end
```

In `ios/App/App/AppDelegate.swift`, add the Facebook SDK initialization:

```swift
import UIKit
import Capacitor
import FBSDKCoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FBSDKCoreKit.ApplicationDelegate.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if (FBSDKCoreKit.ApplicationDelegate.shared.application(
            app,
            open: url,
            sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String,
            annotation: options[UIApplication.OpenURLOptionsKey.annotation]
        )) {
            return true
        } else {
            return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        }
    }
}
```

In `ios/App/App/Info.plist`, add the following inside the outermost `<dict>`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>fb[APP_ID]</string>
        </array>
    </dict>
</array>
<key>FacebookAppID</key>
<string>[APP_ID]</string>
<key>FacebookClientToken</key>
<string>[CLIENT_TOKEN]</string>
<key>FacebookDisplayName</key>
<string>[APP_NAME]</string>
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>fbapi</string>
    <string>fbapi20130214</string>
    <string>fbapi20130410</string>
    <string>fbapi20130702</string>
    <string>fbapi20131010</string>
    <string>fbapi20131219</string>
    <string>fbapi20140410</string>
    <string>fbapi20140116</string>
    <string>fbapi20150313</string>
    <string>fbapi20150629</string>
    <string>fbapi20160328</string>
    <string>fbauth</string>
    <string>fb-messenger-share-api</string>
    <string>fbauth2</string>
    <string>fbshareextension</string>
</array>
```

Replace `[APP_ID]`, `[CLIENT_TOKEN]`, and `[APP_NAME]` with your Facebook application credentials.

### Web

Initialize the Facebook SDK in your app after the DOM is ready:

```typescript
import { FacebookLogin } from '@capacitor-community/facebook-login';

await FacebookLogin.initialize({ appId: '105890006170720' });
```

## Usage

```typescript
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';

// Login
const FACEBOOK_PERMISSIONS = ['email', 'user_birthday', 'user_photos', 'user_gender'];
const result = await FacebookLogin.login({ permissions: FACEBOOK_PERMISSIONS });

if (result.accessToken) {
  console.log(`Facebook access token is ${result.accessToken.token}`);
}

// Get current access token
const tokenResult = await FacebookLogin.getCurrentAccessToken();

// Get user profile
const profile = await FacebookLogin.getProfile<{ email: string }>({
  fields: ['email'],
});

// Logout
await FacebookLogin.logout();
```

## Notes

- On Web, `initialize()` must be called before any other method.
- On Android and iOS, the SDK is initialized via the native configuration files.
- The `login()` method accepts an optional `tracking` parameter (`'limited'` or `'enabled'`) and an optional `nonce` for limited login on iOS.
- Additional methods: `logEvent()`, `setAutoLogAppEventsEnabled()`, `setAdvertiserTrackingEnabled()`, `setAdvertiserIDCollectionEnabled()`.
