# Action Sheet

Provides access to native Action Sheets.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/action-sheet
npx cap sync
```

## Configuration

### Android

Set `androidxMaterialVersion` in `variables.gradle` (default: `1.13.0`).

### Web

Requires PWA Elements (`@ionic/pwa-elements`).

## Usage

```typescript
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';

const result = await ActionSheet.showActions({
  title: 'Photo Options',
  message: 'Select an option to perform',
  options: [
    { title: 'Upload' },
    { title: 'Share' },
    { title: 'Remove', style: ActionSheetButtonStyle.Destructive },
  ],
});
console.log('Action index:', result.index);
```

## Notes

- `ActionSheetButtonStyle` (Default, Destructive, Cancel) is iOS-only.
- `message` property is iOS-only.
- `icon` property is Web-only (Ionicons).
