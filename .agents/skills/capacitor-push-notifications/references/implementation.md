# Push Notification Implementation

## Core Implementation

### Request Permissions

Request notification permissions before retrieving the FCM token. On Android 12 and below, permissions are granted by default. On Android 13+ and iOS, the user must explicitly grant permission.

```typescript
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const requestPermissions = async (): Promise<boolean> => {
  const result = await FirebaseMessaging.requestPermissions();
  return result.receive === 'granted';
};
```

### Check Permissions

Check current permission status without prompting:

```typescript
const checkPermissions = async (): Promise<string> => {
  const result = await FirebaseMessaging.checkPermissions();
  return result.receive; // 'prompt' | 'granted' | 'denied'
};
```

### Get FCM Token

Retrieve the device's FCM registration token. Send this token to your backend to target this device with push notifications.

```typescript
const getToken = async (): Promise<string> => {
  const { token } = await FirebaseMessaging.getToken();
  return token;
};
```

On **Web**, pass the VAPID key and service worker registration (see `references/web-setup.md`).

### Delete FCM Token

Unregister the device. Call this when the user signs out:

```typescript
const deleteToken = async (): Promise<void> => {
  await FirebaseMessaging.deleteToken();
};
```

### Listen for Notifications

```typescript
// Fired when a notification is received while the app is in the foreground
await FirebaseMessaging.addListener('notificationReceived', (event) => {
  console.log('Notification received:', event.notification);
});

// Fired when the user taps on a notification
await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
  console.log('Notification tapped:', event.notification);
  console.log('Action ID:', event.actionId);
});
```

### Listen for Token Refresh

The FCM token can change over time. Listen for updates and send the new token to your backend:

```typescript
await FirebaseMessaging.addListener('tokenReceived', (event) => {
  console.log('New FCM token:', event.token);
  // Send event.token to your backend
});
```

### Remove All Listeners

```typescript
await FirebaseMessaging.removeAllListeners();
```

## Complete Setup Example

A typical initialization flow combining the core methods:

```typescript
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const initializePushNotifications = async (): Promise<void> => {
  // Listen for token refresh
  await FirebaseMessaging.addListener('tokenReceived', (event) => {
    console.log('Token refreshed:', event.token);
    // TODO: Send token to backend
  });

  // Listen for foreground notifications
  await FirebaseMessaging.addListener('notificationReceived', (event) => {
    console.log('Foreground notification:', event.notification);
  });

  // Listen for notification taps
  await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    console.log('Notification tapped:', event.notification);
    // TODO: Navigate based on notification data
  });

  // Request permission
  const permissionResult = await FirebaseMessaging.requestPermissions();
  if (permissionResult.receive !== 'granted') {
    console.warn('Push notification permission not granted');
    return;
  }

  // Get FCM token
  const { token } = await FirebaseMessaging.getToken();
  console.log('FCM token:', token);
  // TODO: Send token to backend
};
```

## Optional Features

### Topic Subscriptions (Android/iOS Only)

Subscribe to a topic to receive messages sent to that topic without managing individual device tokens:

```typescript
await FirebaseMessaging.subscribeToTopic({ topic: 'news' });
await FirebaseMessaging.unsubscribeFromTopic({ topic: 'news' });
```

### Notification Channels (Android SDK 26+ Only)

Create custom notification channels to let users control notification behavior per channel:

```typescript
import { FirebaseMessaging, Importance } from '@capacitor-firebase/messaging';

await FirebaseMessaging.createChannel({
  id: 'orders',
  name: 'Order Updates',
  description: 'Notifications about order status changes',
  importance: Importance.High,
  sound: 'notification_sound', // file in android/app/src/main/res/raw/
  vibration: true,
  lights: true,
});

// Delete a channel
await FirebaseMessaging.deleteChannel({ id: 'orders' });

// List all channels
const { channels } = await FirebaseMessaging.listChannels();
```

### Delivered Notifications Management

```typescript
// Get all visible notifications
const { notifications } = await FirebaseMessaging.getDeliveredNotifications();

// Remove specific notifications
await FirebaseMessaging.removeDeliveredNotifications({
  notifications: [{ id: 'notification-id' }],
});

// Remove all notifications
await FirebaseMessaging.removeAllDeliveredNotifications();
```
