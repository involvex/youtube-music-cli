# Android Security Provider

Check and update the Android Security Provider to protect against known SSL/TLS vulnerabilities.

**Platforms:** Android

## Installation

```bash
npm install @capacitor-community/security-provider
npx cap sync
```

## Usage

```typescript
import {
  CapacitorSecurityProvider,
  SecurityProviderStatus,
} from '@capacitor-community/security-provider';

const result = await CapacitorSecurityProvider.installIfNeeded();
if (
  result.status !== SecurityProviderStatus.Success &&
  result.status !== SecurityProviderStatus.NotImplemented
) {
  // The security provider failed to verify/install - do not proceed
}
```

## Notes

- `installIfNeeded()` checks if the device security provider is up to date and installs updates via Google Play services if needed.
- `SecurityProviderStatus` values:
  - `Success` - Provider was already up to date or was successfully updated.
  - `NotImplemented` - Returned on iOS and Web since the Android Security Provider is not applicable.
  - `GooglePlayServicesRepairableException` - Google Play services is out of date or disabled. A native dialog will prompt the user to update.
  - `GooglePlayServicesNotAvailableException` - Non-recoverable error. The application should abort.
- On iOS and Web, the call returns `NotImplemented` and performs no action.
- The npm package name is `@capacitor-community/security-provider`.
