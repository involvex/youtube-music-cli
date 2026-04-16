# FCM

Capacitor community plugin for enabling Firebase Cloud Messaging capabilities.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/fcm
npx cap sync
```

## Configuration

This plugin is intended to be used together with `@capacitor/push-notifications`. Capacitor only provides APN tokens, whereas this plugin offers the possibility to work with FCM tokens and topics.

### iOS

1. Download `GoogleService-Info.plist` from the Firebase console and add it to the `ios/App/App/` directory.
2. Optionally disable method swizzling by adding to `ios/App/App/Info.plist`:

```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<string>NO</string>
```

### Android

1. Download `google-services.json` from the Firebase console and copy it to `android/app/`.
2. This plugin uses the following project variable (defined in `android/variables.gradle`):
   - `$firebaseMessagingVersion` - version of `com.google.firebase:firebase-messaging` (default: `25.0.1`)

## Usage

```typescript
import { FCM } from '@capacitor-community/fcm';
import { PushNotifications } from '@capacitor/push-notifications';

// First, register for push notifications
await PushNotifications.requestPermissions();
await PushNotifications.register();

// Subscribe to a topic
await FCM.subscribeTo({ topic: 'news' });

// Unsubscribe from a topic
await FCM.unsubscribeFrom({ topic: 'news' });

// Get FCM token (instead of the APN token returned by Capacitor)
const { token } = await FCM.getToken();

// Delete the old FCM token and get a new one
const { token: newToken } = await FCM.refreshToken();

// Remove FCM instance completely
await FCM.deleteInstance();

// Enable/disable auto initialization
await FCM.setAutoInit({ enabled: true });
const { enabled } = await FCM.isAutoInitEnabled();
```

## Notes

- Must be used alongside `@capacitor/push-notifications` for push registration.
- Provides FCM-specific features (topics, FCM tokens) on top of the standard Capacitor push notification API.
- Auto initialization can be disabled to implement opt-in behavior. See the Firebase docs for [iOS](https://firebase.google.com/docs/cloud-messaging/ios/client#prevent_auto_initialization) and [Android](https://firebase.google.com/docs/cloud-messaging/android/client#prevent-auto-init).
