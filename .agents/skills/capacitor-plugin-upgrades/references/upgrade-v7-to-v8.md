# Upgrade: Capacitor Plugin 7 → 8

## Step 1: Attempt Automated Upgrade

Run the official migration tool from the plugin's root directory:

```bash
npx @capacitor/plugin-migration-v7-to-v8@latest
```

If the automated upgrade completes successfully, skip to **Step 9**.
If any steps fail, continue with the manual steps below.

## Step 2: Update Capacitor Dependencies

In `package.json`:

- Update `@capacitor/cli`, `@capacitor/core`, `@capacitor/android`, and `@capacitor/ios` in `devDependencies` to `^8.0.0`.
- Update `@capacitor/core` in `peerDependencies` to `>=8.0.0`.

```bash
npm install
```

## Step 3: Update Android SDK Targets

In the plugin's `android/build.gradle`:

```diff
 android {
-    compileSdk project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 35
+    compileSdk = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
     defaultConfig {
-        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 23
+        minSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
-        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 35
+        targetSdkVersion = project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
     }
 }
```

## Step 4: Update Android Plugin Variables

In `android/build.gradle`, update the `ext` block. Only add/update variables the plugin actually uses:

```groovy
ext {
    junitVersion = project.hasProperty('junitVersion') ? rootProject.ext.junitVersion : '4.13.2'
    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.1'
    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.3.0'
    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.7.0'
}
```

### Full Android Plugin Variable Reference (v8)

The following is the complete list of updated variable versions. Only add/update variables the plugin actually uses:

```groovy
ext {
    junitVersion = project.hasProperty('junitVersion') ? rootProject.ext.junitVersion : '4.13.2'
    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.1'
    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.3.0'
    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.7.0'
    androidxActivityVersion = project.hasProperty('androidxActivityVersion') ? rootProject.ext.androidxActivityVersion : '1.11.0'
    androidxCoordinatorLayoutVersion = project.hasProperty('androidxCoordinatorLayoutVersion') ? rootProject.ext.androidxCoordinatorLayoutVersion : '1.3.0'
    androidxCoreVersion = project.hasProperty('androidxCoreVersion') ? rootProject.ext.androidxCoreVersion : '1.17.0'
    androidxFragmentVersion = project.hasProperty('androidxFragmentVersion') ? rootProject.ext.androidxFragmentVersion : '1.8.9'
    firebaseMessagingVersion = project.hasProperty('firebaseMessagingVersion') ? rootProject.ext.firebaseMessagingVersion : '25.0.1'
    androidxBrowserVersion = project.hasProperty('androidxBrowserVersion') ? rootProject.ext.androidxBrowserVersion : '1.9.0'
    androidxMaterialVersion = project.hasProperty('androidxMaterialVersion') ? rootProject.ext.androidxMaterialVersion : '1.13.0'
    androidxExifInterfaceVersion = project.hasProperty('androidxExifInterfaceVersion') ? rootProject.ext.androidxExifInterfaceVersion : '1.4.1'
    coreSplashScreenVersion = project.hasProperty('coreSplashScreenVersion') ? rootProject.ext.coreSplashScreenVersion : '1.2.0'
    androidxWebkitVersion = project.hasProperty('androidxWebkitVersion') ? rootProject.ext.androidxWebkitVersion : '1.14.0'
}
```

#### Version Changes from v7

| Variable                            | v7 Value  | v8 Value  |
| ----------------------------------- | --------- | --------- |
| `androidxAppCompatVersion`          | `1.7.0`   | `1.7.1`   |
| `androidxJunitVersion`              | `1.2.1`   | `1.3.0`   |
| `androidxEspressoCoreVersion`       | `3.6.1`   | `3.7.0`   |
| `androidxActivityVersion`           | —         | `1.11.0`  |
| `androidxCoordinatorLayoutVersion`  | —         | `1.3.0`   |
| `androidxCoreVersion`               | —         | `1.17.0`  |
| `androidxFragmentVersion`           | —         | `1.8.9`   |
| `firebaseMessagingVersion`          | —         | `25.0.1`  |
| `androidxBrowserVersion`            | —         | `1.9.0`   |
| `androidxMaterialVersion`           | —         | `1.13.0`  |
| `androidxExifInterfaceVersion`      | —         | `1.4.1`   |
| `coreSplashScreenVersion`           | —         | `1.2.0`   |
| `androidxWebkitVersion`             | —         | `1.14.0`  |

## Step 5: Update Gradle Plugin and Wrapper

