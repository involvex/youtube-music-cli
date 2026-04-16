# File Compressor

Capacitor plugin for image compression supporting PNG, JPEG, and WebP formats.

**Package:** `@capawesome-team/capacitor-file-compressor`

**Platforms:** Android, iOS, Web

**Availability:** [Capawesome Insiders](https://capawesome.io/insiders/) only

## Installation

First, set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Then install:

```bash
npm install @capawesome-team/capacitor-file-compressor
npx cap sync
```

### Android

#### Proguard

Add the following to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

#### Variables

Optional variable in `android/app/variables.gradle`:

- `$androidxDocumentFileVersion` version of `androidx.documentfile:documentfile` (default: `1.1.0`)

## Usage

```typescript
import { FileCompressor } from '@capawesome-team/capacitor-file-compressor';

const compressImage = async () => {
  const { path } = await FileCompressor.compressImage({
    height: 1000,
    mimeType: 'image/jpeg',
    path: 'content://com.android.providers.downloads.documents/document/msf%3A1000000485',
    quality: 0.7,
    width: 1000,
  });
  return path;
};
```

## Key Options

- `path`: File path to compress (Android/iOS). Use `blob` on Web.
- `mimeType`: Output format (default: `'image/jpeg'`). Android supports `image/jpeg` and `image/webp`. iOS supports `image/jpeg` only.
- `quality`: Value from `0.0` (max compression) to `1.0` (least compression). Default: `0.6`.
- `width` / `height`: Target dimensions for the resulting image.

## Notes

- EXIF data is lost during compression.
- On Web, use `blob` instead of `path` for input/output.
- Returns `path` on Android/iOS, `blob` on Web.
