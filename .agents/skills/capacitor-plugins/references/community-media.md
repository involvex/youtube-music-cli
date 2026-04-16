# Media

Capacitor plugin for saving and retrieving photos and videos, and managing photo albums.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor-community/media
npx cap sync
```

## Configuration

### iOS

Add to `ios/App/App/Info.plist`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Access to photo library is needed to get albums and media.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Access is needed to save photos and videos to your library.</string>
```

### Android

For basic usage (app-specific albums only), add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

For gallery apps that need access to **all** device albums, also add:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

And enable gallery mode in `capacitor.config.ts`:

```typescript
plugins: {
  Media: {
    androidGalleryMode: true,
  },
}
```

## Usage

```typescript
import { Media } from '@capacitor-community/media';

// Get albums
const { albums } = await Media.getAlbums();

// Create an album
await Media.createAlbum({ name: 'My Album' });

// Save a photo (from URL, base64, or local file path)
const result = await Media.savePhoto({
  path: 'https://example.com/photo.jpg',
  albumIdentifier: albums[0].identifier,
});

// Save a video
await Media.saveVideo({
  path: 'https://example.com/video.mp4',
  albumIdentifier: albums[0].identifier,
});

// Get media thumbnails (iOS only)
const { medias } = await Media.getMedias({
  quantity: 50,
  thumbnailWidth: 256,
  thumbnailHeight: 256,
  thumbnailQuality: 80,
  types: 'all',
});

// Get full-quality file path from identifier (iOS only)
const { path } = await Media.getMediaByIdentifier({
  identifier: medias[0].identifier,
});
```

## Notes

- Web is not supported.
- `getMedias()` and `getMediaByIdentifier()` are iOS-only. On Android, the media asset identifier is already a file path.
- `getAlbumsPath()` is Android-only and returns the filesystem path where album folders are stored.
- `savePhoto()` supports images and GIFs. The former `saveGif()` method was removed in v6.
- On iOS 14+, if no `albumIdentifier` is provided and no permissions have been requested yet, add-only permissions are requested instead of full access.
- `fileName` option in `savePhoto()`/`saveVideo()` is Android-only.
