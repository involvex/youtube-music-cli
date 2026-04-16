# MLKit Face Detection

Unofficial Capacitor plugin for ML Kit Face Detection. Detects faces in images with landmarks, contours, and classification.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-mlkit/face-detection
npx cap sync
```

## Configuration

### Android

Add inside `<application>` in `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="face"/>
```

Optional `variables.gradle` variable: `mlkitFaceDetectionVersion` (default: `16.1.7`).

### iOS

Set minimum deployment target in `ios/App/Podfile`:

```ruby
platform :ios, '15.5'
```

CocoaPods only — SPM is not supported.

## Usage

```typescript
import { FaceDetection, PerformanceMode, LandmarkMode, ContourMode, ClassificationMode } from '@capacitor-mlkit/face-detection';

const { faces } = await FaceDetection.processImage({
  path: 'path/to/image.jpg',
  performanceMode: PerformanceMode.Fast,
  landmarkMode: LandmarkMode.All,
  contourMode: ContourMode.All,
  classificationMode: ClassificationMode.All,
  minFaceSize: 0.1,
  enableTracking: false,
});
```

## Notes

- Contour detection returns contours for up to 5 faces.
- Disable face tracking when processing non-consecutive still images.
- No camera permissions needed (processes static images only).
