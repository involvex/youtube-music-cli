# Date Picker

Capacitor plugin for displaying a native date and time picker.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/date-picker
npx cap sync
```

## Configuration

Options can be passed via the `present()` method or set globally in the Capacitor configuration file (`capacitor.config.ts` or `capacitor.config.json`):

```json
{
  "plugins": {
    "DatePickerPlugin": {
      "mode": "date",
      "locale": "pt_BR",
      "format": "dd/MM/yyyy",
      "android": {
        "theme": "MyCustomTheme"
      },
      "ios": {
        "style": "wheels"
      }
    }
  }
}
```

## Usage

```typescript
import { DatePicker } from '@capacitor-community/date-picker';

const result = await DatePicker.present({
  mode: 'date',
  locale: 'pt_BR',
  date: '13/07/2019',
  theme: 'light',
  ios: {
    format: 'dd/MM/yyyy',
  },
  android: {
    format: 'dd/MM/yyyy',
  },
});
console.log(result.value);
```

## Notes

- `mode` can be `"date"`, `"time"`, or `"dateAndTime"` (default: `"dateAndTime"`).
- Date format strings differ per platform: iOS uses [NSDateFormatter](https://developer.apple.com/documentation/foundation/dateformatter) patterns, Android uses [SimpleDateFormat](https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html) patterns. Always specify format under `ios` and `android` separately.
- iOS supports additional style options: `"inline"` (iOS 14+) or `"wheels"`, plus color customization (`titleFontColor`, `titleBgColor`, `bgColor`, `fontColor`, `buttonBgColor`, `buttonFontColor`).
- `min` and `max` options constrain the selectable date range.
- `is24h` controls 24-hour time format (default: `false`).
- `doneText` and `cancelText` customize the button labels.
- Android themes can be customized via resource styles.
- Web platform is not supported.
