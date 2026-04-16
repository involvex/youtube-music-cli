# Local Notifications

Schedule device notifications locally without server-based push.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/local-notifications
npx cap sync
```

## Configuration

### Android

- Android 13+: `checkPermissions()` / `requestPermissions()` required.
- Android 12+: `SCHEDULE_EXACT_ALARM` permission in `android/app/src/main/AndroidManifest.xml`.
- Android 14: `USE_EXACT_ALARM` permission (no user prompt).
- Config options: `smallIcon` (drawable resource), `iconColor`, `sound` in `capacitor.config.ts`.

## Usage

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

await LocalNotifications.schedule({
  notifications: [
    {
      title: 'Reminder',
      body: 'Time to check in!',
      id: 1,
      schedule: { at: new Date(Date.now() + 1000 * 60) },
    },
  ],
});

LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
  console.log('Action:', notification.actionId);
});
```

## Notes

- Exact alarms during Doze fire max once per 9 min/app.
- Channel config on Android 8+ affects sound and cannot change post-install.
- Supports `createChannel()`, `deleteChannel()`, `listChannels()`.
