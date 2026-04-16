# Asset Manager

Capacitor plugin to access native asset files.

**Package:** `@capawesome/capacitor-asset-manager`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-asset-manager
npx cap sync
```

## Configuration

No configuration required for this plugin.

## Usage

### Copy a file from the app bundle to the data directory

```typescript
import { Directory, Filesystem } from '@capacitor/filesystem';
import { AssetManager, Encoding } from '@capawesome/capacitor-asset-manager';

const copy = async () => {
  const { uri } = await Filesystem.getUri({
    directory: Directory.Cache,
    path: 'index.html'
  });
  await AssetManager.copy({
    from: 'public/index.html',
    to: uri
  });
};
```

### List files in a directory

```typescript
const list = async () => {
  const { files } = await AssetManager.list({
    path: 'public'
  });
};
```

### Read a file from the app bundle

```typescript
const read = async () => {
  const { data } = await AssetManager.read({
    encoding: Encoding.Utf8,
    path: 'capacitor.config.json'
  });
  return JSON.parse(data);
};
```

## Notes

- `Encoding` supports `Base64` and `Utf8`. Default is `Base64`.
- Reading large files can cause out-of-memory issues. Use `copy()` to move files to the data directory and read them from there using the fetch API instead.
- The `to` path for `copy()` should be generated using `Filesystem.getUri()`.
