# Upgrade: Capacitor Plugin 5 → 6

## Step 1: Attempt Automated Upgrade

Run the official migration tool from the plugin's root directory:

```bash
npx @capacitor/plugin-migration-v5-to-v6@latest
```

If the automated upgrade completes successfully, skip to **Step 7**.
If any steps fail, continue with the manual steps below.

## Step 2: Update Capacitor Dependencies

In `package.json`, update `@capacitor/cli`, `@capacitor/core`, `@capacitor/android`, and `@capacitor/ios` to `latest-6` version.

```bash
npm install
```

## Step 3: Update Android SDK Targets

In the plugin's `android/build.gradle`, replace deprecated `compileSdkVersion` with `compileSdk` and update targets:

```diff
 android {
-    compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 33
+    compileSdk project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 34
-    targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 33
+    targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 34
 }
```

## Step 4: Update Gradle Plugin and Wrapper

### 4a: Update Gradle plugin to 8.2.1

```diff
 dependencies {
-    classpath 'com.android.tools.build:gradle:8.0.0'
+    classpath 'com.android.tools.build:gradle:8.2.1'
 }
```

### 4b: Update Gradle wrapper to 8.2.1

In `android/gradle/wrapper/gradle-wrapper.properties`:

```diff
-distributionUrl=https\://services.gradle.org/distributions/gradle-8.0.2-all.zip
+distributionUrl=https\://services.gradle.org/distributions/gradle-8.2.1-all.zip
```

## Step 5: Update Kotlin Version (if used)

```diff
-ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.8.20'
+ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.9.10'
```

## Step 6: Handle Code Breaking Changes

### 6a: Remove removeAllListeners from .m file (iOS)

If the plugin's `.m` file has `CAP_PLUGIN_METHOD(removeAllListeners, CAPPluginReturnPromise)`, remove it. The method is now available for all plugins without defining it.

### 6b: Update addListener signature (TypeScript)

In `definitions.ts`, update `addListener` return type:

```diff
 addListener(
   eventName: 'resume',
   listenerFunc: () => void,
-): Promise<PluginListenerHandle> & PluginListenerHandle;
+): Promise<PluginListenerHandle>;
```

### 6c: Add SPM support (optional)

Capacitor 6 adds experimental SPM support. Follow the [Converting existing plugins to SPM](https://capacitorjs.com/docs/ios/spm#converting-existing-plugins-to-spm) guide to add support.

## Step 7: Sync and Test

```bash
npm install
npx cap sync
```

Build the plugin's test/example app on both platforms to verify.

## Error Handling

* If the automated upgrade tool fails, apply the manual steps above for the failing parts.
* If Android build fails, run **Tools > AGP Upgrade Assistant** in Android Studio.
* If TypeScript compilation fails, check for `addListener` calls that use `& PluginListenerHandle` in the return type.
