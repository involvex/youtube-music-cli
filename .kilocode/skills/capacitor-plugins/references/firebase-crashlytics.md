# Firebase Crashlytics

Unofficial Capacitor plugin for Firebase Crashlytics. Reports crashes and non-fatal exceptions.

**Platforms:** Android, iOS (no Web)

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/crashlytics
npx cap sync
```

## Configuration

### Android

Add Crashlytics Gradle plugin to root `android/build.gradle`:

```groovy
buildscript {
    dependencies {
        classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
    }
}
```

Apply plugin in `android/app/build.gradle`:

```groovy
apply plugin: 'com.google.firebase.crashlytics'
```

Set `firebaseCrashlyticsVersion` in `variables.gradle` (default: `20.0.3`).

### iOS

1. In Xcode Build Settings: Set **Debug Information Format** to `DWARF with dSYM File` for all build types.
2. In Xcode Build Phases: Add a **New Run Script Phase** as the **last** build phase with script:
   ```
   "${PODS_ROOT}/FirebaseCrashlytics/run"
   ```
3. Add Input Files:
   ```
   ${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${TARGET_NAME}
   $(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)
   ```

## Usage

```typescript
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

await FirebaseCrashlytics.recordException({ message: 'This is a non-fatal message.' });
await FirebaseCrashlytics.setUserId({ userId: '123' });
await FirebaseCrashlytics.log({ message: 'User clicked checkout' });
await FirebaseCrashlytics.crash({ message: 'Test' });
```

## Notes

- `recordException()` supports `stacktrace` parameter (array of `StackFrame` from `stacktrace-js`).
- `setEnabled()` takes effect on the next app run.
- Does NOT require `firebase` as a peer dependency.
