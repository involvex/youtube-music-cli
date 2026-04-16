# Upgrade: Capacitor 7 → 8

## Step 1: Attempt Automated Upgrade

The Capacitor CLI provides an automated upgrade command. Try this first:

```bash
npm i -D @capacitor/cli@latest
npx cap migrate
```

If the automated upgrade completes successfully, skip to **Step 8** to update plugins.
If any steps fail, the CLI will report which ones. Continue with the manual steps below for those.

## Step 2: Update Capacitor Dependencies

Update all `@capacitor/*` packages to v8:

```bash
npm i @capacitor/core@latest
npm i -D @capacitor/cli@latest
npm i @capacitor/android@latest @capacitor/ios@latest
```

Update any official Capacitor plugins to their latest v8 versions as well.

## Step 3: Update Android Project Variables

Open `android/variables.gradle` and update to the following minimum values:

```groovy
minSdkVersion = 24
compileSdkVersion = 36
targetSdkVersion = 36
androidxActivityVersion = '1.11.0'
androidxAppCompatVersion = '1.7.1'
androidxCoordinatorLayoutVersion = '1.3.0'
androidxCoreVersion = '1.17.0'
androidxFragmentVersion = '1.8.9'
coreSplashScreenVersion = '1.2.0'
androidxWebkitVersion = '1.14.0'
junitVersion = '4.13.2'
androidxJunitVersion = '1.3.0'
androidxEspressoCoreVersion = '3.7.0'
cordovaAndroidVersion = '14.0.1'
```

## Step 4: Update Android Gradle Configuration

### 4a: Update Gradle plugin to 8.13.0

In `android/build.gradle`, update the Android Gradle plugin:

```diff
 dependencies {
-    classpath 'com.android.tools.build:gradle:8.7.2'
+    classpath 'com.android.tools.build:gradle:8.13.0'
 }
```

### 4b: Update Google Services plugin (if used)

```diff
 dependencies {
-    classpath 'com.google.gms:google-services:4.4.2'
+    classpath 'com.google.gms:google-services:4.4.4'
 }
```

### 4c: Update Gradle wrapper to 8.14.3

In `android/gradle/wrapper/gradle-wrapper.properties`:

```diff
-distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-all.zip
+distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-all.zip
```

### 4d: Replace deprecated Gradle property syntax

Gradle has deprecated space-assignment syntax. Replace with `=` assignment in `android/app/build.gradle`:

```diff
 android {
-    namespace "com.getcapacitor.myapp"
-    compileSdk rootProject.ext.compileSdkVersion
+    namespace = "com.getcapacitor.myapp"
+    compileSdk = rootProject.ext.compileSdkVersion
     defaultConfig {
         aaptOptions {
-            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
+            ignoreAssetsPattern = '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
         }
     }
 }
```

### 4e: Update Kotlin version (if used)

If the project uses Kotlin, update `kotlin_version` to `'2.2.20'`.

### 4f: Add density to configChanges

In `android/app/src/main/AndroidManifest.xml`, add `density` to the activity's `configChanges`:

```diff
-android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
+android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
```

## Step 5: Update iOS Configuration

### 5a: Raise iOS deployment target to 15.0

In `ios/App/App.xcodeproj/project.pbxproj`, update **all** occurrences of `IPHONEOS_DEPLOYMENT_TARGET` from `14.0` to `15.0`:

```diff
-IPHONEOS_DEPLOYMENT_TARGET = 14.0;
+IPHONEOS_DEPLOYMENT_TARGET = 15.0;
```

There are typically 4 occurrences (Debug and Release for both the project and the app target). Update all of them.

### 5b: Update Podfile (if using CocoaPods)

In `ios/App/Podfile`:

```diff
-platform :ios, '14.0'
+platform :ios, '15.0'
```

## Step 6: Handle Capacitor Config Breaking Changes

- `android.adjustMarginsForEdgeToEdge` has been removed. Use the new `@capacitor/system-bars` plugin instead.
- `appendUserAgent` on iOS: a bug that appended two whitespaces has been fixed. If the previous behavior is needed, add an extra whitespace on `ios.appendUserAgent` (not on root `appendUserAgent`).

## Step 7: Handle Android Breaking Change

`bridge_layout_main.xml` has been removed. If referenced anywhere, use `capacitor_bridge_layout_main.xml` instead.

## Step 8: Update Official Plugins

Update all official Capacitor plugins to v8:

```bash
npm i @capacitor/app@latest @capacitor/haptics@latest @capacitor/keyboard@latest @capacitor/status-bar@latest
```

Repeat for all `@capacitor/*` plugins used in the project.

### Official Plugin Breaking Changes

#### Action Sheet

- `androidxMaterialVersion` updated to `1.13.0`.

#### Barcode Scanner

- `scanOrientation` has no effect on large screens (tablets) on Android 16+. Opt-out temporarily by adding to `AndroidManifest.xml` inside `<application>` or `<activity>`:
  ```xml
  <property android:name="android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY" android:value="true" />
  ```
  This opt-out will stop working on Android 17. Regular phones are unaffected.

#### Browser

- `androidxBrowserVersion` updated to `1.9.0`.

#### Camera

- `androidxExifInterfaceVersion` updated to `1.4.1`.
- `androidxMaterialVersion` updated to `1.13.0`.

#### Geolocation

- `kotlinxCoroutinesVersion` updated to `1.10.2`.
- `timeout` now applies to all requests on Android and iOS (previously only web and `getCurrentPosition` on Android). Increase `timeout` if experiencing timeouts. For `watchPosition` on Android, use the new `interval` parameter.

#### Google Maps

- `googleMapsPlayServicesVersion` updated to `19.2.0`.
- `googleMapsUtilsVersion` updated to `3.19.1`.
- `googleMapsKtxVersion` updated to `5.2.1`.
- `googleMapsUtilsKtxVersion` updated to `5.2.1`.
- `kotlinxCoroutinesVersion` updated to `1.10.2`.
- `androidxCoreKTXVersion` updated to `1.17.0`.
- `kotlin_version` updated to `2.2.20`.

#### Push Notifications

- `firebaseMessagingVersion` updated to `25.0.1`.

#### Screen Orientation

- `lock` method has no effect on large screens (tablets) on Android 16+. Same opt-out as Barcode Scanner applies.

#### Splash Screen

- `coreSplashScreenVersion` updated to `1.2.0`.

#### Status Bar

- `CAPNotifications.swift` and `CAPBridgeViewController.swift` that emitted `.capacitorViewDidAppear` and `.capacitorViewWillTransition` events have been removed. Listen for these events from `@capacitor/ios` instead.

## Step 9: Sync and Test

```bash
npx cap sync
```

Build and run on both platforms to verify:

```bash
npx cap run android
npx cap run ios
```

## Error Handling

* If `npx cap migrate` fails partially, check the terminal output for which steps failed and apply those manually using the steps above.
* If Android build fails after upgrade, run **Tools > AGP Upgrade Assistant** in Android Studio and select version `8.13.0`.
* If iOS build fails, verify the deployment target is set to 15.0 in both the Xcode project settings and the Podfile.
* If Gradle property syntax warnings appear, search all `.gradle` files for property assignments without `=` and update them.
