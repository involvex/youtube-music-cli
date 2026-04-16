# Upgrade: Capacitor Plugin 6 → 7

## Step 1: Attempt Automated Upgrade

Run the official migration tool from the plugin's root directory:

```bash
npx @capacitor/plugin-migration-v6-to-v7@latest
```

If the automated upgrade completes successfully, skip to **Step 9**.
If any steps fail, continue with the manual steps below.

## Step 2: Update Capacitor Dependencies

In `package.json`:

- Update `@capacitor/cli`, `@capacitor/core`, `@capacitor/android`, and `@capacitor/ios` in `devDependencies` to `^7.0.0`.
- Update `@capacitor/core` in `peerDependencies` to `>=7.0.0`.

```bash
npm install
```

## Step 3: Update Android SDK Targets

In the plugin's `android/build.gradle`:

```diff
 android {
-    compileSdk project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 34
+    compileSdk project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 35
     defaultConfig {
-        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 22
+        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 23
-        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 34
+        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 35
     }
 }
```

## Step 4: Update Android Plugin Variables

In `android/build.gradle`:

```diff
 ext {
     junitVersion = project.hasProperty('junitVersion') ? rootProject.ext.junitVersion : '4.13.2'
-    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.6.1'
+    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.0'
-    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.1.5'
+    androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.2.1'
-    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.5.1'
+    androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.6.1'
 }
```

## Step 5: Update Gradle Plugin and Wrapper

### 5a: Update Gradle plugin to 8.7.2

```diff
 dependencies {
-    classpath 'com.android.tools.build:gradle:8.2.1'
+    classpath 'com.android.tools.build:gradle:8.7.2'
 }
```

### 5b: Update Gradle wrapper to 8.11.1

In `android/gradle/wrapper/gradle-wrapper.properties`:

```diff
-distributionUrl=https\://services.gradle.org/distributions/gradle-8.2.1-all.zip
+distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-all.zip
```

## Step 6: Update Java and Kotlin Versions

### 6a: Update to Java 21

```diff
 compileOptions {
-    sourceCompatibility JavaVersion.VERSION_17
+    sourceCompatibility JavaVersion.VERSION_21
-    targetCompatibility JavaVersion.VERSION_17
+    targetCompatibility JavaVersion.VERSION_21
 }
```

### 6b: Update Kotlin version (if used)

```diff
-ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.9.10'
+ext.kotlin_version = project.hasProperty("kotlin_version") ? rootProject.ext.kotlin_version : '1.9.25'
```

## Step 7: Update iOS Configuration

### 7a: Update CocoaPods podspec

```diff
-s.ios.deployment_target = '13.0'
+s.ios.deployment_target = '14.0'
```

### 7b: Update Swift Package Manager (if SPM-compatible)

In `Package.swift`:

```diff
-    platforms: [.iOS(.v13)],
+    platforms: [.iOS(.v14)],
```

Update the Capacitor SPM dependency:

```diff
 dependencies: [
-    .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main")
+    .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
 ],
```

### 7c: Update Podfile (if plugin has a test app)

```diff
-platform :ios, '13.0'
+platform :ios, '14.0'
```

## Step 8: Update npm Tooling (optional)

### 8a: Update eslint

Update `@ionic/eslint-config` to `^0.4.0` and `eslint` to `^8.57.0`.

### 8b: Update swiftlint

Update `@ionic/swiftlint-config` and `swiftlint` to `^2.0.0`.

### 8c: Update prettier

Update `@ionic/prettier-config` to `^4.0.0`, `prettier` to `^3.4.2`, and `prettier-plugin-java` to `^2.6.6`. Add `--plugin=prettier-plugin-java` to the prettier npm script:

```diff
-"prettier": "prettier \"**/*.{css,html,ts,js,java}\"",
+"prettier": "prettier \"**/*.{css,html,ts,js,java}\" --plugin=prettier-plugin-java",
```

Remove `.prettierignore` entries already covered by `.gitignore` (Prettier 3.0.0+ respects `.gitignore` by default).

### 8d: Update rollup

Update `rollup` to `^4.30.1` and rename `rollup.config.js` to `rollup.config.mjs`:

```diff
-"build": "npm run clean && npm run docgen && tsc && rollup -c rollup.config.js",
+"build": "npm run clean && npm run docgen && tsc && rollup -c rollup.config.mjs",
```

### 8e: Update other dependencies

Update `rimraf` to `^6.0.1` and `@capacitor/docgen` to `^0.3.0`.

## Step 9: Handle Code Breaking Changes

- `success()` and `error()` methods removed — use `resolve()` and `reject()` instead.
- `registerWebPlugin` removed — check the Capacitor 3 plugin upgrade guide if still using it.
- `platform` and `isNative` properties removed — use `getPlatform()` and `isNativePlatform()` methods.
- Android: `BridgeFragment` class removed. Create a custom version if the plugin used it.

## Step 10: Sync and Test

```bash
npm install
npx cap sync
```

Build the plugin's test/example app on both platforms to verify.

## Error Handling

* If the automated upgrade tool fails, apply the manual steps above for the failing parts.
* If Android build fails, run **Tools > AGP Upgrade Assistant** in Android Studio.
* If iOS build fails, verify the deployment target is set to 14.0 in both the podspec and Package.swift.
