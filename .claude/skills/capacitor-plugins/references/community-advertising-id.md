# Advertising ID

Access the IDFA (iOS) and GAID (Android) advertising identifiers.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/advertising-id
npx cap sync
```

## Configuration

### iOS

Add the following usage description to `ios/App/App/Info.plist`:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>This app uses your advertising identifier to provide personalized ads.</string>
```

### Android

This plugin uses the following project variable (defined in `android/variables.gradle`):

- `playServicesAdsId` - version of `com.google.android.gms:play-services-ads-identifier` (default: `18.2.0`)

## Usage

```typescript
import { AdvertisingId } from '@capacitor-community/advertising-id';

// Request tracking authorization (iOS only, no-op on Android)
const { value } = await AdvertisingId.requestTracking();

// Get the advertising ID and tracking status
const { id, status } = await AdvertisingId.getAdvertisingId();

// Get only the tracking status
const { status: currentStatus } = await AdvertisingId.getAdvertisingStatus();
```

## Notes

- `requestTracking()` triggers the App Tracking Transparency prompt on iOS. On Android it is a no-op.
- `AdvertisingStatus` can be `'Authorized'`, `'Denied'`, `'Not Determined'`, or `'Restricted'`.
- On iOS, `NSUserTrackingUsageDescription` is required to use `requestTracking()`.
