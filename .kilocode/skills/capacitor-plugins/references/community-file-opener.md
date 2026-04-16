# File Opener

Capacitor plugin to open a file given its URI and MIME type using the default system application.

**Package:** `@capacitor-community/file-opener`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/file-opener
npx cap sync
```

## Configuration

### Android

If your app needs to open files in external directories, add the following permission to `android/app/src/main/AndroidManifest.xml`:

```diff
 <?xml version="1.0" encoding="utf-8"?>
 <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example">

+  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

 </manifest>
```

### iOS

Set the minimum deployment target to 15.0 in `ios/App/Podfile`:

```
platform :ios '15.0'
```

Then run `npx cap sync ios`.

## Usage

```typescript
import { FileOpener, FileOpenerOptions } from '@capacitor-community/file-opener';

const fileOpenerOptions: FileOpenerOptions = {
  filePath: 'file:///path/to/file',
  contentType: 'application/pdf',
  openWithDefault: true,
};

try {
  await FileOpener.open(fileOpenerOptions);
} catch (e) {
  console.log('Error opening file', e);
}
```

## Notes

- `filePath` (required): URI of the file to open.
- `contentType` (optional): MIME type of the file.
- `openWithDefault` (optional, default `true`): When `false`, shows a chooser dialog on Android or a filtered list of capable apps on iOS.
- `chooserPosition` (optional, iOS iPad only): Anchor position for the chooser sheet when `openWithDefault` is `false`.
- Error codes: `1` = internal error, `2` = invalid argument, `8` = file not supported, `9` = file not found, `10` = unknown.
