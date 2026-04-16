# libSQL

Capacitor plugin for libSQL databases. Supports local, remote, and embedded replica databases.

**Package:** `@capawesome/capacitor-libsql`

**Platforms:** Android, iOS

## Installation

```bash
npm install @capawesome/capacitor-libsql
npx cap sync
```

### Android

#### Variables

Optional variable in `android/app/variables.gradle`:

- `$libsqlVersion` version of `tech.turso.libsql:libsql` (default: `0.1.2`)

## Usage

### Connect to a Database

```typescript
import { Libsql } from '@capawesome/capacitor-libsql';

// Local database
const { connectionId } = await Libsql.connect({
  path: 'database.db',
});

// Remote database
const { connectionId } = await Libsql.connect({
  url: 'libsql://your-database-url.turso.io',
  authToken: 'your-auth-token',
});
```

### Query and Execute

```typescript
// SELECT query
const result = await Libsql.query({
  connectionId: 'my-connection-id',
  statement: 'SELECT * FROM my_table',
});
console.log(result.rows);

// INSERT/UPDATE/DELETE
await Libsql.execute({
  connectionId: 'my-connection-id',
  statement: 'INSERT INTO my_table (column1, column2) VALUES (?, ?)',
  values: ['value1', 'value2'],
});
```

### Transactions (Android only)

```typescript
const { transactionId } = await Libsql.beginTransaction({
  connectionId: 'my-connection-id',
});
try {
  await Libsql.execute({
    connectionId: 'my-connection-id',
    statement: 'UPDATE my_table SET column1 = ? WHERE column2 = ?',
    values: ['new_value', 'value2'],
    transactionId,
  });
  await Libsql.commitTransaction({
    connectionId: 'my-connection-id',
    transactionId,
  });
} catch (error) {
  await Libsql.rollbackTransaction({
    connectionId: 'my-connection-id',
    transactionId,
  });
}
```

### Sync

```typescript
await Libsql.sync({
  connectionId: 'my-connection-id',
});
```

## Key Methods

- `connect()`: Connect to a local file, remote URL, or in-memory database. Must be called first.
- `query()`: Execute a SELECT statement and return rows.
- `execute()`: Execute INSERT/UPDATE/DELETE/CREATE statements.
- `executeBatch()`: Execute multiple SQL statements in a single call.
- `beginTransaction()` / `commitTransaction()` / `rollbackTransaction()`: Transaction support (Android only).
- `sync()`: Synchronize the database with the remote server (Android and iOS).

## Notes

- If no `path` or `url` is provided to `connect()`, an in-memory database is created.
- Values bound to statements can be `string`, `number`, or `null`.
- Transaction IDs (`transactionId`) are only available on Android.
