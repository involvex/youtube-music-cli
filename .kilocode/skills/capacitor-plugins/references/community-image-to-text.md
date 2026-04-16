# Image to Text

Capacitor plugin for OCR (image to text) using Apple Vision Framework on iOS and MLKit on Android.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/image-to-text
npx cap sync
```

## Configuration

### Android

A `google-services.json` file is required in `android/app/`. Create a Firebase project and Android app at [console.firebase.google.com](https://console.firebase.google.com/), then download and place the file.

### iOS

No additional configuration required.

## Usage

```typescript
import { Ocr, TextDetections } from '@capacitor-community/image-to-text';

// Detect text from an image file
const data: TextDetections = await Ocr.detectText({ filename: '/path/to/image.jpg' });
for (const detection of data.textDetections) {
  console.log(detection.text);
}

// Detect text from base64 data
const result = await Ocr.detectText({ base64: 'base64EncodedImageData' });

// Example with @capacitor/camera
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri,
  source: CameraSource.Camera,
});
const ocrResult = await Ocr.detectText({ filename: photo.path });
```

## Notes

- Each `TextDetection` includes `text` and bounding coordinates (`topLeft`, `topRight`, `bottomLeft`, `bottomRight`).
- Images are expected to be in portrait orientation (text facing up). Other orientations may produce unreliable results.
- An `orientation` option (`Up`, `Down`, `Left`, `Right`) can be passed to specify image orientation.
- iOS uses CoreML Vision; Android uses Firebase MLKit.
- Skewed text recognition is reliable on iOS but unreliable on Android.
- Web is not supported.
