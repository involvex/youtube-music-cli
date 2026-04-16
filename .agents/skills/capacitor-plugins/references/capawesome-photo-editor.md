# Photo Editor

Capacitor plugin that allows the user to edit a photo using an installed photo editing app.

**Package:** `@capawesome/capacitor-photo-editor`
**Platforms:** Android
**Capawesome Insiders:** No

## Installation

```bash
npm install @capawesome/capacitor-photo-editor
npx cap sync
```

## Configuration

### Android

Create the file `android/app/src/main/res/xml/file_paths.xml` to specify directories containing photos to edit:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
    <external-files-path name="external-files" path="." />
    <external-cache-path name="external-cache" path="." />
    <external-path name="external" path="." />
</paths>
```

## Usage

### Edit a photo

```typescript
import { PhotoEditor } from '@capawesome/capacitor-photo-editor';

await PhotoEditor.editPhoto({ path: 'data/image.png' });
```

## Notes

- Only available on Android.
- A suitable photo editing app must be installed on the device (e.g. Google Photos).
- The user should overwrite the image when saving so that the path to the image is not lost.
- No configuration is required beyond the `file_paths.xml` setup.
