# Zip

Zip and unzip files and directories with support for password-based encryption.

**Package:** `@capawesome-team/capacitor-zip`
**Platforms:** Android, iOS
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-zip
npx cap sync
```

## Configuration

### Android

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

#### Variables

The `$zip4jVersion` variable in `android/app/variables.gradle` can override the default `net.lingala.zip4j:zip4j` version (default: `2.11.5`).

### iOS

#### Minimum Deployment Target

If using Swift Package Manager, set the iOS deployment target to at least `16.0` in `ios/App/App.xcodeproj/project.pbxproj`:

```
IPHONEOS_DEPLOYMENT_TARGET = 16.0
```

If using CocoaPods, set in `ios/App/Podfile`:

```ruby
platform :ios, '16.0'
```

## Usage

### Unzip a file

```typescript
import { Zip } from '@capawesome-team/capacitor-zip';

await Zip.unzip({
  source: 'file:///path/to/archive.zip',
  destination: 'file:///path/to/output/',
  password: 'secret',
});
```

### Zip a file or directory

```typescript
import { Zip } from '@capawesome-team/capacitor-zip';

await Zip.zip({
  source: 'file:///path/to/directory/',
  destination: 'file:///path/to/archive.zip',
  password: 'secret',
});
```

## Notes

- Both `source` and `destination` use file URIs.
- The `password` parameter is optional; omit it for unencrypted archives.
- Compatible with the File Compressor plugin.
