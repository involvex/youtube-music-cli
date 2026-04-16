# Firebase Messaging

Unofficial Capacitor plugin for Firebase Cloud Messaging. Push notifications, topic subscriptions, channels.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/messaging firebase
npx cap sync
```

## Configuration

### Android

Set `firebaseMessagingVersion` in `variables.gradle` (default: `25.0.1`).

Add notification icon to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/push_icon_name" />
```

### iOS

Must NOT have `@capacitor/push-notifications` installed simultaneously.

Add to `ios/App/App/AppDelegate.swift`:

```swift
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
  NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
}

func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
  NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
}

func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
  NotificationCenter.default.post(name: Notification.Name.init("didReceiveRemoteNotification"), object: completionHandler, userInfo: userInfo)
}
```

### Capacitor Config (iOS)

```json
{
  "plugins": {
    "FirebaseMessaging": {
      "presentationOptions": ["alert", "badge", "sound"]
    }
  }
}
```

### Web

Configure Web Credentials with FCM (VAPID key). Add `firebase-messaging-sw.js` to root of domain.

## Usage

```typescript
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

await FirebaseMessaging.requestPermissions();
const { token } = await FirebaseMessaging.getToken();

await FirebaseMessaging.subscribeToTopic({ topic: 'news' });

await FirebaseMessaging.addListener('notificationReceived', (event) => {
  console.log('notificationReceived', event);
});
await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
  console.log('notificationActionPerformed', event);
});
```

## Notes

- `subscribeToTopic()` / `unsubscribeFromTopic()` are Android/iOS only.
- Notification channels are Android SDK 26+ only.
- On Android, `checkPermissions()` / `requestPermissions()` only needed on Android 13+.
