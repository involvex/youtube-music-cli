---
name: capacitor-plugin-spm-support
description: "Guides the agent through adding Swift Package Manager (SPM) support to an existing Capacitor plugin. Covers creating a Package.swift manifest, replacing Objective-C bridge files with the CAPBridgedPlugin Swift protocol, updating .gitignore for SPM artifacts, cleaning up the Xcode project file, and updating package.json. Do not use for Capacitor app projects, creating new plugins from scratch, or non-Capacitor plugin frameworks."
---

# Add SPM Support to a Capacitor Plugin

Add Swift Package Manager (SPM) support to an existing Capacitor plugin by replacing the Objective-C bridge with the `CAPBridgedPlugin` Swift protocol and adding a `Package.swift` manifest.

## Prerequisites

| Requirement       | Version |
| ----------------- | ------- |
| Capacitor         | 6+      |
| Swift             | 5.9+    |
| Xcode             | 15+     |

The project must be a Capacitor **plugin** (not an app project). The plugin must have an existing iOS implementation with Swift source files in `ios/Plugin/`.

## Procedures

### Step 1: Gather Plugin Information

1. Read `package.json` in the plugin root. Extract:
   - The **plugin package name** (e.g., `@capawesome/capacitor-app-review`).
   - The existing `files` array entries.
   - The existing `scripts` entries.
2. Read the `.podspec` file in the plugin root. Extract:
   - The **pod name** (the `Pod::Spec.new` argument, e.g., `CapawesomeCapacitorAppReview`). This becomes the **SPM package name**.
   - The **iOS deployment target** from `s.ios.deployment_target` (e.g., `'13.0'`). Extract the major version number (e.g., `13`). This becomes the **SPM iOS version**.
   - All **third-party CocoaPods dependencies** — any `s.dependency` or `spec.dependency` entries that are **not** `Capacitor` or `CapacitorCordova`. Record each dependency name and version constraint.
3. Identify the **plugin Swift file** in `ios/Plugin/`. It contains a class extending `CAPPlugin` with `@objc(<PluginClassName>)`. Extract:
   - The **plugin class name** (e.g., `AppReviewPlugin`).
   - The **JavaScript name** from the Objective-C `.m` file's `CAP_PLUGIN` macro first string argument (e.g., `AppReview`).
   - All **plugin methods** from `CAP_PLUGIN_METHOD` macro calls in the `.m` file, noting each method's name and return type (e.g., `CAPPluginReturnPromise`).
4. Identify the **Objective-C bridge files** in `ios/Plugin/`:
   - `<PluginClassName>.h` (header file)
   - `<PluginClassName>.m` (implementation file with `CAP_PLUGIN` macro)
5. Read the Capacitor peer dependency version from `package.json` (`peerDependencies["@capacitor/core"]`). Determine the major version (e.g., `6`). This is the **Capacitor major version**.

### Step 2: Resolve CocoaPods Dependencies for SPM

Skip this step if no third-party CocoaPods dependencies were found in Step 1.

For each third-party CocoaPods dependency, an equivalent SPM-compatible package is needed. Present the list of dependencies to the user and ask whether they can provide the SPM package URLs themselves, or whether the agent should search the web for SPM equivalents.

**If the user provides SPM package URLs:** Record them and proceed to Step 3.

**If the user requests a web search:** For each CocoaPods dependency:

1. Search the web for `"<dependency_name>" Swift Package Manager` to determine whether the original CocoaPods dependency also supports SPM. Many popular libraries (e.g., Firebase, Alamofire) distribute via both CocoaPods and SPM from the same repository.
2. If the original library supports SPM, use its Git repository URL. Use the **same version** as specified in the podspec — convert the CocoaPods version constraint to the SPM equivalent (e.g., `~> 5.0` becomes `.upToNextMajor(from: "5.0.0")`, `= 2.1.0` becomes `.exact("2.1.0")`).
3. If the original library does **not** support SPM, search for `"<dependency_name>" SPM alternative` to find a replacement package that provides equivalent functionality via SPM. Use a version that is compatible with the version used in the podspec.
4. If no SPM-compatible alternative exists, inform the user and ask how to proceed.

Record the resolved SPM package URL, version requirement, and product name(s) for each dependency. These will be added to `Package.swift` in the next step.

### Step 3: Create `Package.swift`

