# SQLite

Capacitor plugin for native SQLite databases with optional encryption via SQLCipher.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor-community/sqlite
npx cap sync
```

For **Web** support, also install:

```bash
npm install jeep-sqlite sql.js
```

Then copy `node_modules/sql.js/dist/sql-wasm.wasm` to your app's assets folder:
- **Angular:** `src/assets/`
- **Vue/React:** `public/assets/`

## Configuration

Add plugin configuration to `capacitor.config.ts`:

```typescript
plugins: {
  CapacitorSQLite: {
    iosDatabaseLocation: 'Library/CapacitorDatabase',
    iosIsEncryption: true,
    iosKeychainPrefix: 'your-app-prefix',
    iosBiometric: {
      biometricAuth: false,
      biometricTitle: 'Biometric login for capacitor sqlite',
    },
    androidIsEncryption: true,
    androidBiometric: {
      biometricAuth: false,
      biometricTitle: 'Biometric login for capacitor sqlite',
      biometricSubTitle: 'Log in using your biometric',
    },
  },
}
```

### Android

In `android/variables.gradle`, ensure:

```groovy
minSdkVersion = 23
compileSdkVersion = 35
targetSdkVersion = 35
```

In `android/app/src/main/AndroidManifest.xml`, set on the `<application>` element:

```xml
<application
  android:allowBackup="false"
  android:fullBackupContent="false"
  android:dataExtractionRules="@xml/data_extraction_rules"
```

Create `android/app/src/main/res/xml/data_extraction_rules.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
      <exclude domain="root" />
      <exclude domain="database" />
      <exclude domain="sharedpref" />
      <exclude domain="external" />
    </cloud-backup>
    <device-transfer>
      <exclude domain="root" />
      <exclude domain="database" />
      <exclude domain="sharedpref" />
      <exclude domain="external" />
    </device-transfer>
</data-extraction-rules>
```

If you encounter `x files found with path 'build-data.properties'`, add to `android/app/build.gradle`:

```groovy
packagingOptions {
    exclude 'build-data.properties'
}
```

### iOS

No additional steps required.

## Usage

```typescript
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

// Create and open a connection
const db: SQLiteDBConnection = await sqlite.createConnection('mydb', false, 'no-encryption', 1, false);
await db.open();

// Execute SQL
await db.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');

// Run a parameterized statement
await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);

// Query
const result = await db.query('SELECT * FROM users');
console.log(result.values);

// Close connection
await db.close();
await sqlite.closeConnection('mydb');
```

## Notes

- Uses SQLCipher for encryption on native platforms (even for unencrypted databases). This is subject to encryption export regulations.
- Web support is backed by `jeep-sqlite` (using `sql.js` and IndexedDB). Encrypted databases are not supported on Web.
- Supports database import/export via JSON, upgrade statements, and biometric authentication.
- Supports both read-write and read-only connections (read-only not available on Web).
- Supports transactions via `beginTransaction()`, `commitTransaction()`, and `rollbackTransaction()`.
