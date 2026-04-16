# Image Manipulator

Resize images and read image dimensions.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/image-manipulator
npx cap sync
```

## Usage

```typescript
import { ImageManipulator } from '@capacitor-community/image-manipulator';

// Get image dimensions
const dimensions = await ImageManipulator.getDimensions({
  imagePath: '/path/to/image.jpg',
});
console.log(dimensions.width, dimensions.height);

// Resize an image
const result = await ImageManipulator.resize({
  imagePath: '/path/to/image.jpg',
  maxWidth: 300,
  maxHeight: 300,
  quality: 85,
  fileName: 'resized',
  fixRotation: true,
});
console.log(result.resizedWidth, result.resizedHeight);
console.log(result.imagePath, result.webPath);
console.log(result.resized); // false if image was already smaller
```

## Notes

- Resizing preserves the original aspect ratio. The output fits within `maxWidth`/`maxHeight`.
- If both the image width and height are already smaller than the specified maximums, the image is not resized and `resized` is returned as `false`.
- At least one of `maxWidth` or `maxHeight` must be provided. If one is omitted or `0`, only the other is used.
- `quality` ranges from 0 to 100 (default: 85).
- `folderName` (Android only) sets the output directory name (default: `ResizedImages`).
- `fixRotation` corrects orientation based on EXIF metadata (default: `false`).
- Version 8.x is compatible with Capacitor 8; version 7.x with Capacitor 7; version 6.x with Capacitor 6.
