# Android Configuration

## Notification Icon

Add a push notification icon to `android/app/src/main/AndroidManifest.xml` inside the `<application>` tag:

```diff
 <application>
+    <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/push_notification_icon" />
 </application>
```

The icon must be **white pixels on a transparent background**. Place the PNG file as `push_notification_icon.png` in each density folder:

- `android/app/src/main/res/mipmap-mdpi/push_notification_icon.png`
- `android/app/src/main/res/mipmap-hdpi/push_notification_icon.png`
- `android/app/src/main/res/mipmap-xhdpi/push_notification_icon.png`
- `android/app/src/main/res/mipmap-xxhdpi/push_notification_icon.png`
- `android/app/src/main/res/mipmap-xxxhdpi/push_notification_icon.png`

If the user does not have a push notification icon yet, inform them that without a custom icon, Android will display the app icon as a white square.

## Notification Color (Optional)

Add a default notification accent color in `android/app/src/main/AndroidManifest.xml` inside the `<application>` tag:

```diff
 <application>
+    <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/colorAccent" />
 </application>
```

Ensure the color resource exists in `android/app/src/main/res/values/colors.xml`.

## Prevent Auto Initialization (Optional)

To prevent FCM from automatically generating a registration token on app startup, add these entries to `android/app/src/main/AndroidManifest.xml` inside the `<application>` tag:

```diff
 <application>
+    <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" />
+    <meta-data android:name="firebase_analytics_collection_enabled" android:value="false" />
 </application>
```

Only apply this if the user explicitly requests to control when token registration occurs.

## Firebase Messaging Version (Optional)

If the user encounters dependency conflicts, set the Firebase Messaging version in `android/variables.gradle`:

```diff
 ext {
+    firebaseMessagingVersion = '25.0.1'
 }
```
