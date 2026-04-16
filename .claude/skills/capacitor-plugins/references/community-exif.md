# Exif

Read and set GPS coordinates in image EXIF metadata.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/exif
npx cap sync
```

## Configuration

### Android

Optionally set the ExifInterface version in `android/variables.gradle`:

```groovy
androidxExifInterfaceVersion = '1.3.6'
```

## Usage

```typescript
import { Exif } from '@capacitor-community/exif';

// Set coordinates
await Exif.setCoordinates({
  pathToImage: '/path/to/image.jpg',
  lat: 48.8566,
  lng: 2.3522,
});

// Get coordinates
const coords = await Exif.getCoordinates({
  pathToImage: '/path/to/image.jpg',
});
if (coords) {
  console.log(coords.lat, coords.lng);
}
```

## Notes

- Primarily designed to add GPS coordinates to images from plugins like `@capacitor-community/camera-preview`.
- `getCoordinates()` returns `undefined` if no coordinates are found in the EXIF data.
- Version 8.x is compatible with Capacitor 8; version 7.x with Capacitor 7; version 6.x with Capacitor 6.
