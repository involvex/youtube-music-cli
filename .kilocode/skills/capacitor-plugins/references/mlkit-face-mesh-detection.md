# MLKit Face Mesh Detection

Unofficial Capacitor plugin for ML Kit Face Mesh Detection. Generates 468 3D face mesh points.

**Platforms:** Android only

## Installation

```bash
npm install @capacitor-mlkit/face-mesh-detection
npx cap sync
```

## Configuration

### Android

Optional `variables.gradle` variable: `mlkitFaceMeshDetectionVersion` (default: `16.0.0-beta1`).

## Usage

```typescript
import { FaceMeshDetection, UseCase } from '@capacitor-mlkit/face-mesh-detection';

const { faceMeshs } = await FaceMeshDetection.processImage({
  path: 'path/to/image.jpg',
  useCase: UseCase.FaceMesh,
});
```

## Notes

- Android only — no iOS or Web support.
- `FaceMesh` use case detects at most 2 faces; `BoundingBoxOnly` has no limit.
- SDK version is still beta.
