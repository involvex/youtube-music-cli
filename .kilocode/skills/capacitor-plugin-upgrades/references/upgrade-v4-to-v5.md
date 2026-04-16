# Upgrade: Capacitor Plugin 4 → 5

## Step 1: Attempt Automated Upgrade

Run the official migration tool from the plugin's root directory:

```bash
npx @capacitor/plugin-migration-v4-to-v5@latest
```

If the automated upgrade completes successfully, skip to **Step 8**.
If any steps fail, continue with the manual steps below.

## Step 2: Update Capacitor Dependencies

In `package.json`, update `@capacitor/cli`, `@capacitor/core`, `@capacitor/android`, and `@capacitor/ios` to `latest-5` version.

```bash
npm install
```

## Step 3: Update Android SDK Targets

In the plugin's `android/build.gradle`:

```diff
 android {
-    compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 32
+    compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 33
-    targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 32
+    targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 33
 }
```

## Step 4: Update Android Plugin Variables

In `android/build.gradle`:

```diff
 ext {
     junitVersion = project.hasProperty('junitVersion') ? rootProject.ext.junitVersion : '4.13.2'
-    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.4.2'
+    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.6.1'
-    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.1.3'
+    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.1.5'
-    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.4.0'
+    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.5.1'
 }
```

## Step 5: Update Gradle Plugin and Wrapper

### 5a: Update Gradle plugin to 8.0.0

```diff
 dependencies {
-    classpath 'com.android.tools.build:gradle:7.2.1'
+    classpath 'com.android.tools.build:gradle:8.0.0'
 }
```

### 5b: Update Gradle wrapper to 8.0.2

In `android/gradle/wrapper/gradle-wrapper.properties`:

```diff
-distributionUrl=https\://services.gradle.org/distributions/gradle-7.4.2-all.zip
+distributionUrl=https\://services.gradle.org/distributions/gradle-8.0.2-all.zip
```

## Step 6: Update Java, Kotlin, and Namespace

### 6a: Update to Java 17

```diff
 compileOptions {
-    sourceCompatibility JavaVersion.VERSION_11
+    sourceCompatibility JavaVersion.VERSION_17
-    targetCompatibility JavaVersion.VERSION_11
+    targetCompatibility JavaVersion.VERSION_17
 }
```

### 6b: Update Kotlin version (if used)

```diff
-ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.7.0'
+ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.8.20'
```

Replace `kotlin-stdlib-jdk7` or `kotlin-stdlib-jdk8` with `kotlin-stdlib`:

```diff
-implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
+implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
```

### 6c: Move package to build.gradle

Remove `package` from `AndroidManifest.xml` and add `namespace` to `build.gradle`:

```diff
# AndroidManifest.xml
-<manifest xmlns:android="http://schemas.android.com/apk/res/android"
-    package="[YOUR_PACKAGE_ID]">
+<manifest xmlns:android="http://schemas.android.com/apk/res/android">
```

```diff
# build.gradle
 android {
+    namespace "[YOUR_PACKAGE_ID]"
     compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 33
```

### 6d: Disable Jetifier

In `android/gradle.properties`:

```diff
 android.useAndroidX=true
-android.enableJetifier=true
```

## Step 7: Handle iOS Breaking Changes

- `CAPBridgedPlugin` protocol requirements moved to instance level.
- `pluginId` renamed to `identifier`.
- `getMethod(_:)` removed (now internal).
- `pluginMethods` type changed from `Any` to `CAPPluginMethod`.

Most plugins using the macro for `CAPBridgedPlugin` conformance are unaffected. Plugins that manually conform or cast to `CAPBridgedPlugin` must be updated.

## Step 8: Handle Android Breaking Changes

- `PluginCall.getObject()` and `PluginCall.getArray()` can now return `null` (matching iOS behavior). Add null checks around these calls.

## Step 9: Sync and Test

```bash
npm install
npx cap sync
```

Build the plugin's test/example app on both platforms to verify.

## Error Handling

* If the automated upgrade tool fails, apply the manual steps above for the failing parts.
* If Android build fails, run **Tools > AGP Upgrade Assistant** in Android Studio.
* If Jetifier removal causes build errors, a dependency still uses old support libraries.
