# Datetime Picker

Capacitor plugin for date and time selection with localization, theming, and min/max constraints.

**Package:** `@capawesome-team/capacitor-datetime-picker`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome-team/capacitor-datetime-picker
npx cap sync
```

No platform-specific configuration required.

## Usage

```typescript
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker';

const present = async () => {
  const date = new Date('1995-12-24T02:23:00');

  const { value } = await DatetimePicker.present({
    cancelButtonText: 'Cancel',
    doneButtonText: 'Ok',
    mode: 'time',
    value: date.toISOString(),
    theme: 'dark',
    locale: 'en-US',
  });

  return value;
};

const cancel = async () => {
  await DatetimePicker.cancel();
};
```

## Key Options

- `mode`: `'date'`, `'time'`, or `'datetime'` (default: `'datetime'`).
- `format`: Format string for input/output values (default: `"yyyy-MM-dd'T'HH:mm:ss.sss'Z'"`).
- `locale`: BCP 47 language tag for UI language.
- `theme`: `'auto'`, `'light'`, or `'dark'`.
- `min` / `max`: Earliest/latest selectable date/time (must match `format`).
- `value`: Predefined value when opening the picker (must match `format`).
- `androidDatePickerMode`: `'spinner'` or `'calendar'` (Android only).
- `androidTimePickerMode`: `'clock'` or `'spinner'` (Android only).
- `minuteInterval`: Minute granularity for time picker (iOS only, must divide evenly into 60).

## Notes

- An error is thrown if the user cancels or dismisses the picker.
- The `cancel()` method can programmatically dismiss the active picker.
- The returned `value` format matches the `format` parameter.
