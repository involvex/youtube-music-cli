# File Opener

Capacitor plugin to open a file with the default application.

**Package:** `@capawesome-team/capacitor-file-opener`

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capawesome-team/capacitor-file-opener
npx cap sync
```

### Android

Create `android/app/src/main/res/xml/file_paths.xml` to specify directories containing files you want to open:

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

#### Variables

Optional variable in `android/app/variables.gradle`:

- `$androidxDocumentFileVersion` version of `androidx.documentfile:documentfile` (default: `1.1.0`)

## Usage

```typescript
import { FileOpener } from '@capawesome-team/capacitor-file-opener';

const open = async () => {
  await FileOpener.openFile({
    path: 'content://com.android.providers.downloads.documents/document/msf%3A1000000073',
  });
};
```

## Key Options

- `path`: File path to open (Android/iOS only).
- `blob`: Blob instance of the file to open (Web only).
- `mimeType`: MIME type of the file. If not specified, it is auto-detected (Android/iOS only).

## Notes

- The `file_paths.xml` file is required on Android for the FileProvider to grant access to files.
- On Web, use the `blob` property instead of `path`.