### 5a: Update Gradle plugin to 8.13.0

In `android/build.gradle`:

```diff
 dependencies {
-    classpath 'com.android.tools.build:gradle:8.7.2'
+    classpath 'com.android.tools.build:gradle:8.13.0'
 }
```

### 5b: Update Gradle wrapper to 8.14.3

In `android/gradle/wrapper/gradle-wrapper.properties`:

```diff
-distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-all.zip
+distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-all.zip
```

### 5c: Update Google Services plugin (if used)

```diff
-classpath 'com.google.gms:google-services:4.4.2'
+classpath 'com.google.gms:google-services:4.4.4'
```

## Step 6: Update Gradle Property Syntax

Replace all space-assignment syntax with `=` assignment in all `.gradle` files:

```diff
 repositories {
     maven {
-        url "https://plugins.gradle.org/m2/"
+        url = "https://plugins.gradle.org/m2/"
     }
 }

 android {
-    namespace 'com.example.plugin'
+    namespace = 'com.example.plugin'
 }

 lintOptions {
-    abortOnError false
+    abortOnError = false
 }
```

Method calls (like `mavenCentral()`) remain unchanged — do not add `=` to those.

## Step 7: Update Java and Kotlin Versions

### 7a: Update to Java 21 (recommended)

In `android/build.gradle`:

```diff
 compileOptions {
-    sourceCompatibility JavaVersion.VERSION_17
+    sourceCompatibility JavaVersion.VERSION_21
-    targetCompatibility JavaVersion.VERSION_17
+    targetCompatibility JavaVersion.VERSION_21
 }
```

### 7b: Update Kotlin version (if used)

If the plugin uses Kotlin, update the default version to `2.2.20`:

```diff
 buildscript {
-    ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.9.25'
+    ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '2.2.20'
 }
```

### 7c: Migrate kotlinOptions to compilerOptions (if using Kotlin)

Capacitor 8 plugins using Kotlin should update from Kotlin 1.x to `2.2.20`. This is a major version upgrade with breaking changes.

The `kotlinOptions{}` block in Gradle is deprecated and raises an error in Kotlin 2.2. Replace with `compilerOptions{}`:

```diff
+import org.jetbrains.kotlin.gradle.dsl.JvmTarget
+
 android {
-    kotlinOptions {
-        jvmTarget = '17'
-    }
 }

+kotlin {
+    compilerOptions {
+        jvmTarget = JvmTarget.JVM_21
+    }
+}
```

The `kotlin {}` block must be at the top level of `build.gradle`, not inside `android {}`.
Use `JvmTarget.JVM_21` if using Java 21 (recommended), or match the Java version.

#### `kotlin-android-extensions` plugin removed

The `kotlin-android-extensions` plugin is no longer available. Replace with:
- `kotlin-parcelize` plugin for `Parcelable` implementation.
- Android Jetpack's view bindings for synthetic view access.

For a complete list of breaking changes, see the [Kotlin 2.2.0 release notes](https://kotlinlang.org/docs/whatsnew22.html).

## Step 8: Update iOS Configuration

### 8a: Update CocoaPods podspec

In the plugin's `.podspec` file:

```diff
-s.ios.deployment_target = '14.0'
+s.ios.deployment_target = '15.0'
```

### 8b: Update Swift Package Manager (if SPM-compatible)

In `Package.swift`:

```diff
-    platforms: [.iOS(.v14)],
+    platforms: [.iOS(.v15)],
```

Update the Capacitor SPM dependency:

```diff
 dependencies: [
-    .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
+    .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
 ],
```

### 8c: Update Podfile (if plugin has a test app)

```diff
-platform :ios, '14.0'
+platform :ios, '15.0'
```

### 8d: Update Xcode project (if plugin uses old structure)

Set **iOS Deployment Target** to **15.0** for both the Project and all Targets in Xcode.

## Step 9: Sync and Test

```bash
npm install
npx cap sync
```

Build the plugin's test/example app on both platforms to verify.

## Error Handling

* If the automated upgrade tool (`@capacitor/plugin-migration-v7-to-v8`) fails, apply the manual steps above for the failing parts.
* If Android build fails with Gradle property syntax errors, search all `.gradle` files for property assignments without `=` and update them. Remember: method calls do not use `=`.
* If Kotlin compilation fails after updating to 2.2, check the Kotlin 2.2 breaking changes in Step 7c above.
* If iOS build fails, verify the deployment target is set to 15.0 in both the podspec and Package.swift (if applicable).
