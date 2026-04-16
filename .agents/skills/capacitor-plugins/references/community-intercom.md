# Intercom

Capacitor plugin for enabling Intercom capabilities.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/intercom
npx cap sync
```

## Configuration

Add Intercom keys to the Capacitor configuration file (`capacitor.config.ts` or `capacitor.config.json`):

### iOS

```json
{
  "plugins": {
    "Intercom": {
      "iosApiKey": "ios_sdk-xxx",
      "iosAppId": "yyy"
    }
  }
}
```

### Android

```json
{
  "plugins": {
    "Intercom": {
      "androidApiKey": "android_sdk-xxx",
      "androidAppId": "yyy"
    }
  }
}
```

## Usage

```typescript
import { Intercom } from '@capacitor-community/intercom';
import { PushNotifications } from '@capacitor/push-notifications';

// Register for push notifications from Intercom
PushNotifications.register();

// Register an identified user
Intercom.registerIdentifiedUser({ userId: '123456' });
Intercom.registerIdentifiedUser({ email: 'test@example.com' });
Intercom.registerIdentifiedUser({ userId: '123456', email: 'test@example.com' });

// Register an unidentified user
Intercom.registerUnidentifiedUser();

// Update user attributes
Intercom.updateUser({ name: 'John', email: 'john@example.com' });

// Log an event
Intercom.logEvent({ name: 'my-event', data: { pi: 3.14 } });

// Display the messenger / message composer
Intercom.displayMessenger();
Intercom.displayMessageComposer({ message: 'Hello there!' });

// Display help center
Intercom.displayHelpCenter();

// Display a specific article
Intercom.displayArticle({ articleId: '123' });

// Identity Verification
Intercom.setUserHash({ hmac: 'xyz' });

// Secure Messenger with JWT
Intercom.setUserJwt({ jwt: 'xyz' });

// Logout
Intercom.logout();

// Listen for messenger events
Intercom.addListener('windowDidShow', () => {
  console.log('Intercom messenger shown');
});
Intercom.addListener('windowDidHide', () => {
  console.log('Intercom messenger hidden');
});
```

## Notes

- Keys can also be provided at runtime via `loadWithKeys({ appId, apiKeyIOS, apiKeyAndroid })` instead of the config file.
- `setBottomPadding({ value })` adjusts the bottom padding of the Intercom messenger.
- `sendPushTokenToIntercom({ value })` forwards push tokens for Intercom push notifications.
- `displayLauncher()` / `hideLauncher()` control the Intercom launcher visibility.
- `displayInAppMessages()` / `hideInAppMessages()` control in-app message visibility.
- Events: `windowDidShow` and `windowDidHide` fire when the messenger opens/closes.
