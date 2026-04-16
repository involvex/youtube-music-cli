# Web Configuration

## Initialize Firebase

Firebase must be initialized on the web platform. Add initialization code to the app's entry point (e.g., `main.ts`, `app.component.ts`, or equivalent):

```typescript
import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: '<YOUR_API_KEY>',
  authDomain: '<YOUR_AUTH_DOMAIN>',
  projectId: '<YOUR_PROJECT_ID>',
  storageBucket: '<YOUR_STORAGE_BUCKET>',
  messagingSenderId: '<YOUR_MESSAGING_SENDER_ID>',
  appId: '<YOUR_APP_ID>',
};

// Only initialize Firebase on web — native platforms use google-services.json / GoogleService-Info.plist
if (!Capacitor.isNativePlatform()) {
  initializeApp(firebaseConfig);
}
```

The Firebase config values come from the Firebase console under **Project settings** > **General** > **Your apps** > **Web app**.

## Service Worker

Create a file `firebase-messaging-sw.js` in the public root of the project:

- **Angular**: `src/firebase-messaging-sw.js` and add to `angular.json` assets array:
  ```diff
   "assets": [
  +    "src/firebase-messaging-sw.js"
   ]
  ```

- **Vite / React / Vue**: `public/firebase-messaging-sw.js` (no config change needed — files in `public/` are served from root).

- **Next.js**: `public/firebase-messaging-sw.js`.

### Minimal Service Worker (Foreground Only)

If the user only needs foreground notifications, the file can be empty:

```javascript
// firebase-messaging-sw.js
// Empty file — required for FCM web SDK initialization.
```

### Background Notification Support

If the user needs background notifications, populate the service worker:

```javascript
// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '<YOUR_API_KEY>',
  authDomain: '<YOUR_AUTH_DOMAIN>',
  projectId: '<YOUR_PROJECT_ID>',
  storageBucket: '<YOUR_STORAGE_BUCKET>',
  messagingSenderId: '<YOUR_MESSAGING_SENDER_ID>',
  appId: '<YOUR_APP_ID>',
});

const messaging = firebase.messaging();
```

Replace the config values with the same Firebase config used in the main app.

## VAPID Key

The VAPID key (generated in `references/firebase-setup.md`) is required when calling `getToken()` on web. Pass it as an option:

```typescript
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const getToken = async () => {
  const options: Record<string, unknown> = {};
  if (Capacitor.getPlatform() === 'web') {
    options.vapidKey = '<YOUR_VAPID_KEY>';
    options.serviceWorkerRegistration = await navigator.serviceWorker.register(
      'firebase-messaging-sw.js'
    );
  }
  const { token } = await FirebaseMessaging.getToken(options);
  return token;
};
```
