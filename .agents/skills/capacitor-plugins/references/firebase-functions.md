# Firebase Functions

Unofficial Capacitor plugin for Firebase Cloud Functions. Call callable functions by name or URL.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/functions
npx cap sync
```

## Configuration

### Android

Set `firebaseFunctionsVersion` in `variables.gradle` (default: `22.1.0`).

## Usage

```typescript
import { FirebaseFunctions } from '@capacitor-firebase/functions';

const { data } = await FirebaseFunctions.callByName({
  name: 'helloWorld',
  data: { key: 'value' },
});

const { data: data2 } = await FirebaseFunctions.callByUrl({
  url: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/helloWorld',
  data: { key: 'value' },
});
```

## Notes

- Does NOT require `firebase` as a peer dependency.
- `callByName()` supports optional `region` parameter.
- For emulator on Android, enable cleartext traffic in Capacitor config: `{ "server": { "cleartext": true } }`.
