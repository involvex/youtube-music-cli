# MLKit Subject Segmentation

Unofficial Capacitor plugin for ML Kit Subject Segmentation. Segments any foreground subject (not just people).

**Platforms:** Android (API 24+), iOS

## Installation

```bash
npm install @capacitor-mlkit/subject-segmentation
npx cap sync
```

## Configuration

### Android

Minimum API level: 24.

Add to `android/app/src/main/AndroidManifest.xml` before `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Add inside `<application>`:

```xml
<meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="subject_segment"/>
```

## Usage

```typescript
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';

const { path } = await SubjectSegmentation.processImage({
  path: 'path/to/image.jpg',
  confidence: 0.7,
});
```

## Notes

- Options: `width`, `height`, `confidence` (default: 0.9).
- On Android, check module availability with `isGoogleSubjectSegmentationModuleAvailable()` and install with `installGoogleSubjectSegmentationModule()`.
- Module installation is async — use `addListener('googleSubjectSegmentationModuleInstallProgress')` to track.
