# MDM App Config

Capacitor plugin for reading app configurations written by a MDM (Mobile Device Management) provider such as VMWare Workspace One.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/mdm-appconfig
npx cap sync
```

## Configuration

### Android

Add the following line to `android/app/src/main/AndroidManifest.xml` (under `<application>`):

```xml
<meta-data android:name="android.content.APP_RESTRICTIONS" android:resource="@xml/app_restrictions" />
```

Create an XML file at `android/app/src/main/res/xml/app_restrictions.xml` to define your app restrictions:

```xml
<?xml version="1.0" encoding="utf-8"?>
<restrictions xmlns:android="http://schemas.android.com/apk/res/android">
	<restriction android:key="ionic-email" android:title="Ionic Email" android:restrictionType="string" android:defaultValue="" />
	<restriction android:key="ionic-user" android:title="Ionic User" android:restrictionType="string" android:defaultValue="" />
	<restriction android:key="ionic-userid" android:title="Ionic Userid" android:restrictionType="string" android:defaultValue="" />
</restrictions>
```

### iOS

No additional configuration is required. Values are obtained from `UserDefaults` in `com.apple.configuration.managed`.

## Usage

```typescript
import { AppConfig } from '@capacitor-community/mdm-appconfig';

const result = await AppConfig.getValue({ key: 'my.variable.name' });
console.log(result.value);
```

## Notes

- On Android, you must define keys in `app_restrictions.xml` to be able to read their values at runtime.
- If the key cannot be found, the promise will be rejected.
- See [appconfig.org](https://www.appconfig.org/) for the AppConfig standard specification.
