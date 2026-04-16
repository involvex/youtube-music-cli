# Managed Configurations

Capacitor plugin to access managed configuration settings (MDM/EMM).

**Package:** `@capawesome/capacitor-managed-configurations`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-managed-configurations
npx cap sync
```

### Android

You must declare the app's managed configurations. See [Define managed configurations](https://developer.android.com/work/managed-configurations#define-configuration) in the Android documentation.

No additional iOS configuration required.

## Usage

```typescript
import { ManagedConfigurations } from '@capawesome/capacitor-managed-configurations';

const getString = async () => {
  const result = await ManagedConfigurations.getString({ key: 'server_url' });
  return result.value;
};

const getNumber = async () => {
  const result = await ManagedConfigurations.getNumber({ key: 'server_port' });
  return result.value;
};

const getBoolean = async () => {
  const result = await ManagedConfigurations.getBoolean({
    key: 'download_on_cellular',
  });
  return result.value;
};
```

## Key Methods

- `getString({ key })`: Get a string configuration value, or `null` if not set.
- `getNumber({ key })`: Get a number configuration value, or `null` if not set.
- `getBoolean({ key })`: Get a boolean configuration value, or `null` if not set.

## Notes

- All methods return `null` if no mapping exists for the given key.
- On Android, set up a device owner testing environment for local testing. See [Set up device owner for testing](https://source.android.com/devices/tech/admin/testing-setup#set_up_the_device_owner_for_testing).
- On iOS, the app must be installed as a managed app via an MDM solution for configurations to be available.
