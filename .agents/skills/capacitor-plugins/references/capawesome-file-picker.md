# File Picker

Capacitor plugin to select files, directories, images, or videos from the device.

**Package:** `@capawesome/capacitor-file-picker`

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capawesome/capacitor-file-picker
npx cap sync
```

### Android

Add permissions to `android/app/src/main/AndroidManifest.xml` before or after the `application` tag:

```xml
<!-- Needed if you want to retrieve unredacted EXIF metadata from photos -->
<uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />
<!-- Needed if you want to read files from external storage -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
```

### iOS (Mac Catalyst only)

To use with Mac Catalyst, add to your entitlements:

```xml
<key>com.apple.security.files.user-selected.read-only</key>
<true/>
```

## Usage

### Pick Files

```typescript
import { FilePicker } from '@capawesome/capacitor-file-picker';

const pickFiles = async () => {
  const result = await FilePicker.pickFiles({
    types: ['image/png'],
    limit: 1,
  });
  const file = result.files[0];
  console.log(file.name, file.mimeType, file.size);
};
```

### Pick Images / Videos / Media

```typescript
const pickImages = async () => {
  const result = await FilePicker.pickImages();
};

const pickVideos = async () => {
  const result = await FilePicker.pickVideos();
};

const pickMedia = async () => {
  const result = await FilePicker.pickMedia();
};
```

### Pick Directory

```typescript
const pickDirectory = async () => {
  const result = await FilePicker.pickDirectory();
  console.log(result.path);
};
```

## Key Options

- `pickFiles` options: `types` (MIME type array), `limit` (0=unlimited, 1=single), `readData` (boolean, default false).
- `pickImages`/`pickVideos`/`pickMedia` options: `limit`, `readData`, `skipTranscoding` (iOS, default true), `ordered` (iOS 15+).
- `copyFile`: Copy a file from one path to another with optional `overwrite` flag.
- `convertHeicToJpeg`: Convert HEIC to JPEG (iOS only).

## Notes

- `pickDirectory()` is only available on Android and iOS.
- `pickImages()`/`pickVideos()`/`pickMedia()` are only available on Android and iOS.
- On iOS 13 and older, media pickers allow selecting only one item.
- Reading large files with `readData: true` can cause app crashes; prefer the fetch API with blob instead.
- Permissions (`checkPermissions`/`requestPermissions`) are Android only.
