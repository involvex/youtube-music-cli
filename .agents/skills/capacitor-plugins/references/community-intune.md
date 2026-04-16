# Intune

Microsoft Intune MAM/MDM Capacitor plugin for mobile application management.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/intune
npx cap sync
```

Requires Capacitor 8.0.0 or above.

## Configuration

### Android

#### Gradle Plugin Setup

1. In `android/build.gradle` (project-level), add the Intune Gradle plugin dependencies inside `buildscript > dependencies`:

```groovy
buildscript {
    dependencies {
        // ...existing dependencies...
        classpath "org.javassist:javassist:3.29.2-GA"
        classpath files("../node_modules/@capacitor-community/intune/android/ms-intune-app-sdk-android/GradlePlugin/com.microsoft.intune.mam.build.jar")
    }
}
```

2. In the same file, add the Duo SDK Feed maven repo to `allprojects > repositories`:

```groovy
allprojects {
    repositories {
        google()
        jcenter()
        maven {
            url 'https://pkgs.dev.azure.com/MicrosoftDeviceSDK/DuoSDK-Public/_packaging/Duo-SDK-Feed/maven/v1'
            name 'Duo-SDK-Feed'
        }
    }
}
```

3. In `android/app/build.gradle` (module-level), apply the plugin and add the SDK dependency:

```groovy
apply plugin: 'com.microsoft.intune.mam'
```

```groovy
dependencies {
    // ...existing dependencies...
    implementation files("../../node_modules/@capacitor-community/intune/android/ms-intune-app-sdk-android/Microsoft.Intune.MAM.SDK.aar")
}
```

4. In `android/gradle.properties`, add:

```properties
android.enableResourceOptimizations=false
```

#### AndroidManifest.xml

In `android/app/src/main/AndroidManifest.xml`:

1. Set the `android:name` and `android:enableOnBackInvokedCallback` attributes on the `<application>` element:

```xml
<application
    android:name="com.getcapacitor.community.intune.IntuneApplication"
    android:enableOnBackInvokedCallback="false"
    ...>
```

2. Add brokered auth queries (required for Android 12+) inside the top-level `<manifest>`:

```xml
<queries>
    <package android:name="com.azure.authenticator" />
    <package android:name="YOUR_PACKAGE" />
    <package android:name="com.microsoft.windowsintune.companyportal" />
    <intent>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" />
    </intent>
    <intent>
        <action android:name="android.support.customtabs.action.CustomTabsService" />
    </intent>
</queries>
```

3. Add the MSAL BrowserTabActivity inside `<application>` (replace `YOUR_PACKAGE` and `YOUR_HASH`):

```xml
<activity android:name="com.microsoft.identity.client.BrowserTabActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:host="YOUR_PACKAGE"
            android:path="/YOUR_HASH"
            android:scheme="msauth" />
    </intent-filter>
</activity>
```

#### Auth Configuration

Create the file `android/app/src/main/res/raw/auth_config.json` with the JSON auth config from Azure AD (found at Azure Active Directory > App registrations > Your App > Authentication > Platform configurations > Android).

### iOS

Version 8.x requires iOS 17+ and Xcode 26+.

#### 1. Add Frameworks

Add the following frameworks to your app target in `ios/App/App.xcodeproj`:

- `AudioToolbox.framework`, `CoreServices.framework`, `ImageIO.framework`, `libc++.tbd`, `libsqlite3.tbd`, `LocalAuthentication.framework`, `MessageUI.framework`, `QuartzCore.framework`, `Security.framework`, `SystemConfiguration.framework`, `WebKit.framework`

#### 2. Configure Keychain

Add these keychain groups under Signing & Capabilities in `ios/App/App.xcodeproj`:

- `com.microsoft.intune.mam`
- `com.microsoft.adalcache`

#### 3. Info.plist

Add to `ios/App/App/Info.plist`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>msauthv2</string>
    <string>msauthv3</string>
    <string>mvisionmobile</string>
    <string>scmx</string>
    <string>lookoutwork-ase</string>
    <string>lacoonsecurity</string>
    <string>zips</string>
    <string>skycure</string>
    <string>smart-ns</string>
    <string>smsec</string>
    <string>betteractiveshield</string>
    <string>wandera</string>
    <string>https-intunemam</string>
    <string>http-intunemam</string>
    <string>intunemam-mtd</string>
    <string>microsoft-edge-https-intunemam</string>
    <string>microsoft-edge-http-intunemam</string>
    <string>ms-outlook-intunemam</string>
    <string>companyportal</string>
</array>

<key>NSFaceIDUsageDescription</key>
<string>Face ID is used for authentication.</string>
```

#### 4. Disable Bitcode

In `ios/App/Podfile`, add inside `post_install`:

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ENABLE_BITCODE'] = 'NO'
    end
  end
end
```

#### 5. Run IntuneMAMConfigurator

```bash
git clone https://github.com/msintuneappsdk/ms-intune-app-sdk-ios tmp --depth 1
cp tmp/IntuneMAMConfigurator .
rm -rf tmp
chmod +x IntuneMAMConfigurator
./IntuneMAMConfigurator -i ios/App/App/Info.plist -e ios/App/App/App.entitlements
```

#### 6. Configure MSAL in AppDelegate

In `ios/App/App/AppDelegate.swift`, import MSAL and override the URL handler:

```swift
import MSAL

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return MSALPublicClientApplication.handleMSALResponse(url, sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String)
    }
}
```

## Usage

```typescript
import { IntuneMAM } from '@capacitor-community/intune';

// Acquire token interactively
const authInfo = await IntuneMAM.acquireToken({
  scopes: ['https://graph.microsoft.com/.default'],
});

// Register and enroll in Intune
await IntuneMAM.registerAndEnrollAccount({
  accountId: authInfo.accountId,
});

// Acquire token silently on subsequent loads
const tokenInfo = await IntuneMAM.acquireTokenSilent({
  scopes: ['https://graph.microsoft.com/.default'],
  accountId: authInfo.accountId,
});

// Simple login without token (no MSAL token needed)
await IntuneMAM.loginAndEnrollAccount();

// Get enrolled account
const user = await IntuneMAM.enrolledAccount();

// Get app config and policy
const config = await IntuneMAM.appConfig(user);
const policy = await IntuneMAM.getPolicy(user);

// Listen for changes
IntuneMAM.addListener('appConfigChange', () => {
  console.log('App config changed');
});
IntuneMAM.addListener('policyChange', () => {
  console.log('Policy changed');
});

// Sign out
await IntuneMAM.deRegisterAndUnenrollAccount(user);

// Diagnostics
const { version } = await IntuneMAM.sdkVersion();
await IntuneMAM.displayDiagnosticConsole();
```

## Notes

- On iOS, `registerAndEnrollAccount` and `deRegisterAndUnenrollAccount` will close the app on success.
- Use `acquireToken` for interactive login, then `acquireTokenSilent` on subsequent loads. Fall back to `acquireToken` if silent acquisition fails.
- `forceRefresh: true` on `acquireTokenSilent` forces a new token instead of returning cached.
- `loginAndEnrollAccount` is for apps that do not need an MSAL token.
- `logoutOfAccount` signs out without wiping app data or closing the app (unlike `deRegisterAndUnenrollAccount`).
