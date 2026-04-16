# Firebase Firestore

Unofficial Capacitor plugin for Firebase Cloud Firestore. CRUD, queries, batch writes, real-time listeners.

**Platforms:** Android, iOS, Web

## Prerequisites

Complete the [Firebase SDK Setup](firebase-sdk-setup.md) for each target platform before proceeding.

## Installation

```bash
npm install @capacitor-firebase/firestore
npx cap sync
```

## Configuration

### Android

Set `firebaseFirestoreVersion` in `variables.gradle` (default: `26.0.2`).

## Usage

```typescript
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

await FirebaseFirestore.addDocument({
  reference: 'users',
  data: { first: 'Alan', last: 'Turing', born: 1912 },
});

const { snapshot } = await FirebaseFirestore.getDocument({
  reference: 'users/Aorq09lkt1ynbR7xhTUx',
});

const { snapshots } = await FirebaseFirestore.getCollection({
  reference: 'users',
  compositeFilter: {
    type: 'and',
    queryConstraints: [
      { type: 'where', fieldPath: 'born', opStr: '==', value: 1912 },
    ],
  },
  queryConstraints: [
    { type: 'orderBy', fieldPath: 'born', directionStr: 'desc' },
    { type: 'limit', limit: 10 },
  ],
});
```

## Notes

- Does NOT require `firebase` as a peer dependency.
- Snapshot listeners use callback pattern with `callbackId` for removal.
- `writeBatch()` supports `set`, `update`, `delete` atomically.
- `Timestamp` and `FieldValue` data types not yet supported (use `number` or `string`).
- `useEmulator()` default port is 8080. For Android Emulator use host `10.0.2.2`.
