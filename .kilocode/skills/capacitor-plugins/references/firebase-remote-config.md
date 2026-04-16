# Firebase Remote Config

Unofficial Capacitor plugin for Firebase Remote Config. Fetch, activate, and read configuration values.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/remote-config firebase
npx cap sync
```

## Configuration

### Android

Google Analytics required for conditional targeting. Install `@capacitor-firebase/analytics` alongside this plugin.

Set `firebaseConfigVersion` in `variables.gradle` (default: `23.0.1`).

## Usage

```typescript
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';

await FirebaseRemoteConfig.fetchAndActivate();

const { value: isSale } = await FirebaseRemoteConfig.getBoolean({ key: 'is_sale' });
const { value: licenseKey } = await FirebaseRemoteConfig.getString({ key: 'license_key' });
const { value: maintenance } = await FirebaseRemoteConfig.getNumber({ key: 'upcoming_maintenance' });
```

## Notes

- Default `minimumFetchIntervalInSeconds` is 43200 (12 hours). Set lower during development.
- `addConfigUpdateListener()` / `removeConfigUpdateListener()` are Android/iOS only.
- Result values include `source` field on Android/iOS: Static, Default, or Remote.
