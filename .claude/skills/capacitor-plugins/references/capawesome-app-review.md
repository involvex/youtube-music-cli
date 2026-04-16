# App Review

Allow users to submit app store reviews and ratings via in-app review dialogs or by opening the app store page.

**Package:** `@capawesome/capacitor-app-review`
**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-app-review
npx cap sync
```

### Android

#### Variables

Optionally define in `android/variables.gradle`:

- `$androidPlayReviewVersion` version of `com.google.android.play:review` (default: `2.0.2`)

## Usage

### Request an in-app review

```typescript
import { AppReview } from '@capawesome/capacitor-app-review';

await AppReview.requestReview();
```

### Open the app store page

```typescript
import { AppReview } from '@capawesome/capacitor-app-review';

// Without options (opens current app's store page)
await AppReview.openAppStore();

// With specific app ID (iOS only)
await AppReview.openAppStore({ appId: '123456789' });
```

## Notes

- On iOS, `requestReview()` is limited to 3 requests per year by Apple.
- `requestReview()` is available on iOS 14+ and Android.
- `openAppStore()` opens the Play Store on Android and App Store on iOS.
- The `appId` option for `openAppStore()` is iOS-only (Apple ID from the app store URL).
- For testing in-app reviews, follow the platform-specific guides:
  - Android: https://developer.android.com/guide/playcore/in-app-review/test
  - iOS: https://developer.apple.com/documentation/storekit/skstorereviewcontroller/3566727-requestreview#4278434
