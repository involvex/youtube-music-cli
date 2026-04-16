# App Shortcuts

Manage app shortcuts and quick actions on Android and iOS.

**Package:** `@capawesome/capacitor-app-shortcuts`
**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-app-shortcuts
npx cap sync
```

## Configuration

### Static shortcuts via config

In `capacitor.config.json`:

```json
{
  "plugins": {
    "AppShortcuts": {
      "shortcuts": [{ "id": "feedback", "title": "Feedback" }]
    }
  }
}
```

### iOS

Add to `ios/App/App/AppDelegate.swift`:

```diff
+ import CapawesomeCapacitorAppShortcuts

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
+        if let shortcutItem = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
+            NotificationCenter.default.post(name: NSNotification.Name(AppShortcutsPlugin.notificationName), object: nil, userInfo: [AppShortcutsPlugin.userInfoShortcutItemKey: shortcutItem])
+            return true
+        }
        return true
    }

+    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
+        NotificationCenter.default.post(name: NSNotification.Name(AppShortcutsPlugin.notificationName), object: nil, userInfo: [AppShortcutsPlugin.userInfoShortcutItemKey: shortcutItem])
+        completionHandler(true)
+    }
```

## Usage

### Set shortcuts

```typescript
import { AppShortcuts } from '@capawesome/capacitor-app-shortcuts';

await AppShortcuts.set({
  shortcuts: [
    { id: 'feedback', title: 'Feedback', description: 'Send us your feedback' },
    { id: 'rate', title: 'Rate', description: 'Rate our app' },
  ],
});
```

### Get shortcuts

```typescript
import { AppShortcuts } from '@capawesome/capacitor-app-shortcuts';

const { shortcuts } = await AppShortcuts.get();
```

### Clear all shortcuts

```typescript
import { AppShortcuts } from '@capawesome/capacitor-app-shortcuts';

await AppShortcuts.clear();
```

### Listen for shortcut clicks

```typescript
import { AppShortcuts } from '@capawesome/capacitor-app-shortcuts';

await AppShortcuts.addListener('click', (event) => {
  console.log('Shortcut clicked:', event.shortcutId);
});
```

## Notes

- On iOS, the `AppDelegate.swift` modifications are required for handling shortcuts when the app is launched from a shortcut.
- On iOS, the `icon` and `description` must be used together on each shortcut.
- `icon` supports platform-specific values:
  - Android: drawable resource name (e.g., `"alert_dark_frame"`), R.drawable integer, or base64 image string.
  - iOS: `UIApplicationShortcutIcon.IconType` integer, SF Symbol name (e.g., `"star.fill"`), or asset catalogue image name.
- Use `androidIcon` and `iosIcon` for platform-specific icon overrides.
