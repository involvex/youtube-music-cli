# Android Dark Mode Support

Enable correct behavior of the `prefers-color-scheme` CSS media feature on Android.

**Package:** `@capawesome/capacitor-android-dark-mode-support`
**Platforms:** Android

## Installation

```bash
npm install @capawesome/capacitor-android-dark-mode-support
npx cap sync
```

### Android

#### Variables

Optionally define in `android/variables.gradle`:

- `$androidxWebkitVersion` version of `androidx.webkit:webkit` (default: `1.9.0`)

## Usage

The plugin only needs to be installed. No code changes are required.

Once installed, the [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) CSS media feature will work correctly on Android, enabling seamless dark mode support.

## Notes

- This is a zero-configuration plugin. Just install it and it works.
- No API methods are exposed. The plugin automatically patches the WebView behavior.
- Only affects Android. On iOS and Web, `prefers-color-scheme` already works natively.
