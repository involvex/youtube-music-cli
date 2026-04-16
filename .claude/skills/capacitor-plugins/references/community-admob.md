# AdMob

Capacitor plugin for native Google AdMob ads (banner, interstitial, rewarded video, rewarded interstitial).

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/admob
npx cap sync
```

## Configuration

### Android

Add the AdMob Application ID to `android/app/src/main/AndroidManifest.xml` under `<manifest><application>`:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="@string/admob_app_id"/>
```

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<string name="admob_app_id">[APP_ID]</string>
```

Replace `[APP_ID]` with your AdMob Application ID.

#### Variables

This plugin uses the following project variables (defined in `android/variables.gradle`):

- `playServicesAdsVersion`: version of `com.google.android.gms:play-services-ads` (default: `23.0.0`)
- `androidxCoreKTXVersion`: version of `androidx.core:core-ktx` (default: `1.13.0`)

### iOS

Add the following to `ios/App/App/Info.plist` inside the outermost `<dict>`:

```xml
<key>GADIsAdManagerApp</key>
<true/>
<key>GADApplicationIdentifier</key>
<string>[APP_ID]</string>
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
<key>NSUserTrackingUsageDescription</key>
<string>This identifier will be used to deliver personalized ads to you.</string>
```

Replace `[APP_ID]` with your AdMob Application ID.

## Usage

### Initialize

```typescript
import { AdMob } from '@capacitor-community/admob';

await AdMob.initialize();
```

### Banner Ad

```typescript
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

const options: BannerAdOptions = {
  adId: 'YOUR_AD_UNIT_ID',
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
};
await AdMob.showBanner(options);

// Hide, resume, or remove
await AdMob.hideBanner();
await AdMob.resumeBanner();
await AdMob.removeBanner();
```

### Interstitial Ad

```typescript
import { AdMob, AdOptions } from '@capacitor-community/admob';

const options: AdOptions = { adId: 'YOUR_AD_UNIT_ID' };
await AdMob.prepareInterstitial(options);
await AdMob.showInterstitial();
```

### Rewarded Video Ad

```typescript
import { AdMob, RewardAdOptions, RewardAdPluginEvents } from '@capacitor-community/admob';

AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
  console.log('User earned reward:', reward.type, reward.amount);
});

const options: RewardAdOptions = { adId: 'YOUR_AD_UNIT_ID' };
await AdMob.prepareRewardVideoAd(options);
await AdMob.showRewardVideoAd();
```

### User Consent (UMP/GDPR)

```typescript
import { AdMob } from '@capacitor-community/admob';

const consentInfo = await AdMob.requestConsentInfo();
if (consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED') {
  await AdMob.showConsentForm();
}
```

## Notes

- Always call `AdMob.initialize()` before showing ads.
- The recommended initialization order is: `initialize()` -> `requestConsentInfo()` -> `showConsentForm()` (if required) -> show ads.
- Supports Server-Side Verification (SSV) for rewarded ads via the `ssv` option on `RewardAdOptions`.
- `BannerAdSize` options: `ADAPTIVE_BANNER` (default), `BANNER`, `FULL_BANNER`, `LARGE_BANNER`, `MEDIUM_RECTANGLE`, `LEADERBOARD`, `SMART_BANNER`.
- iOS tracking authorization can be managed via `trackingAuthorizationStatus()` and `requestTrackingAuthorization()`.
- If you encounter a CocoaPods error for `Google-Mobile-Ads-SDK`, run `pod repo update`.
