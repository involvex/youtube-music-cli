# PostHog

Unofficial Capacitor plugin for PostHog analytics. Supports event capture, user identification, feature flags, session replay, and more.

**Package:** `@capawesome/capacitor-posthog`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** No

## Installation

```bash
npm install @capawesome/capacitor-posthog posthog-js
npx cap sync
```

### Android Variables

Defined in `android/variables.gradle`:

- `$posthogVersion` version of `com.posthog:posthog-android` (default: `3.27.2`)
- `$androidxCoreKtxVersion` version of `androidx.core:core-ktx` (default: `1.13.1`)

## Configuration

Configure via `capacitor.config.ts`:

```typescript
/// <reference types="@capawesome/capacitor-posthog" />

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  plugins: {
    Posthog: {
      apiKey: 'YOUR_API_KEY',
      apiHost: 'https://eu.i.posthog.com',
    },
  },
};

export default config;
```

Or via `capacitor.config.json`:

```json
{
  "plugins": {
    "Posthog": {
      "apiKey": "YOUR_API_KEY",
      "apiHost": "https://eu.i.posthog.com"
    }
  }
}
```

Key configuration options:

| Property | Default | Description |
|---|---|---|
| `apiKey` | - | PostHog project API key |
| `apiHost` | `https://us.i.posthog.com` | API host or reverse proxy URL |
| `uiHost` | - | PostHog UI host (Web only, for reverse proxy setups) |
| `enableSessionReplay` | `false` | Enable session recording |

Alternatively, call `Posthog.setup()` at runtime instead of using Capacitor config.

## Usage

### Setup (runtime)

```typescript
import { Posthog } from '@capawesome/capacitor-posthog';

await Posthog.setup({
  apiKey: 'YOUR_API_KEY',
  apiHost: 'https://eu.i.posthog.com',
});
```

### Capture an event

```typescript
import { Posthog } from '@capawesome/capacitor-posthog';

await Posthog.capture({
  event: 'button_clicked',
  properties: { page: 'home' },
});
```

### Identify a user

```typescript
import { Posthog } from '@capawesome/capacitor-posthog';

await Posthog.identify({
  distinctId: 'user-123',
  userProperties: { plan: 'premium' },
});
```

### Feature flags

```typescript
import { Posthog } from '@capawesome/capacitor-posthog';

const { enabled } = await Posthog.isFeatureEnabled({ key: 'new-feature' });
const { value } = await Posthog.getFeatureFlag({ key: 'new-feature' });
await Posthog.reloadFeatureFlags();
```

### Reset user

```typescript
import { Posthog } from '@capawesome/capacitor-posthog';

await Posthog.reset();
```

## Notes

- If using Capacitor config for setup, do not call `setup()` at runtime.
- `flush()` is only available on Android and iOS.
- `screen()` is only available on Android and iOS.
- For reverse proxy setups, set `apiHost` to the proxy URL and `uiHost` to the PostHog app host. `uiHost` is Web-only.
- `host` is a deprecated alias for `apiHost`.
- Session replay supports configuration for masking text inputs, images, and capturing network telemetry.
- This project is not affiliated with PostHog, Inc.
