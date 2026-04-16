# In App Review

Capacitor plugin for prompting users to submit app store reviews using native in-app review dialogs.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/in-app-review
npx cap sync
```

### Android

#### Variables

This plugin uses the following project variable (defined in `android/variables.gradle`):

- `googleAndroidPlayReviewVersion`: version of `com.google.android.play:review` (default: `2.0.2`)

## Usage

```typescript
import { InAppReview } from '@capacitor-community/in-app-review';

await InAppReview.requestReview();
```

## Notes

- The review dialog is shown using the native UI provided by iOS (StoreKit) and Android (Google Play In-App Review API).
- Both platforms have strict guidelines limiting when and how often the dialog appears. The OS may choose not to show it.
- During development, if the dialog does not appear, verify your test environment is set up correctly:
  - Android: https://developer.android.com/guide/playcore/in-app-review/test
  - iOS: https://developer.apple.com/documentation/storekit/skstorereviewcontroller/3566727-requestreview#4278434
