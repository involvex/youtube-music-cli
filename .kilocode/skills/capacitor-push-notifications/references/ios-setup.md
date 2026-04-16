# iOS Configuration

## AppDelegate.swift

Add the following three methods to `ios/App/App/AppDelegate.swift` inside the `AppDelegate` class body:

```diff
 class AppDelegate: UIResponder, UIApplicationDelegate {

+    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
+        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
+    }
+
+    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
+        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
+    }
+
+    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
+        NotificationCenter.default.post(name: Notification.Name.init("didReceiveRemoteNotification"), object: completionHandler, userInfo: userInfo)
+    }

 }
```

## Combined Usage with @capacitor-firebase/authentication

If `@capacitor-firebase/authentication` is also installed (check `package.json`), add the following to `ios/App/App/AppDelegate.swift`:

```diff
+import FirebaseAuth

 func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
+    if Auth.auth().canHandle(url) {
+        return true
+    }
     return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
 }
```

## Enable Capabilities

Two capabilities must be enabled in `ios/App/App.xcodeproj/project.pbxproj`. The agent should verify these are present or instruct the user to add them via Xcode:

1. **Push Notifications** capability.
2. **Background Modes** capability with **Remote notifications** checked.

To add via Xcode: Open `ios/App/App.xcworkspace`, select the **App** target, go to **Signing & Capabilities**, click **+ Capability**, and add:
- "Push Notifications"
- "Background Modes" (then check "Remote notifications")

## Prevent Auto Initialization (Optional)

To prevent FCM from automatically generating a registration token on app startup, add the following to `ios/App/App/Info.plist`:

```diff
 <dict>
+    <key>FirebaseMessagingAutoInitEnabled</key>
+    <false/>
 </dict>
```

Only apply this if the user explicitly requests to control when token registration occurs.
