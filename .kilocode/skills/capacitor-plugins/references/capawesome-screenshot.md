# Screenshot

Capacitor plugin for taking screenshots. Returns a file path (Android/iOS) or data URI (Web).

**Package:** `@capawesome/capacitor-screenshot`
**Platforms:** Android, iOS, Web
**Capawesome Insiders:** No

## Installation

```bash
npm install @capawesome/capacitor-screenshot
npx cap sync
```

For Web platform support, also install `html2canvas`:

```bash
npm install html2canvas
```

## Usage

### Take a screenshot

```typescript
import { Screenshot } from '@capawesome/capacitor-screenshot';

const { uri } = await Screenshot.take();
console.log('Screenshot saved at:', uri);
```

## Notes

- On Android and iOS, `uri` is a file path to the saved screenshot.
- On Web, `uri` is a data URI string.
- Web support requires the `html2canvas` package to be installed separately.
- No platform-specific configuration is required.
