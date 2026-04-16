# Firebase SDK Setup

Required setup steps to add Firebase to a Capacitor project. Complete these **before** installing any `@capacitor-firebase/*` plugin.

**Prerequisite:** A Firebase project must already exist. If not, create one at [Firebase console](https://console.firebase.google.com/) (see [Create a Firebase project](https://firebase.google.com/docs/android/setup)).

## Android

### 1. Register your app with Firebase

1. Go to the [Firebase console](https://console.firebase.google.com/).
2. In the project overview page, click the **Android** icon (or **Add app** if an app already exists).
3. Enter your app's package name (the `appId` value from `capacitor.config.json` or `capacitor.config.ts`) in the **Android package name** field.
4. (Optional) Enter **App nickname** and **Debug signing certificate SHA-1**.
5. Click **Register app**.

### 2. Add the Firebase configuration file

1. Click **Download google-services.json**.
2. Move the file to `android/app/google-services.json`.

### 3. Add the Google services Gradle plugin

1. In the **root-level** Gradle file (`android/build.gradle`), add the Google services plugin as a buildscript dependency:

```diff
 buildscript {
     dependencies {
+        classpath 'com.google.gms:google-services:4.4.2'
     }
 }
```

2. In the **app-level** Gradle file (`android/app/build.gradle`), apply the plugin:

```diff
 apply plugin: 'com.android.application'
+apply plugin: 'com.google.gms.google-services'
```

## iOS

### 1. Register your app with Firebase

1. Go to the [Firebase console](https://console.firebase.google.com/).
2. In the project overview page, click the **iOS+** icon (or **Add app** if an app already exists).
3. Enter your app's bundle ID (the `appId` value from `capacitor.config.json` or `capacitor.config.ts`) in the **bundle ID** field.
4. (Optional) Enter **App nickname** and **App Store ID**.
5. Click **Register app**.

### 2. Add the Firebase configuration file

1. Click **Download GoogleService-Info.plist**.
2. Move the file to `ios/App/App/GoogleService-Info.plist`.
3. In Xcode, drag `ios/App/App/GoogleService-Info.plist` into the Xcode file explorer under `App/App`. If prompted, select to add the config file to all targets.

## Web

### 1. Register your app with Firebase

1. Go to the [Firebase console](https://console.firebase.google.com/).
2. In the project overview page, click the **Web** icon (or **Add app** if an app already exists).
3. Enter an **App nickname**.
4. Click **Register app**.
5. Follow the on-screen instructions to add and initialize the Firebase SDK in your app.
