# SQLite

Access SQLite databases with support for encryption, transactions, schema migrations, and ORM integration.

**Package:** `@capawesome-team/capacitor-sqlite`
**Platforms:** Android, iOS, Web, Electron
**Capawesome Insiders:** Yes (requires license key)

## Installation

Set up the Capawesome npm registry:

```bash
npm config set @capawesome-team:registry https://npm.registry.capawesome.io
npm config set //npm.registry.capawesome.io/:_authToken <YOUR_LICENSE_KEY>
```

Install the package:

```bash
npm install @capawesome-team/capacitor-sqlite @sqlite.org/sqlite-wasm
npx cap sync
```

## Configuration

### Android

#### Encryption

To use encryption, set `capawesomeCapacitorSqliteIncludeSqlcipher` to `true` in `android/app/variables.gradle`:

```groovy
ext {
  capawesomeCapacitorSqliteIncludeSqlcipher = true
}
```

#### Bundled SQLite

To bundle a newer SQLite version, set `capawesomeCapacitorSqliteIncludeRequery` to `true` in `android/app/variables.gradle`:

```groovy
ext {
  capawesomeCapacitorSqliteIncludeRequery = true
}
```

Also add the JitPack repository to `android/app/build.gradle`:

```groovy
repositories {
    google()
    mavenCentral()
    maven { url 'https://jitpack.io' }
}
```

Note: `capawesomeCapacitorSqliteIncludeRequery` and `capawesomeCapacitorSqliteIncludeSqlcipher` cannot be used together.

#### Proguard

If using Proguard, add to `android/app/proguard-rules.pro`:

```
-keep class io.capawesome.capacitorjs.plugins.** { *; }
```

### iOS

#### Encryption

For encryption with CocoaPods, add to `ios/App/Podfile` under the `target 'App'` section:

```ruby
pod 'CapawesomeTeamCapacitorSqlite/SQLCipher', :path => '../../node_modules/@capawesome-team/capacitor-sqlite'
```

If NOT using encryption, add the Plain pod instead:

```ruby
pod 'CapawesomeTeamCapacitorSqlite/Plain', :path => '../../node_modules/@capawesome-team/capacitor-sqlite'
```

Both must be placed under `# Add your Pods here`, not in the `def capacitor_pods` section. Encryption is only supported with CocoaPods, not SPM.

### Web

For Vite, add to `vite.config.ts`:

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
```

The web platform requires COOP/COEP headers for OPFS support.

## Usage

### Open a database with migrations

```typescript
import { Sqlite } from '@capawesome-team/capacitor-sqlite';

const { databaseId } = await Sqlite.open({
  path: 'mydb.sqlite3',
  encryptionKey: 'secret',
  upgradeStatements: [
    {
      version: 1,
      statements: [
        'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, age INTEGER)',
      ],
    },
    {
      version: 2,
      statements: ['ALTER TABLE users ADD COLUMN email TEXT'],
    },
  ],
  version: 2,
});
```

### Execute and query

```typescript
import { Sqlite } from '@capawesome-team/capacitor-sqlite';

await Sqlite.execute({
  databaseId,
  statement: 'INSERT INTO users (name, age) VALUES (?, ?)',
  values: ['Alice', 30],
});

const result = await Sqlite.query({
  databaseId,
  statement: 'SELECT * FROM users WHERE age > ?',
  values: [25],
});
console.log(result.columns);
console.log(result.rows);
```

### Transactions

```typescript
import { Sqlite } from '@capawesome-team/capacitor-sqlite';

await Sqlite.beginTransaction({ databaseId });
await Sqlite.execute({ databaseId, statement: 'INSERT INTO users (name, age) VALUES (?, ?)', values: ['Alice', 30] });
await Sqlite.execute({ databaseId, statement: 'INSERT INTO users (name, age) VALUES (?, ?)', values: ['Bob', 25] });
await Sqlite.commitTransaction({ databaseId });
```

## Notes

- Supports ORM integration with Drizzle (`@capawesome/capacitor-sqlite-drizzle`), Kysely (`@capawesome/capacitor-sqlite-kysely`), and TypeORM.
- Includes a built-in key-value store via `SqliteKeyValueStore` class.
- Supported data types: `NULL`, `INTEGER`, `REAL`, `TEXT`, `BLOB` (BLOBs not supported on Web).
- On Web, `initialize()` must be called with a Worker before use.
- Encryption on iOS requires CocoaPods (not SPM). Encryption is not supported on Electron or Web.
- Electron support requires Node.js 22.5.0+ (Electron 33+).
