# Firebase Performance

Unofficial Capacitor plugin for Firebase Performance Monitoring. Custom traces with metrics and attributes.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/performance firebase
npx cap sync
```

## Configuration

### Android

Add the Performance Monitoring Gradle plugin. Set `firebasePerfVersion` in `variables.gradle` (default: `22.0.4`).

## Usage

```typescript
import { FirebasePerformance } from '@capacitor-firebase/performance';

await FirebasePerformance.startTrace({ traceName: 'test_trace' });
await FirebasePerformance.incrementMetric({
  traceName: 'test_trace',
  metricName: 'item_cache_hit',
  incrementBy: 1,
});
await FirebasePerformance.stopTrace({ traceName: 'test_trace' });

await FirebasePerformance.setEnabled({ enabled: true });
const { enabled } = await FirebasePerformance.isEnabled();
```

## Notes

- Trace name: no leading/trailing whitespace, no leading underscore, max 100 characters.
- `record()` is Web only.
- `setEnabled()` takes effect on the next app start.
