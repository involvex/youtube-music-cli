# Firebase Analytics

Unofficial Capacitor plugin for Firebase Analytics. Tracks events, user properties, screens, and consent.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/analytics firebase
npx cap sync
```

## Configuration

### Android

Set `firebaseAnalyticsVersion` in `variables.gradle` (default: `23.0.0`).

### iOS

Add pod to `ios/App/Podfile` under `# Add your Pods here` (not in `def capacitor_pods`):

```ruby
pod 'CapacitorFirebaseAnalytics/Analytics', :path => '../../node_modules/@capacitor-firebase/analytics'
```

To disable IDFA collection, use `CapacitorFirebaseAnalytics/AnalyticsWithoutAdIdSupport` instead.

## Usage

```typescript
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

await FirebaseAnalytics.logEvent({
  name: 'sign_up',
  params: { method: 'password' },
});

await FirebaseAnalytics.setUserId({ userId: '123' });

await FirebaseAnalytics.setCurrentScreen({
  screenName: 'Login',
  screenClassOverride: 'LoginPage',
});
```

## Notes

- `getAppInstanceId()`, `resetAnalyticsData()`, `setSessionTimeoutDuration()` are Android/iOS only.
- `isEnabled()` is Web only.
- Consent mode supported via `setConsent()`.
