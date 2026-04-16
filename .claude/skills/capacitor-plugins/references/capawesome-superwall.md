# Superwall

Unofficial Capacitor plugin for the Superwall SDK for remotely-configured paywalls, feature gating, and subscription management.

**Package:** `@capawesome/capacitor-superwall`
**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-superwall
npx cap sync
```

## Configuration

### Android

#### Variables

The plugin uses the following variable in `android/app/variables.gradle`:

- `$superwallAndroidVersion` version of `com.superwall.sdk:superwall-android` (default: `2.6.6`)

#### Manifest

Add required activities to `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
  android:name="com.superwall.sdk.paywall.view.SuperwallPaywallActivity"
  android:theme="@style/Theme.MaterialComponents.DayNight.NoActionBar"
  android:configChanges="orientation|screenSize|keyboardHidden">
</activity>
<activity android:name="com.superwall.sdk.debug.DebugViewActivity" />
<activity android:name="com.superwall.sdk.debug.localizations.SWLocalizationActivity" />
<activity android:name="com.superwall.sdk.debug.SWConsoleActivity" />
```

Set your app's theme in the `android:theme` attribute of `SuperwallPaywallActivity`.

## Usage

### Configure the SDK

```typescript
import { Superwall } from '@capawesome/capacitor-superwall';

await Superwall.configure({
  apiKey: 'pk_your_api_key_here',
  options: {
    paywalls: { shouldPreload: true, automaticallyDismiss: true },
    logging: { level: 'WARN', scopes: ['ALL'] },
  },
});
```

### Show a paywall

```typescript
import { Superwall } from '@capawesome/capacitor-superwall';

const result = await Superwall.register({
  placement: 'premium_feature',
  params: { user_level: 5, source: 'settings' },
});
console.log('Result:', result.result); // 'PURCHASED', 'CANCELLED', or 'RESTORED'
```

### Identify users and set attributes

```typescript
import { Superwall } from '@capawesome/capacitor-superwall';

await Superwall.identify({ userId: 'user_123' });

await Superwall.setUserAttributes({
  attributes: { username: 'john_doe', subscription_tier: 'free' },
});

const { status } = await Superwall.getSubscriptionStatus();
console.log('Status:', status); // 'ACTIVE', 'INACTIVE', or 'UNKNOWN'
```

### Listen for events

```typescript
import { Superwall } from '@capawesome/capacitor-superwall';

await Superwall.addListener('superwallEvent', (event) => {
  console.log('Event:', event.type, event.data);
});

await Superwall.addListener('subscriptionStatusDidChange', (event) => {
  console.log('Status changed:', event.status);
});

await Superwall.addListener('paywallPresented', (event) => {
  console.log('Paywall shown:', event.paywallInfo.placement);
});
```

## Notes

- `configure()` must be called once before all other methods.
- `register()` is the primary method for feature gating and paywall presentation.
- `getPresentationResult()` checks if a paywall would be shown without presenting it.
- `reset()` clears identity and paywall assignments (use on logout).
- User attribute keys starting with `$` are reserved for Superwall use.
- Events: `superwallEvent`, `subscriptionStatusDidChange`, `paywallPresented`, `paywallWillDismiss`, `paywallDismissed`, `customPaywallAction`.
- This plugin is not affiliated with or endorsed by Superwall / Nest 22, Inc.
