# Share Target

Receive content such as text, links, and files from other apps.

**Package:** `@capawesome-team/capacitor-share-target`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-share-target
npx cap sync
```

## Configuration

### Android

#### Intent Filters

Add intent filters to the main activity in `android/app/src/main/AndroidManifest.xml` to enable receiving shared content. The activity must have `android:exported="true"` and `android:launchMode="singleTask"`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="image/*" />
    </intent-filter>
</activity>
```

Add additional intent filters for other MIME types as needed (e.g., `video/*`, `application/pdf`). For multiple files, use `android.intent.action.SEND_MULTIPLE`.

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

iOS requires a Share Extension and URL scheme to receive shared content.

#### URL Scheme

Add a URL scheme to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>YOUR_URL_SCHEME</string>
        </array>
    </dict>
</array>
```

Replace `YOUR_URL_SCHEME` with your desired scheme (e.g., `myapp`).

#### Share Extension

1. In Xcode, go to File > New > Target, select "Share Extension", name it `AppShare`.
2. Delete `MainInterface.storyboard` via Xcode.
3. Replace the share extension's `Info.plist` content with an `NSExtension` configuration specifying supported content types.
4. Replace `ShareViewController.swift` with the code from the plugin's README that handles copying shared files to a shared container and opening the main app via URL scheme.
5. Update `AppDelegate.swift` to handle share target URLs:

```diff
+ import CapawesomeTeamCapacitorShareTarget

func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
+    let _ = ShareTargetPlugin.handleOpenUrl(url)
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
}
```

#### App Groups Capability

To receive files (images, videos), enable "App Groups" for both the main app and the share extension using the format `group.<YOUR_APP_IDENTIFIER>`.

## Usage

```typescript
import { Capacitor } from '@capacitor/core';
import { ShareTarget } from '@capawesome-team/capacitor-share-target';

await ShareTarget.addListener('shareReceived', (event) => {
  console.log('Share received:', event);

  if (event.files) {
    event.files.forEach(async (file) => {
      const webPath = Capacitor.convertFileSrc(file.uri);
      const response = await fetch(webPath);
      const blob = await response.blob();
      // Process the file...
    });
  }
});
```

## Notes

- The `shareReceived` event provides `title`, `texts`, and `files` properties.
- Each shared file has `uri`, `name`, and `mimeType` properties.
- On Web, this plugin requires a PWA with a `share_target` in the web manifest and a service worker to intercept share requests.
