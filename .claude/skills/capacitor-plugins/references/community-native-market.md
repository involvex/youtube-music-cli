# Native Market

Capacitor plugin for opening native Play Store / App Store listings, developer pages, collections, and search.

**Package:** `@capacitor-community/native-market`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/native-market
npx cap sync
```

## Usage

```typescript
import { NativeMarket } from '@capacitor-community/native-market';
import { Capacitor } from '@capacitor/core';

// Open a store listing
let appId = 'id1622127552'; // iOS App Store ID
if (Capacitor.getPlatform() === 'android') {
  appId = 'io.ionic.ioniconf'; // Android package name
}
await NativeMarket.openStoreListing({ appId });

// Open a developer page (Android only)
await NativeMarket.openDevPage({ devId: '5700313618786177705' });

// Open a collection / top charts (Android only)
await NativeMarket.openCollection({ name: 'featured' });

// Open Editor's Choice page (Android only)
await NativeMarket.openEditorChoicePage({ editorChoice: 'editorial_fitness_apps_us' });

// Search the store
await NativeMarket.search({ terms: 'capacitor' });
```

## Notes

- `openStoreListing` and `search` work on both Android and iOS. All other methods are Android-only.
- The plugin does not work on the iOS Simulator because it does not have the App Store app installed.
- On Android Virtual Devices, Google Play must be installed with a logged-in user.
- On iOS, `appId` should be the App Store ID (e.g., `id1622127552`). On Android, use the package name (e.g., `com.example.app`).
