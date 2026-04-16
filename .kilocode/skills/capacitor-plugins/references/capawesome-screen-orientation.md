# Screen Orientation

Capacitor plugin to lock/unlock the screen orientation. Supports orientation detection and change event listeners.

**Package:** `@capawesome/capacitor-screen-orientation`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** No

## Installation

```bash
npm install @capawesome/capacitor-screen-orientation
npx cap sync
```

## Configuration

### iOS

#### AppDelegate Setup

Add the following to `ios/App/App/AppDelegate.swift`:

```diff
+ import CapawesomeCapacitorScreenOrientation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

+ func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
+   return ScreenOrientation.getSupportedInterfaceOrientations()
+ }
```

#### iPad Orientation Lock

On iPad, add to `ios/App/App/Info.plist`:

```xml
<key>UIRequiresFullScreen</key>
<true/>
```

## Usage

### Lock orientation

```typescript
import { ScreenOrientation, OrientationType } from '@capawesome/capacitor-screen-orientation';

await ScreenOrientation.lock({ type: OrientationType.LANDSCAPE });
```

### Unlock orientation

```typescript
import { ScreenOrientation } from '@capawesome/capacitor-screen-orientation';

await ScreenOrientation.unlock();
```

### Get current orientation

```typescript
import { ScreenOrientation } from '@capawesome/capacitor-screen-orientation';

const { type } = await ScreenOrientation.getCurrentOrientation();
console.log('Current orientation:', type);
```

### Listen for orientation changes

```typescript
import { ScreenOrientation } from '@capawesome/capacitor-screen-orientation';

await ScreenOrientation.addListener('screenOrientationChange', (change) => {
  console.log('Orientation changed to:', change.type);
});

// Later:
await ScreenOrientation.removeAllListeners();
```

## Orientation Types

| Value | Description |
|---|---|
| `landscape` | Either landscape-primary or landscape-secondary |
| `landscape-primary` | Primary landscape mode |
| `landscape-secondary` | Secondary landscape mode |
| `portrait` | Either portrait-primary or portrait-secondary |
| `portrait-primary` | Primary portrait mode |
| `portrait-secondary` | Secondary portrait mode |

## Notes

- On iOS, the `AppDelegate.swift` modification is required for orientation locking to work.
- On iPad, `UIRequiresFullScreen` must be set to `true` in `Info.plist` for orientation locking.
- No additional Android configuration is needed.
