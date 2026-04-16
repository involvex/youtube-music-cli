# Device (Community)

Provides disk space information removed from `@capacitor/device` in v7.0 (`diskFree`, `diskTotal`, `realDiskFree`, `realDiskTotal`).

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/device
npx cap sync
```

## Configuration

### iOS

Apple requires a Privacy Manifest for disk space API usage. Add the following to `ios/App/PrivacyInfo.xcprivacy`:

```xml
<dict>
  <key>NSPrivacyAccessedAPIType</key>
  <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
  <key>NSPrivacyAccessedAPITypeReasons</key>
  <array>
    <string>85F4.1</string>
  </array>
</dict>
```

This `<dict>` entry goes inside the `NSPrivacyAccessedAPITypes` array.

## Usage

```typescript
import { CommunityDevice } from '@capacitor-community/device';

const info = await CommunityDevice.getInfo();
console.log(info.diskFree);      // Free disk space (OS partition), bytes
console.log(info.diskTotal);     // Total disk space (OS partition), bytes
console.log(info.realDiskFree);  // Free disk space (data partition), bytes
console.log(info.realDiskTotal); // Total disk space (data partition), bytes
```

## Notes

- On Android, `diskFree`/`diskTotal` refer to the "system" partition; `realDiskFree`/`realDiskTotal` refer to the data storage partition.
- On iOS, `diskFree` may not be fully accurate; prefer `realDiskFree` for reliable values.
- Version 8.x is compatible with Capacitor 8; version 7.x with Capacitor 7.
