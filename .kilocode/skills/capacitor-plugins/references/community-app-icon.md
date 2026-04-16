# App Icon

Capacitor plugin for programmatically changing the app icon.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/app-icon
npx cap sync
```

## Configuration

Alternate icons must be bundled within the app project before they can be used.

### iOS

1. In Xcode, go to Assets and create alternate App Icon sets (1024x1024px images).
2. In Build Settings, search for "App Icon":
   - Set `Include All App Icon Assets` to **Yes**.
   - Add the exact icon set names to `Alternate App Icon Sets`.

### Android

1. Add alternate icon drawables to `android/app/src/main/res`.
2. In `android/app/src/main/AndroidManifest.xml`, add an `<activity-alias>` for each alternate icon under `<application>`. The `name` attribute must be prefixed with `.`:

```xml
<activity-alias
    android:label="Alternate"
    android:icon="@drawable/alternate_icon"
    android:roundIcon="@drawable/alternate_icon"
    android:name=".alternate"
    android:enabled="true"
    android:exported="true"
    android:targetActivity=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity-alias>
```

Remove `<category android:name="android.intent.category.LAUNCHER" />` from the main `<activity>` intent filter.

## Usage

```typescript
import { AppIcon } from '@capacitor-community/app-icon';

// Change to an alternate icon
await AppIcon.change({ name: 'alternate', suppressNotification: true });

// Get the current icon name (null if using the original)
const { value } = await AppIcon.getName();

// Reset to the original icon
await AppIcon.reset({ suppressNotification: true, disable: ['alternate'] });

// Check if alternate icons are supported (iOS only)
const { value: supported } = await AppIcon.isSupported();
```

## Notes

- On iOS, only the homescreen icon changes. The icon in Springboard and other areas remains the original.
- On iOS, the icon can only be changed while the app is in the foreground.
- `suppressNotification` controls the iOS system notification shown after an icon change.
- On Android, the `disable` array in `change()` and `reset()` must list all activity-alias names that should be disabled.
