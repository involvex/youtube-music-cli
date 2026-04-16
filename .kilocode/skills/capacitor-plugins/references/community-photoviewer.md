# Photo Viewer

Capacitor community plugin for displaying photos in a fullscreen viewer with zoom and sharing features.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/photoviewer
npx cap sync
```

## Configuration

### Plugin Configuration

In `capacitor.config.ts` (or `capacitor.config.json`), configure the image download location:

```ts
const config: CapacitorConfig = {
  plugins: {
    PhotoViewer: {
      iosImageLocation: 'Library/Images',
      androidImageLocation: 'Files/Images',
    },
  },
};
```

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need to write photos.</string>
```

### Android

1. In `android/app/src/main/res/xml/file_paths.xml`, add:

```xml
<files-path name="files" path="."/>
```

2. In `android/build.gradle` (project-level), ensure Kotlin is declared:

```groovy
buildscript {
    ext.kotlin_version = '1.9.25'
    dependencies {
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}
```

3. In `android/app/build.gradle` (module-level):

```diff
 apply plugin: 'com.android.application'
+apply plugin: 'kotlin-android'
+apply plugin: 'kotlin-kapt'
```

Add to the `android` block:

```groovy
buildFeatures {
    dataBinding = true
}
```

Add to `repositories`:

```groovy
maven { url 'https://jitpack.io' }
```

Add to `dependencies`:

```groovy
implementation "androidx.core:core-ktx:1.15.0"
implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
```

### Web

Install the companion Stencil component:

```bash
npm install --save-dev jeep-photoviewer@latest
```

## Usage

```typescript
import { PhotoViewer } from '@capacitor-community/photoviewer';

// Show multiple images in a gallery/slider
await PhotoViewer.show({
  images: [
    { url: 'https://example.com/photo1.jpg', title: 'Photo 1' },
    { url: 'https://example.com/photo2.jpg', title: 'Photo 2' },
  ],
  mode: 'slider',
});

// Show with custom HTTP headers
await PhotoViewer.show({
  images: [
    { url: 'https://example.com/photo1.jpg', title: 'Photo 1' },
  ],
  options: {
    customHeaders: {
      accept: 'image/jpeg, image/png',
      cookie: 'session=foo;',
    },
  },
});
```

## Notes

- Supports images from web URLs, base64 data, and local device file paths.
- Gallery mode (multiple images): tap to go fullscreen, double-tap or pinch to zoom.
- Single image mode: pinch-zoom, pan, double-tap to max zoom.
- `saveImageFromHttpToInternal` and `getInternalImagePaths` are iOS-only methods.
- On iOS, creating a movie from photos in the All Photos folder is supported.
