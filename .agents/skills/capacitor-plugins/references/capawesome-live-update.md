# Live Update

Capacitor plugin for Over-the-Air (OTA) updates. Download and apply web asset bundles without app store submissions.

**Package:** `@capawesome/capacitor-live-update`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-live-update
npx cap sync
```

### Android

#### Channel (optional)

For versioned channels, add to `android/app/build.gradle`:

```groovy
android {
    defaultConfig {
        resValue "string", "capawesome_live_update_default_channel", "production-" + defaultConfig.versionCode
    }
}
```

#### Variables

Optional variables in `android/app/variables.gradle`:

- `$okhttp3Version` version of `com.squareup.okhttp3:okhttp` (default: `5.3.2`)
- `$zip4jVersion` version of `net.lingala.zip4j:zip4j` (default: `2.11.5`)

### iOS

#### Channel (optional)

For versioned channels, add to `ios/App/App/Info.plist`:

```xml
<key>CapawesomeLiveUpdateDefaultChannel</key>
<string>production-$(CURRENT_PROJECT_VERSION)</string>
```

#### Privacy Manifest

Add `NSPrivacyAccessedAPICategoryUserDefaults` to `ios/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
      <dict>
        <key>NSPrivacyAccessedAPIType</key>
        <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
        <key>NSPrivacyAccessedAPITypeReasons</key>
        <array>
          <string>CA92.1</string>
        </array>
      </dict>
    </array>
  </dict>
</plist>
```

## Configuration

In `capacitor.config.ts`:

```typescript
/// <reference types="@capawesome/capacitor-live-update" />

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  plugins: {
    LiveUpdate: {
      appId: '6e351b4f-69a7-415e-a057-4567df7ffe94',
      autoDeleteBundles: true,
      autoUpdateStrategy: 'background',
      defaultChannel: 'production',
      readyTimeout: 10000,
    },
  },
};

export default config;
```

Key config options:

- `appId`: Capawesome Cloud app ID.
- `autoUpdateStrategy`: `'none'` (default) or `'background'` (auto-download at startup/resume).
- `defaultChannel`: Default update channel.
- `readyTimeout`: Milliseconds to wait for `ready()` before rollback (default: `0` = disabled). Recommended: `10000`.
- `autoDeleteBundles`: Auto-delete unused bundles after `ready()` (default: `false`).
- `autoBlockRolledBackBundles`: Block bundles that caused rollbacks (default: `false`).
- `publicKey`: PEM-encoded RSA public key for bundle integrity verification.
- `httpTimeout`: HTTP request timeout in ms (default: `60000`).

## Usage

### Sync with Capawesome Cloud

```typescript
import { LiveUpdate } from '@capawesome/capacitor-live-update';

const sync = async () => {
  const result = await LiveUpdate.sync({ channel: 'production-5' });
  if (result.nextBundleId) {
    await LiveUpdate.reload();
  }
};
```

### Manual Bundle Management

```typescript
// Download a self-hosted bundle
await LiveUpdate.downloadBundle({
  url: 'https://example.com/1.0.0.zip',
  bundleId: '1.0.0',
});

// Set the next bundle
await LiveUpdate.setNextBundle({ bundleId: '1.0.0' });

// Reload to apply
await LiveUpdate.reload();

// Reset to default bundle
await LiveUpdate.reset();
```

### Ready Signal

```typescript
const ready = async () => {
  const result = await LiveUpdate.ready();
  if (result.rollback) {
    console.log('App was reset to default bundle.');
  }
};
```

## Notes

- Call `ready()` as soon as the app is usable to prevent rollback when `readyTimeout` is configured.
- Live updates only work for binary-compatible changes (HTML, CSS, JS). Native code changes require an app store submission.
- Do not use Live Reload during testing; it bypasses the local file system.
- Channel priority (lowest to highest): Capacitor config `defaultChannel`, native config, `setChannel()`, `sync()` channel parameter.
- Capawesome Cloud forced channel assignments override all other channel settings.
