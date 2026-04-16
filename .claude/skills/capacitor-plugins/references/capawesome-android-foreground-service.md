# Android Foreground Service

Run a foreground service on Android with notification support, custom buttons, and notification channels.

**Package:** `@capawesome-team/capacitor-android-foreground-service`
**Platforms:** Android

## Installation

```bash
npm install @capawesome-team/capacitor-android-foreground-service
npx cap sync
```

### Android

#### Permissions

Add to `android/app/src/main/AndroidManifest.xml` before or after the `application` tag:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
```

Replace `FOREGROUND_SERVICE_LOCATION` with the foreground service types you need (e.g., `FOREGROUND_SERVICE_MICROPHONE`).

#### Receiver and Service

Add **inside** the `application` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<receiver android:name="io.capawesome.capacitorjs.plugins.foregroundservice.NotificationActionBroadcastReceiver" />
<service android:name="io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService" android:foregroundServiceType="location" />
```

Replace `location` with your desired foreground service type.

## Usage

### Start a foreground service

```typescript
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

await ForegroundService.startForegroundService({
  id: 1,
  title: 'Title',
  body: 'Body',
  smallIcon: 'ic_stat_icon_config_sample',
  buttons: [
    { title: 'Button 1', id: 1 },
    { title: 'Button 2', id: 2 },
  ],
  silent: false,
  notificationChannelId: 'default',
});
```

### Update the foreground service notification

```typescript
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

await ForegroundService.updateForegroundService({
  id: 1,
  title: 'Updated Title',
  body: 'Updated Body',
  smallIcon: 'ic_stat_icon_config_sample',
});
```

### Stop the foreground service

```typescript
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

await ForegroundService.stopForegroundService();
```

### Create a notification channel

```typescript
import { ForegroundService, Importance } from '@capawesome-team/capacitor-android-foreground-service';

await ForegroundService.createNotificationChannel({
  id: 'default',
  name: 'Default',
  description: 'Default channel',
  importance: Importance.Default,
});
```

### Handle notification button clicks

```typescript
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

await ForegroundService.addListener('buttonClicked', (event) => {
  console.log('Button clicked:', event.buttonId);
});
```

### Request notification permissions (Android 13+)

```typescript
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

const status = await ForegroundService.checkPermissions();
if (status.display !== 'granted') {
  await ForegroundService.requestPermissions();
}
```

### Move app to foreground

```typescript
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

// Requires manage overlay permission on Android SDK 23+
const { granted } = await ForegroundService.checkManageOverlayPermission();
if (!granted) {
  await ForegroundService.requestManageOverlayPermission();
}
await ForegroundService.moveToForeground();
```

## Notes

- Android-only plugin.
- `smallIcon` should be the drawable resource filename without extension, placed in `android/app/src/main/res/drawable`.
- On Android 13+, you must request notification display permissions before starting the service.
- On Android 14+, users can dismiss foreground service notifications.
- `ServiceType` values: `Location` (8), `Microphone` (128).
- `Importance` levels: `Min` (1), `Low` (2), `Default` (3), `High` (4), `Max` (5).
- If no notification channel is created, the plugin creates one named "Default".
