# Firebase Analytics

Capacitor plugin for native Firebase Analytics.

**Package:** `@capacitor-community/firebase-analytics`

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/firebase-analytics
npx cap sync
```

## Configuration

### iOS

Download `GoogleService-Info.plist` from the Firebase console and add it to the `ios/App/App/` directory via Xcode (right-click the "App" folder and select "Add files to App").

### Android

Download `google-services.json` from the Firebase console and copy it to `android/app/`.

#### Variables

This plugin uses the following variable (defined in `android/app/variables.gradle`):

- `$firebaseAnalyticsVersion`: version of `com.google.firebase:firebase-analytics` (default: `21.2.2`)

## Usage

```typescript
import { FirebaseAnalytics } from '@capacitor-community/firebase-analytics';

// Web only: initialize Firebase
FirebaseAnalytics.initializeFirebase({
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
  measurementId: '...',
});

// Set user ID
await FirebaseAnalytics.setUserId({ userId: 'john_doe_123' });

// Set user property
await FirebaseAnalytics.setUserProperty({ name: 'favorite_food', value: 'pizza' });

// Log event
await FirebaseAnalytics.logEvent({
  name: 'select_content',
  params: {
    content_type: 'image',
    content_id: 'P12453',
  },
});

// Get app instance ID (Android/iOS only)
const { instanceId } = await FirebaseAnalytics.getAppInstanceId();

// Set screen name (Android/iOS only)
await FirebaseAnalytics.setScreenName({
  screenName: 'login',
  nameOverride: 'LoginScreen',
});

// Enable or disable analytics collection
await FirebaseAnalytics.setCollectionEnabled({ enabled: true });

// Set session timeout duration (in seconds, default: 18000)
await FirebaseAnalytics.setSessionTimeoutDuration({ duration: 10000 });

// Reset analytics data
await FirebaseAnalytics.reset();
```

## Notes

- `initializeFirebase()` is required on Web only. On Android and iOS, Firebase is initialized via the config files (`google-services.json` / `GoogleService-Info.plist`).
- `getAppInstanceId()`, `setScreenName()`, and `reset()` are not available on Web.
- `enable()` and `disable()` are deprecated; use `setCollectionEnabled()` instead.
