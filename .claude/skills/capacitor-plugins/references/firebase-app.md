# Firebase App

Unofficial Capacitor plugin for Firebase App. Provides access to the Firebase app name and configuration options.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/app firebase
npx cap sync
```

## Configuration

### Android

Set `firebaseCommonVersion` in `variables.gradle` (default: `22.0.1`).

## Usage

```typescript
import { FirebaseApp } from '@capacitor-firebase/app';

const { name } = await FirebaseApp.getName();
const options = await FirebaseApp.getOptions();
```

## Notes

- Minimal utility plugin returning app name and Firebase project configuration.
