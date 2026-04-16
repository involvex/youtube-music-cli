# Secure Preferences

Securely store key/value pairs such as passwords, tokens, or other sensitive information using the Android Keystore and iOS Keychain.

**Package:** `@capawesome-team/capacitor-secure-preferences`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-secure-preferences
npx cap sync
```

## Configuration

### Android

#### Backup Rules

To prevent the preferences file from being backed up to the cloud, add backup rules.

For Android 11 and lower, add the `android:fullBackupContent` attribute to the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<application
  android:fullBackupContent="@xml/full_backup_content">
</application>
```

Create `android/app/src/main/res/xml/full_backup_content.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <include domain="sharedpref" path="."/>
  <exclude domain="sharedpref" path="CAPAWESOME_SECURE_PREFERENCES.xml"/>
</full-backup-content>
```

For Android 12 and higher, add the `android:dataExtractionRules` attribute to the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<application
  android:dataExtractionRules="@xml/data_extraction_rules">
</application>
```

Create `android/app/src/main/res/xml/data_extraction_rules.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
 <cloud-backup>
   <include domain="sharedpref" path="."/>
   <exclude domain="sharedpref" path="CAPAWESOME_SECURE_PREFERENCES.xml"/>
 </cloud-backup>
</data-extraction-rules>
```

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

## Usage

### Store and retrieve a value

```typescript
import { SecurePreferences } from '@capawesome-team/capacitor-secure-preferences';

await SecurePreferences.set({
  key: 'password',
  value: '123456',
});

const { value } = await SecurePreferences.get({
  key: 'password',
});
console.log(value);
```

### List keys and remove values

```typescript
import { SecurePreferences } from '@capawesome-team/capacitor-secure-preferences';

const { keys } = await SecurePreferences.keys();
console.log(keys);

await SecurePreferences.remove({ key: 'password' });

await SecurePreferences.clear();
```

## Notes

- On Web, values are stored unencrypted in `localStorage`. This is for development purposes only and should not be used in production.
- On Android, data is secured using the Android Keystore.
- On iOS, data is secured using the iOS Keychain.
- Compatible with the Biometrics and SQLite plugins.
