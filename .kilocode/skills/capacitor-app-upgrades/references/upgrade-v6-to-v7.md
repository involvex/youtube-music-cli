# Upgrade: Capacitor 6 → 7

## Step 1: Attempt Automated Upgrade

```bash
npm i -D @capacitor/cli@latest-7
npx cap migrate
```

If the automated upgrade completes successfully, skip to **Step 7** to update plugins.
If any steps fail, continue with the manual steps below.

## Step 2: Update Capacitor Dependencies

```bash
npm i @capacitor/core@latest-7
npm i -D @capacitor/cli@latest-7
npm i @capacitor/android@latest-7 @capacitor/ios@latest-7
```

## Step 3: Update Android Project Variables

In `android/variables.gradle`:

```groovy
minSdkVersion = 23
compileSdkVersion = 35
targetSdkVersion = 35
androidxActivityVersion = '1.9.2'
androidxAppCompatVersion = '1.7.0'
androidxCoordinatorLayoutVersion = '1.2.0'
androidxCoreVersion = '1.15.0'
androidxFragmentVersion = '1.8.4'
coreSplashScreenVersion = '1.0.1'
androidxWebkitVersion = '1.12.1'
junitVersion = '4.13.2'
androidxJunitVersion = '1.2.1'
androidxEspressoCoreVersion = '3.6.1'
cordovaAndroidVersion = '10.1.1'
```

## Step 4: Update Android Gradle Configuration

### 4a: Update Gradle plugin to 8.7.2

In `android/build.gradle`:

```diff
 dependencies {
-    classpath 'com.android.tools.build:gradle:8.2.1'
+    classpath 'com.android.tools.build:gradle:8.7.2'
 }
```

### 4b: Update Google Services plugin (if used)

```diff
-classpath 'com.google.gms:google-services:4.4.0'
+classpath 'com.google.gms:google-services:4.4.2'
```

### 4c: Update Gradle wrapper to 8.11.1

In `android/gradle/wrapper/gradle-wrapper.properties`:

```diff
-distributionUrl=https\://services.gradle.org/distributions/gradle-8.2.1-all.zip
+distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-all.zip
```

### 4d: Update Kotlin version (if used)

Update `kotlin_version` to `'1.9.25'`.

### 4e: Add navigation to configChanges (optional)

To prevent app restarts on some devices when using bluetooth keyboards, add `navigation` to `configChanges` in `AndroidManifest.xml`:

```diff
-android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
+android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
```

## Step 5: Update iOS Configuration

### 5a: Raise iOS deployment target to 14.0

In `ios/App/App.xcodeproj/project.pbxproj`, update **all** occurrences of `IPHONEOS_DEPLOYMENT_TARGET` from `13.0` to `14.0`:

```diff
-IPHONEOS_DEPLOYMENT_TARGET = 13.0;
+IPHONEOS_DEPLOYMENT_TARGET = 14.0;
```

There are typically 4 occurrences (Debug and Release for both the project and the app target). Update all of them.

### 5b: Update Podfile

In `ios/App/Podfile`:

```diff
-platform :ios, '13.0'
+platform :ios, '14.0'
```

## Step 6: Handle Config Breaking Changes

- `bundledWebRuntime` has been removed. If set to `false`, safely remove it. If set to `true`, use a bundler to bundle `@capacitor/core` code within the app.
- `cordova.staticPlugins` has been removed. Plugins that need to be static should use `podspec` tag with `use-framework` attribute.

## Step 7: Update Official Plugins

Update all `@capacitor/*` plugins to v7.

### Official Plugin Breaking Changes

#### Action Sheet

- `androidxMaterialVersion` updated to `1.12.0`.

#### App

- Deprecated type `AppRestoredResult` removed, use `RestoredListenerEvent`.
- Deprecated type `AppUrlOpen` removed, use `URLOpenListenerEvent`.

#### Browser

- `androidxBrowserVersion` updated to `1.8.0`.

#### Camera

- `androidxExifInterfaceVersion` updated to `1.3.7`.
- `androidxMaterialVersion` updated to `1.12.0`.

#### Device

- `getInfo()` no longer returns `diskFree`, `diskTotal`, `realDiskFree`, and `realDiskTotal`. `PrivacyInfo.xcprivacy` entries for this plugin can be removed.
- Deprecated type `DeviceBatteryInfo` removed, use `BatteryInfo`.
- Deprecated type `DeviceLanguageCodeResult` removed, use `GetLanguageCodeResult`.

#### Geolocation

- `playServicesLocationVersion` updated to `21.3.0`.

#### Haptics

- Deprecated type `HapticsImpactOptions` removed, use `ImpactOptions`.
- Deprecated type `HapticsNotificationOptions` removed, use `NotificationOptions`.
- Deprecated type `HapticsNotificationType` removed, use `NotificationType`.
- Deprecated type `HapticsImpactStyle` removed, use `ImpactStyle`.

#### Push Notifications

- `firebaseMessagingVersion` updated to `24.1.0`.

#### Share

- `androidxCoreVersion` updated to `1.15.0`.

#### Splash Screen

- Deprecated type `SplashScreenShowOptions` removed, use `ShowOptions`.
- Deprecated type `SplashScreenHideOptions` removed, use `HideOptions`.

#### Status Bar

- `setOverlaysWebView()` and `setBackgroundColor()` are now supported on iOS.
- `androidxCoreVersion` updated to `1.15.0`.

## Step 8: Sync and Test

```bash
npx cap sync
npx cap run android
npx cap run ios
```

## Error Handling

* If `npx cap migrate` fails partially, apply the failed steps manually.
* If Android build fails, run **Tools > AGP Upgrade Assistant** in Android Studio.
* If iOS build fails, verify the deployment target is set to 14.0 in both the Xcode project and the Podfile.
* Telemetry is now opt-out for new users. Disable with `npx cap telemetry off`.
