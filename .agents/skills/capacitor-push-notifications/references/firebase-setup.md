# Firebase Project Setup for Push Notifications

Complete these steps for each platform that needs Firebase configuration.

## Android

### 1. Register the Android App

1. Go to the [Firebase console](https://console.firebase.google.com/).
2. Open the project and click the **Android** icon (or **Add app**).
3. Enter the app's package name (the `appId` from `capacitor.config.json` or `capacitor.config.ts`) in the **Android package name** field.
4. Click **Register app**.

### 2. Download the Configuration File

1. Click **Download google-services.json**.
2. Move the file to `android/app/google-services.json`.

### 3. Add the Google Services Gradle Plugin

In the **root-level** Gradle file `android/build.gradle`, add the Google services plugin as a dependency:

```diff
 buildscript {
     dependencies {
+        classpath 'com.google.gms:google-services:4.4.2'
     }
 }
```

In the **app-level** Gradle file `android/app/build.gradle`, apply the plugin:

```diff
 apply plugin: 'com.android.application'
+apply plugin: 'com.google.gms.google-services'
```

## iOS

### 1. Register the iOS App

1. Go to the [Firebase console](https://console.firebase.google.com/).
2. Open the project and click the **iOS+** icon (or **Add app**).
3. Enter the app's bundle ID (the `appId` from `capacitor.config.json` or `capacitor.config.ts`) in the **bundle ID** field.
4. Click **Register app**.

### 2. Download the Configuration File

1. Click **Download GoogleService-Info.plist**.
2. Move the file to `ios/App/App/GoogleService-Info.plist`.

### 3. Create an APNs Key

Apple Push Notification service (APNs) keys are required for iOS push notifications.

1. Go to [Apple Developer — Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Click the **+** button to create a new key.
3. Enter a key name (e.g., "Push Notifications Key").
4. Check **Apple Push Notifications service (APNs)**.
5. Click **Continue**, then **Register**.
6. **Download the `.p8` key file** and note the **Key ID** displayed on the confirmation page.
7. Note your **Team ID** from [Apple Developer — Membership](https://developer.apple.com/account/#/membership/).

### 4. Upload the APNs Key to Firebase

1. In the [Firebase console](https://console.firebase.google.com/), go to **Project settings** > **Cloud Messaging** tab.
2. Under **Apple app configuration**, click **Upload** next to **APNs Authentication Key**.
3. Upload the `.p8` file downloaded in the previous step.
4. Enter the **Key ID** and **Team ID**.
5. Click **Upload**.

## Web

### 1. Register the Web App

1. Go to the [Firebase console](https://console.firebase.google.com/).
2. Open the project and click the **Web** icon (or **Add app**).
3. Enter an **App nickname**.
4. Click **Register app**.
5. Copy the Firebase configuration object for use in the app.

### 2. Generate a VAPID Key

1. In the Firebase console, go to **Project settings** > **Cloud Messaging** tab.
2. Under **Web configuration**, click **Generate key pair**.
3. Copy the generated VAPID key for use in the app.
