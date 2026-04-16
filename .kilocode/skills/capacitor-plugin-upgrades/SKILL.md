---
name: capacitor-plugin-upgrades
description: "Guides the agent through upgrading a Capacitor plugin to a newer major version. Supports upgrades from Capacitor 4 through 8, including multi-version jumps. Covers automated upgrade via official migration tools, Android SDK targets, Gradle configuration, Java/Kotlin versions, iOS deployment targets, and manual step-by-step fallback for each version. Do not use for app project upgrade or non-Capacitor plugin frameworks."
---

# Capacitor Plugin Upgrade

Upgrade a Capacitor plugin to a newer major version (4→5, 5→6, 6→7, or 7→8).

## Prerequisites

| Target Version | Node.js |
| -------------- | ------- |
| 5              | 16+     |
| 6              | 18+     |
| 7              | 20+     |
| 8              | 22+     |

The project must be a Capacitor plugin (not an app project).

## Procedures

### Step 1: Detect Current Version

Read `@capacitor/core` version from `package.json` (`devDependencies` or `peerDependencies`). Determine the current major version.

Ask the user for the target version. Default to the latest (8) if not specified.

### Step 2: Execute Upgrade

For each major version jump between the current and target version, apply the corresponding upgrade guide **sequentially**:

| Current → Target | Reference                            |
| ---------------- | ------------------------------------ |
| 4 → 5            | `references/upgrade-v4-to-v5.md`   |
| 5 → 6            | `references/upgrade-v5-to-v6.md`   |
| 6 → 7            | `references/upgrade-v6-to-v7.md`   |
| 7 → 8            | `references/upgrade-v7-to-v8.md`   |

For multi-version jumps (e.g., 5 → 8), apply each upgrade in order:
1. Read and apply `references/upgrade-v5-to-v6.md`
2. Run `npm install && npx cap sync`, build, and verify the plugin's test/example app
3. Read and apply `references/upgrade-v6-to-v7.md`
4. Run `npm install && npx cap sync`, build, and verify the plugin's test/example app
5. Read and apply `references/upgrade-v7-to-v8.md`
6. Run `npm install && npx cap sync`, build, and verify the plugin's test/example app

Do **not** skip intermediate versions.

### Step 3: Final Verification

After completing all upgrade steps:

```bash
npm install
npx cap sync
```

Build the plugin's test/example app on both platforms to verify.

## Error Handling

* If automated upgrade tools fail, check the terminal output for which steps failed and apply those manually using the steps in the corresponding reference file.
* If Android build fails after upgrade, run **Tools > AGP Upgrade Assistant** in Android Studio.
* If iOS build fails, verify the deployment target matches the target version requirements in the reference file.
* If Gradle property syntax warnings appear (v8+), search all `.gradle` files for property assignments without `=` and update them.
* If a multi-version upgrade fails mid-way, fix the current version step before proceeding to the next.
