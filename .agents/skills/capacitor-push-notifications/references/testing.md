# Testing Push Notifications

## Via Firebase Console

1. Open the [Firebase console](https://console.firebase.google.com/) and select the project.
2. Navigate to **Messaging** (under **Run** or **Engage** in the sidebar).
3. Click **Create your first campaign** > **Firebase Notification messages**.
4. Enter a **Notification title** and **Notification text**.
5. Click **Send test message**.
6. Paste the FCM token (obtained from `getToken()` in the app) into the **Add an FCM registration token** field.
7. Click **Test**.

The notification should appear on the device. If the app is in the foreground, the `notificationReceived` listener fires. If the app is in the background, the system displays the notification and tapping it fires `notificationActionPerformed`.

## Via Firebase Admin SDK (Server-Side)

Install the Firebase Admin SDK on your backend:

```bash
npm install firebase-admin
```

Send a notification:

```typescript
import * as admin from 'firebase-admin';

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert('path/to/serviceAccountKey.json'),
});

const message = {
  notification: {
    title: 'Test Notification',
    body: 'This is a test push notification.',
  },
  token: '<FCM_DEVICE_TOKEN>',
};

const response = await admin.messaging().send(message);
console.log('Message sent:', response);
```

## Via cURL

Send a test notification using the FCM HTTP v1 API:

```bash
curl -X POST \
  "https://fcm.googleapis.com/v1/projects/<YOUR_PROJECT_ID>/messages:send" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "<FCM_DEVICE_TOKEN>",
      "notification": {
        "title": "Test Notification",
        "body": "This is a test push notification."
      }
    }
  }'
```

Obtain the access token using the Google Cloud CLI: `gcloud auth print-access-token`.

## Testing Tips

- **iOS Simulator cannot receive push notifications.** Test on a physical iOS device.
- **Android Emulator can receive push notifications** if Google Play Services are installed (use a Google APIs system image).
- **Background notifications**: Close the app or put it in the background before sending. Verify the system notification appears and tapping it fires `notificationActionPerformed`.
- **Foreground notifications**: Keep the app open and verify the `notificationReceived` listener fires.
- **Data-only messages**: On Android, data-only messages trigger `notificationReceived` even in the background. On iOS, use the `content-available` key for silent push.