Create `Package.swift` in the plugin root directory with the following content:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "<SPM_PACKAGE_NAME>",
    platforms: [.iOS(.v<SPM_IOS_VERSION>)],
    products: [
        .library(
            name: "<SPM_PACKAGE_NAME>",
            targets: ["<PLUGIN_CLASS_NAME>"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "<CAPACITOR_MAJOR_VERSION>.0.0")
        // <ADDITIONAL_PACKAGE_DEPENDENCIES>
    ],
    targets: [
        .target(
            name: "<PLUGIN_CLASS_NAME>",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
                // <ADDITIONAL_TARGET_DEPENDENCIES>
            ],
            path: "ios/Plugin"),
        .testTarget(
            name: "<PLUGIN_CLASS_NAME>Tests",
            dependencies: ["<PLUGIN_CLASS_NAME>"],
            path: "ios/PluginTests")
    ]
)
```

Replace all placeholders:
- `<SPM_IOS_VERSION>` — the SPM iOS version from Step 1 (e.g., `13`).
- `<SPM_PACKAGE_NAME>` — the pod name from Step 1 (e.g., `CapawesomeCapacitorAppReview`).
- `<PLUGIN_CLASS_NAME>` — the plugin class name from Step 1 (e.g., `AppReviewPlugin`).
- `<CAPACITOR_MAJOR_VERSION>` — the Capacitor major version from Step 1 (e.g., `6`).
- `<ADDITIONAL_PACKAGE_DEPENDENCIES>` — if third-party dependencies were resolved in Step 2, add a `.package(url: "<repo_url>", <version_requirement>)` entry for each. Remove the comment line if no extra dependencies exist.
- `<ADDITIONAL_TARGET_DEPENDENCIES>` — for each package dependency added above, add a corresponding `.product(name: "<ProductName>", package: "<package-name>")` entry. Remove the comment line if no extra dependencies exist.

### Step 4: Update the Swift Plugin Class

Open the plugin Swift file (e.g., `ios/Plugin/<PluginClassName>.swift`).

1. Add `CAPBridgedPlugin` protocol conformance to the class declaration.
2. Add the three required properties as the **first** properties in the class body, before any existing properties.

Apply this diff pattern:

```diff
 @objc(<PluginClassName>)
-public class <PluginClassName>: CAPPlugin {
+public class <PluginClassName>: CAPPlugin, CAPBridgedPlugin {
+    public let identifier = "<PluginClassName>"
+    public let jsName = "<JS_NAME>"
+    public let pluginMethods: [CAPPluginMethod] = [
+        CAPPluginMethod(name: "<method1>", returnType: CAPPluginReturnPromise),
+        CAPPluginMethod(name: "<method2>", returnType: CAPPluginReturnPromise)
+    ]
```

Replace:
- `<PluginClassName>` — the plugin class name (e.g., `AppReviewPlugin`).
- `<JS_NAME>` — the JavaScript name from the `.m` file's `CAP_PLUGIN` macro (e.g., `AppReview`).
- The `pluginMethods` array — list **all** methods from the `.m` file's `CAP_PLUGIN_METHOD` calls, preserving each method's name and return type exactly.

### Step 5: Delete Objective-C Bridge Files

Delete the following files from `ios/Plugin/`:
- `<PluginClassName>.h`
- `<PluginClassName>.m`

These are no longer needed because the plugin registration is now handled by the `CAPBridgedPlugin` protocol in Swift.

### Step 6: Clean Up the Xcode Project File

Open `ios/Plugin.xcodeproj/project.pbxproj` and remove **all** references to the deleted Objective-C files. Specifically, remove lines referencing:
- `<PluginClassName>.h` — file references, build phase entries (`PBXBuildFile`, `PBXFileReference`, `PBXGroup` children, `PBXHeadersBuildPhase`)
- `<PluginClassName>.m` — file references, build phase entries (`PBXBuildFile`, `PBXFileReference`, `PBXGroup` children, `PBXSourcesBuildPhase`)

Search for both filenames in the `.pbxproj` file and remove every line that references them.

### Step 7: Update `.gitignore`

Open `.gitignore` in the plugin root. Add the following entries if not already present:

```diff
 # iOS files
+Package.resolved
+/.build
+/Packages
+.swiftpm/configuration/registries.json
+.swiftpm/xcode/package.xcworkspace/contents.xcworkspacedata
+.netrc
```

Place these entries in the iOS section of the `.gitignore` file, after any existing iOS-related entries (e.g., `Pods`, `Podfile.lock`).

### Step 8: Update `package.json`

Apply two changes to `package.json`:

1. Add `"Package.swift"` to the `files` array:

```diff
     "ios/Plugin/",
-    "<PodName>.podspec"
+    "<PodName>.podspec",
+    "Package.swift"
   ],
```

2. Add the `ios:spm:install` script to the `scripts` object:

```diff
     "ios:pod:install": "cd ios && pod install --repo-update && cd ..",
+    "ios:spm:install": "cd ios && swift package resolve && cd ..",
```

If the `ios:pod:install` script does not exist, add the `ios:spm:install` script after the last existing script entry.

### Step 9: Verify

1. Run `npm install` in the plugin root to ensure `package.json` is valid.
2. Verify the iOS build still succeeds by building the plugin's example or test app.

## Error Handling

- If the `.pbxproj` file becomes corrupted after removing ObjC references, restore it from version control and carefully re-edit, ensuring only complete lines are removed.
- If the Swift build fails with `CAPBridgedPlugin` not found, verify that `@capacitor/core` is version 6+ and that `capacitor-swift-pm` branch matches the Capacitor major version.
- If SPM resolution fails (`swift package resolve`), verify the `Package.swift` target paths match the actual directory structure (`ios/Plugin` for sources, `ios/PluginTests` for tests).
- If the plugin has no test target directory (`ios/PluginTests`), remove the `.testTarget` block from `Package.swift`.
- If the plugin has additional Swift source files beyond the main plugin file, no extra changes are needed — SPM automatically includes all `.swift` files in the target path.
- If the `.m` file uses `CAPPluginReturnNone` instead of `CAPPluginReturnPromise` for some methods, preserve the original return type in the `pluginMethods` array.
- If a CocoaPods dependency has no SPM equivalent and no alternative can be found, the plugin cannot fully support SPM. Inform the user and suggest they either vendor the dependency source or wait for upstream SPM support.
