# MLKit Selfie Segmentation

Unofficial Capacitor plugin for ML Kit Selfie Segmentation. Separates person from background.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-mlkit/selfie-segmentation
npx cap sync
```

## Configuration

### Android

Optional `variables.gradle` variable: `mlkitSelfieSegmentationVersion` (default: `16.0.0-beta6`).

### iOS

Set minimum deployment target in `ios/App/Podfile`:

```ruby
platform :ios, '15.5'
```

CocoaPods only — SPM is not supported.

## Usage

```typescript
import { SelfieSegmentation } from '@capacitor-mlkit/selfie-segmentation';

const { path } = await SelfieSegmentation.processImage({
  path: 'path/to/image.jpg',
  confidence: 0.7,
});
```

## Notes

- Options: `width`, `height` (scale), `confidence` (default: 0.9).
- SDK version is still beta.
