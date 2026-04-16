# Background Task

Capacitor plugin for running background tasks.

**Package:** `@capawesome/capacitor-background-task`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-background-task
npx cap sync
```

## Configuration

No configuration required for this plugin.

## Usage

```typescript
import { App } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';

App.addListener('appStateChange', async ({ isActive }) => {
  if (isActive) {
    return;
  }
  const taskId = await BackgroundTask.beforeExit(async () => {
    // Run your background code here...
    // Finish the background task when done.
    BackgroundTask.finish({ taskId });
  });
});
```

## Notes

- On iOS, the background task must finish in less than 30 seconds. Uses the UIKit framework under the hood.
- On Android, there is currently no ready implementation. Support is planned for the future.
- Always call `BackgroundTask.finish({ taskId })` when the background work is complete to allow the OS to put the app to sleep.
