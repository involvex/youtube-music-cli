# Firebase Storage

Unofficial Capacitor plugin for Firebase Cloud Storage. Upload, download, delete, list files, manage metadata.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/storage
npx cap sync
```

## Configuration

### Android

Set `firebaseStorageVersion` in `variables.gradle` (default: `22.0.1`).

## Usage

```typescript
import { FirebaseStorage } from '@capacitor-firebase/storage';

await FirebaseStorage.uploadFile(
  { path: 'images/mountains.png', uri: 'file:///path/to/mountains.png' },
  (event, error) => {
    if (error) { console.error(error); }
    else if (event?.completed) { console.log('Upload complete'); }
  },
);

const { downloadUrl } = await FirebaseStorage.getDownloadUrl({
  path: 'images/mountains.png',
});

await FirebaseStorage.deleteFile({ path: 'images/mountains.png' });

const { items } = await FirebaseStorage.listFiles({ path: 'images' });
```

## Notes

- Does NOT require `firebase` as a peer dependency.
- `uploadFile()` uses callback for progress: `progress` (0-1), `bytesTransferred`, `totalBytes`, `completed`.
- On Android, use `uri`; on Web, use `blob`.
- For emulator on Android, enable cleartext traffic: `{ "server": { "cleartext": true } }`.
- `useEmulator()` default port is 9199. For Android Emulator use host `10.0.2.2`.
