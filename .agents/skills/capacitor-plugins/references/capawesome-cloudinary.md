# Cloudinary

Unofficial Capacitor plugin for the Cloudinary SDK. Upload and download files using native SDKs.

**Package:** `@capawesome/capacitor-cloudinary`

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capawesome/capacitor-cloudinary
npx cap sync
```

## Configuration

### Android

#### Permissions

Add to `AndroidManifest.xml` **before** the `application` tag:

```xml
<uses-permission android:name="android.permission.DOWNLOAD_WITHOUT_NOTIFICATION" />
```

#### Broadcast Receiver

Add **inside** the `application` tag in `AndroidManifest.xml`:

```xml
<receiver android:name="io.capawesome.capacitorjs.plugins.cloudinary.DownloadBroadcastReceiver" android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.DOWNLOAD_COMPLETE"/>
  </intent-filter>
</receiver>
```

#### Variables

Optionally define in `variables.gradle`:

- `$cloudinaryAndroidVersion` version of `com.cloudinary:cloudinary-android` (default: `3.1.2`)

## Usage

### Initialize

```typescript
import { Cloudinary, ResourceType } from '@capawesome/capacitor-cloudinary';

await Cloudinary.initialize({ cloudName: 'my_cloud_name' });
```

### Upload a resource

```typescript
await Cloudinary.uploadResource({
  path: 'file:///path/to/file.png',
  publicId: 'my_public_id',
  resourceType: ResourceType.Image,
  uploadPreset: 'my_preset',
});
```

### Download a resource

```typescript
const { path } = await Cloudinary.downloadResource({
  url: 'https://res.cloudinary.com/myCloudName/image/upload/v123/123.png',
});
```

## Notes

- `initialize()` must be called once before any other method.
- Only unsigned uploads are currently supported.
- `ResourceType`: `Image`, `Video`, `Raw`.
- On Android, downloaded files go to the `Downloads` directory. On iOS, they go to the temporary directory. Copy to a permanent location for further use.
- Works with the Capacitor Filesystem and Capacitor File Picker plugins.
- Supports chunk upload of large files to avoid out-of-memory issues.
