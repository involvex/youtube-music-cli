---
name: capacitor-push-notifications
description: "Guides the agent through setting up and using push notifications in Capacitor apps using Firebase Cloud Messaging via the @capacitor-firebase/messaging plugin. Covers Firebase project setup, plugin installation, platform-specific configuration (Android, iOS, Web), APNs certificate setup, requesting permissions, retrieving FCM tokens, listening for notifications, topic subscriptions, notification channels, and testing. Do not use for local notifications, non-Firebase push providers, migrating Capacitor apps or plugins, or non-Capacitor mobile frameworks."
---

# Capacitor Push Notifications

Set up and use push notifications in Capacitor apps using Firebase Cloud Messaging (FCM) via the `@capacitor-firebase/messaging` plugin.

## Prerequisites

1. **Capacitor 6, 7, or 8** app.
2. Node.js and npm installed.
3. A **Firebase project**. Create one at [Firebase console](https://console.firebase.google.com/) if needed.
4. For **iOS**: A paid [Apple Developer Program](https://developer.apple.com/programs/) membership and Xcode installed.
5. For **Android**: Android Studio installed.
6. `@capacitor/push-notifications` must **not** be installed — it conflicts with `@capacitor-firebase/messaging`.

## Agent Behavior

- **Guide step-by-step.** Walk the user through the process one step at a time. Never present multiple unrelated questions at once.
- **Auto-detect before asking.** Check the project for platforms (`android/`, `ios/`), build tools, framework, and `package.json` dependencies. Only ask the user when something cannot be detected.
- **One decision at a time.** When a step requires user input, ask that single question, wait for the answer, then continue.
- **Present clear options.** Provide concrete choices (e.g., "Do you want to configure topic subscriptions? (yes/no)") instead of open-ended questions.

## Procedures

### Step 1: Analyze the Project

Auto-detect the following by reading project files — do **not** ask the user for information that can be inferred:

1. **Platforms**: Check which directories exist (`android/`, `ios/`). These are the platforms to configure.
2. **Build tool / framework**: Check for `vite.config.ts`, `angular.json`, `webpack.config.js`, `next.config.js`, etc.
3. **Capacitor version**: Read `@capacitor/core` version from `package.json`.
4. **Conflicting plugins**: Check if `@capacitor/push-notifications` is in `package.json`. If found, warn the user it must be removed before proceeding:
   ```bash
   npm uninstall @capacitor/push-notifications
   ```

### Step 2: Set Up Firebase

Check if Firebase is already configured in the project:

- **Android**: Check if `android/app/google-services.json` exists.
- **iOS**: Check if `ios/App/App/GoogleService-Info.plist` exists.

If Firebase is **not** configured for a detected platform, read `references/firebase-setup.md` and guide the user through the Firebase setup for each missing platform.

### Step 3: Install the Plugin

```bash
npm install @capacitor-firebase/messaging firebase
npx cap sync
```

### Step 4: Configure Android

Skip if `android/` does not exist.

Read `references/android-setup.md` and apply the Android-specific configuration.

### Step 5: Configure iOS

Skip if `ios/` does not exist.

Read `references/ios-setup.md` and apply the iOS-specific configuration. This includes APNs key/certificate setup, `AppDelegate.swift` modifications, and enabling capabilities.

### Step 6: Configure Web (if applicable)

If the project targets the web (detected via build tool config or user confirmation):

Read `references/web-setup.md` and apply the Web-specific configuration.

### Step 7: Configure Capacitor Plugin Options

Ask the user if they want to customize iOS foreground notification presentation. If yes, update `capacitor.config.json` or `capacitor.config.ts`:

```json
{
  "plugins": {
    "FirebaseMessaging": {
      "presentationOptions": ["alert", "badge", "sound"]
    }
  }
}
```

Available options: `badge`, `sound`, `alert`, `criticalAlert`. Default is `["alert", "badge", "sound"]`.

### Step 8: Add Push Notification Code

Read `references/implementation.md` and add the push notification code to the project. Adapt imports and structure to match the user's framework.

The implementation covers:
1. Requesting permissions
2. Retrieving the FCM token
3. Listening for incoming notifications
4. Handling notification taps

### Step 9: Configure Optional Features

Ask the user which optional features to enable:

1. **Topic subscriptions** — Subscribe/unsubscribe to FCM topics (Android/iOS only).
2. **Notification channels** — Create custom Android notification channels (Android SDK 26+ only).
3. **Token refresh listener** — Listen for FCM token changes.

For each selected feature, read `references/implementation.md` and apply the relevant code.

### Step 10: Sync and Test

1. Sync the project:
   ```bash
   npx cap sync
   ```

2. Read `references/testing.md` and guide the user through sending a test notification via the Firebase Console.

## Error Handling

- **`@capacitor/push-notifications` conflict**: The `@capacitor-firebase/messaging` plugin cannot coexist with `@capacitor/push-notifications`. Uninstall the conflicting plugin: `npm uninstall @capacitor/push-notifications && npx cap sync`.
- **iOS: No push notifications received**: Verify APNs key/certificate is uploaded to Firebase Console. Verify Push Notifications and Background Modes capabilities are enabled. Verify `AppDelegate.swift` contains the required delegate methods.
- **iOS: `didRegisterForRemoteNotificationsWithDeviceToken` not called**: Ensure the Push Notifications capability is added in Xcode under Signing & Capabilities. Check that the app's bundle ID matches the one registered in Firebase and Apple Developer portal.
- **Android: No push notifications received**: Verify `google-services.json` is at `android/app/google-services.json`. Verify the Google services Gradle plugin is applied.
- **Android: White square notification icon**: The notification icon must be white pixels on a transparent background. Application icons with color will render as a white square. Add a dedicated push notification icon.
- **Web: `getToken()` fails**: Ensure the VAPID key is correct. Ensure `firebase-messaging-sw.js` exists at the root of the domain. Check that the browser supports the Push API.
- **FCM token is `null`**: Ensure `requestPermissions()` was called and returned `granted` before calling `getToken()`. On iOS, verify the device is not a simulator (simulators cannot receive push notifications).
- **`checkPermissions()` returns `denied`**: The user has permanently denied notification permissions. Guide them to re-enable via device settings (Settings > App > Notifications).
- **Android 13+: No permission prompt**: On Android 13 (API 33) and above, `requestPermissions()` must be called explicitly. Earlier Android versions grant notification permission by default.
