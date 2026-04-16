# Cordova SDK Migration

Migrate from the legacy Ionic Cordova Live Updates SDK (`cordova-plugin-ionic`) to the Capawesome Live Update plugin (`@capawesome/capacitor-live-update`).

## Import

```diff
-import { Deploy } from 'cordova-plugin-ionic';
+import { LiveUpdate } from '@capawesome/capacitor-live-update';
```

For Angular 15 and below, the import path may be `cordova-plugin-ionic/dist/ngx`.

## Method Mapping

### Sync and Update

The Cordova SDK uses a granular check-download-extract-reload workflow. The Capawesome SDK consolidates this into a single `sync()` call:

```diff
-const update = await Deploy.checkForUpdate();
-if (update.available) {
-  await Deploy.downloadUpdate((progress) => {
-    console.log(progress);
-  });
-  await Deploy.extractUpdate((progress) => {
-    console.log(progress);
-  });
-  await Deploy.reloadApp();
-}
+const { nextBundleId } = await LiveUpdate.sync();
+if (nextBundleId) {
+  await LiveUpdate.reload();
+}
```

To track download progress with the Capawesome SDK, use the `downloadBundleProgress` event listener:

```typescript
LiveUpdate.addListener('downloadBundleProgress', (event) => {
  console.log(`${Math.round(event.progress * 100)}%`);
});
```

The Cordova `Deploy.sync()` method (automatic variant) maps directly:

```diff
-await Deploy.sync({ updateMethod: 'auto' });
+const { nextBundleId } = await LiveUpdate.sync();
+if (nextBundleId) {
+  await LiveUpdate.reload();
+}
```

### Bundle Management

| Cordova SDK (`Deploy`) | Capawesome SDK (`LiveUpdate`) |
|---|---|
| `getCurrentVersion()` | `getCurrentBundle()` |
| `getAvailableVersions()` | `getBundles()` |
| `getVersionById(versionId)` | `getCurrentBundle()` or `getNextBundle()` |
| `deleteVersionById(versionId)` | `deleteBundle({ bundleId })` |
| `reloadApp()` | `reload()` |

### Configuration

| Cordova SDK (`Deploy`) | Capawesome SDK (`LiveUpdate`) |
|---|---|
| `configure({ appId, channel })` | `setConfig({ appId })` + `setChannel({ channel })` |
| `configure({ maxVersions })` | No runtime equivalent. Use `autoDeleteBundles: true` in static config |
| `configure({ minBackgroundDuration })` | No equivalent. Removed in Capacitor SDK |
| `configure({ updateMethod })` | No runtime equivalent. Use `autoUpdateStrategy` in static config |
| `getConfiguration()` | `getConfig()` + `getChannel()` |

### Return Type Differences

**`CheckForUpdateResponse`** has no equivalent. Use `fetchLatestBundle()` to check for available updates without downloading:

```typescript
const result = await LiveUpdate.fetchLatestBundle();
if (result.bundleId) {
  console.log(`Update available: ${result.bundleId}`);
}
```

**`ISnapshotInfo`** fields like `binaryVersion`, `binaryVersionCode`, `binaryVersionName` are available via separate methods:

```typescript
const { versionCode } = await LiveUpdate.getVersionCode();
const { versionName } = await LiveUpdate.getVersionName();
```

## Native Configuration Cleanup

Remove leftover Cordova configuration from native projects:

### iOS (`ios/App/App/Info.plist`)

Delete these keys if present:
- `IonAppId`
- `IonChannelName`
- `IonUpdateMethod`
- `IonMaxVersions`
- `IonMinBackgroundDuration`
- `IonApi`

### Android (`android/app/src/main/res/values/strings.xml`)

Delete these entries if present:
- `ionic_app_id`
- `ionic_channel_name`
- `ionic_update_method`
- `ionic_max_versions`
- `ionic_min_background_duration`
- `ionic_update_api`

### Capacitor Config

Remove any `cordova.preferences.DisableDeploy` entry from `capacitor.config.ts` or `capacitor.config.json`.
