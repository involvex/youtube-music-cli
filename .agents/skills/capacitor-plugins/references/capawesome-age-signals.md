# Age Signals

Request age signals using the Play Age Signals API (Android) and DeclaredAgeRange (iOS) for age verification and compliance.

**Package:** `@capawesome/capacitor-age-signals`
**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-age-signals
npx cap sync
```

## Configuration

### Android

#### Variables

Optionally define in `android/variables.gradle`:

- `$androidPlayAgeSignalsVersion` version of `com.google.android.play:age-signals` (default: `0.0.2`)

### iOS

#### Entitlements

Add the `com.apple.developer.declared-age-range` entitlement to your app's entitlements file:

```xml
<key>com.apple.developer.declared-age-range</key>
<true/>
```

## Usage

### Check age signals

```typescript
import { AgeSignals } from '@capawesome/capacitor-age-signals';

const result = await AgeSignals.checkAgeSignals();
console.log('User Status:', result.userStatus);
console.log('Age Lower:', result.ageLower);
console.log('Age Upper:', result.ageUpper);
```

### Check eligibility (iOS only)

```typescript
import { AgeSignals } from '@capawesome/capacitor-age-signals';

const { isEligible } = await AgeSignals.checkEligibility();
```

### Testing with FakeAgeSignalsManager (Android only)

```typescript
import { AgeSignals, UserStatus } from '@capawesome/capacitor-age-signals';

// Enable fake manager
await AgeSignals.setUseFakeManager({ useFake: true });

// Set a fake result
await AgeSignals.setNextAgeSignalsResult({
  userStatus: UserStatus.Verified,
});

// Check age signals returns the fake result
const result = await AgeSignals.checkAgeSignals();

// Disable fake manager
await AgeSignals.setUseFakeManager({ useFake: false });
```

## Notes

- `UserStatus` values: `Verified`, `Supervised`, `SupervisedApprovalPending`, `SupervisedApprovalDenied`, `Unknown`, `Empty`.
- `ageLower`/`ageUpper` are only available for supervised users.
- `mostRecentApprovalDate` and `installId` are Android-only fields.
- On iOS, `checkAgeSignals` accepts an `ageGates` option (array of 2-3 ages, default `[13, 15, 18]`).
- `checkEligibility()` returns `true` if the user is in a region requiring age-related obligations (iOS only, always `false` on macOS).
