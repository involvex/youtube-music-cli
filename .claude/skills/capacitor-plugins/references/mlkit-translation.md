# MLKit Translation

Unofficial Capacitor plugin for ML Kit Translation. On-device text translation between 59 languages.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-mlkit/translation
npx cap sync
```

## Configuration

### Android

Optional `variables.gradle` variable: `mlkitTranslateVersion` (default: `17.0.3`).

### iOS

Set minimum deployment target in `ios/App/Podfile`:

```ruby
platform :ios, '15.5'
```

CocoaPods only — SPM is not supported.

## Usage

```typescript
import { Translation, Language } from '@capacitor-mlkit/translation';

const { text } = await Translation.translate({
  text: 'Good morning!',
  sourceLanguage: Language.English,
  targetLanguage: Language.German,
});

await Translation.downloadModel({ language: Language.English });
const { languages } = await Translation.getDownloadedModels();
await Translation.deleteDownloadedModel({ language: Language.English });
```

## Notes

- Language models are ~30MB each.
- If a model is not downloaded, `translate()` auto-downloads it (adds latency on first call).
- 59 supported languages including English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, and many more.
