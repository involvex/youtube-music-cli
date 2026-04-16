# Bun Compatibility Matrix

This document tracks known compatibility issues and recommended alternatives for common Node.js packages when migrating to Bun.

## Native Modules

### ❌ Incompatible or Problematic

| Package | Issue | Alternative | Notes |
|---------|-------|-------------|-------|
| `bcrypt` | Native binding issues | `bcryptjs`, `@node-rs/bcrypt` | bcryptjs is pure JS (slower), @node-rs/bcrypt uses Rust |
| `node-canvas` | Cairo dependencies | `skia-canvas`, Server-side rendering alternatives | Limited Bun support |
| `node-gyp` | Build tooling | Find pure JS alternatives | Any package requiring node-gyp may have issues |
| `fsevents` | macOS-specific native | Usually optional | Often works as optional dependency |
| `sqlite3` | Native bindings | `bun:sqlite` (built-in) | Bun has native SQLite support |
| `better-sqlite3` | Native bindings | `bun:sqlite` | Use Bun's built-in SQLite |
| `node-sass` | LibSass deprecated | `sass` (Dart Sass) | Dart Sass works with Bun |
| `grpc` | Native bindings | `@grpc/grpc-js` | Pure JavaScript gRPC implementation |

### ✅ Compatible with Caveats

| Package | Status | Notes |
|---------|--------|-------|
| `sharp` | ✅ Works | May need specific version, test thoroughly |
| `puppeteer` | ✅ Works | Use with `bunx` or install Chromium separately |
| `playwright` | ✅ Works | Browser automation works well |
| `prisma` | ✅ Works | ORM works, may need `bunx prisma generate` |
| `esbuild` | ⚠️ May be redundant | Bun has built-in bundler |

## Test Frameworks

| Package | Status | Migration Path |
|---------|--------|----------------|
| `jest` | ⚠️ Replace | Use `bun:test` (Jest-compatible API) |
| `vitest` | ⚠️ Replace | Use `bun:test` |
| `mocha` | ⚠️ Replace | Use `bun:test` with describe/it API |
| `ava` | ⚠️ Replace | Use `bun:test` |
| `tap` | ⚠️ Replace | Use `bun:test` |

**Migration example:**
```typescript
// Before (Jest)
import { describe, it, expect } from '@jest/globals';

// After (Bun)
import { describe, it, expect } from 'bun:test';
```

## Build Tools

| Package | Status | Alternative |
|---------|--------|-------------|
| `webpack` | ⚠️ May not need | `Bun.build()` |
| `rollup` | ⚠️ May not need | `Bun.build()` |
| `esbuild` | ⚠️ May not need | `Bun.build()` |
| `parcel` | ⚠️ May not need | `Bun.build()` |
| `vite` | ✅ Works | But consider `Bun.build()` for simpler setups |
| `tsup` | ⚠️ May not need | `Bun.build()` |

## TypeScript Tooling

| Package | Status | Notes |
|---------|--------|-------|
| `ts-node` | ⚠️ Not needed | Bun runs TypeScript natively |
| `tsx` | ⚠️ Not needed | Bun runs TypeScript natively |
| `ts-node-dev` | ⚠️ Not needed | Use `bun --hot` |
| `nodemon` | ⚠️ Not needed | Use `bun --watch` or `bun --hot` |
| `typescript` | ✅ Keep | Still needed for type checking |
| `@types/*` | ✅ Keep | Type definitions still useful |

## Development Tools

| Package | Status | Alternative |
|---------|--------|-------------|
| `dotenv` | ⚠️ Not needed | Bun loads .env automatically |
| `cross-env` | ⚠️ Not needed | Bun handles env vars cross-platform |
| `concurrently` | ✅ Works | Or use Bun scripts |
| `npm-run-all` | ⚠️ May not need | Use Bun scripts or shell |

## Web Frameworks

| Package | Status | Notes |
|---------|--------|-------|
| `express` | ✅ Works | Fully compatible |
| `fastify` | ✅ Works | Performance benefits with Bun |
| `hono` | ✅ Recommended | Designed for edge runtimes, works great with Bun |
| `koa` | ✅ Works | Compatible |
| `next.js` | ⚠️ Experimental | Bun support is experimental |
| `nest.js` | ✅ Works | Compatible, may need configuration |
| `remix` | ⚠️ Experimental | Check latest compatibility |

## Database Clients

| Package | Status | Notes |
|---------|--------|-------|
| `pg` (PostgreSQL) | ✅ Works | Pure JS client works well |
| `mysql2` | ✅ Works | Compatible |
| `mongodb` | ✅ Works | Native driver works |
| `redis` | ✅ Works | ioredis and node-redis both work |
| `prisma` | ✅ Works | ORM works, run `bunx prisma generate` |
| `drizzle-orm` | ✅ Works | Excellent Bun support |
| `typeorm` | ✅ Works | Compatible |
| `sequelize` | ✅ Works | Compatible |
| `knex` | ✅ Works | Query builder works |

## Utility Libraries

| Package | Status | Notes |
|---------|--------|-------|
| `lodash` | ✅ Works | Fully compatible |
| `axios` | ✅ Works | But consider native `fetch` API |
| `node-fetch` | ⚠️ Not needed | Bun has native `fetch` |
| `got` | ✅ Works | HTTP client works |
| `date-fns` | ✅ Works | Fully compatible |
| `dayjs` | ✅ Works | Fully compatible |
| `uuid` | ✅ Works | Works, or use `crypto.randomUUID()` |
| `nanoid` | ✅ Works | Fully compatible |
| `zod` | ✅ Works | Schema validation works perfectly |
| `joi` | ✅ Works | Compatible |
| `yup` | ✅ Works | Compatible |

## Frontend Libraries

| Package | Status | Notes |
|---------|--------|-------|
| `react` | ✅ Works | Full support with JSX transform |
| `react-dom` | ✅ Works | Compatible |
| `vue` | ✅ Works | Compatible |
| `svelte` | ✅ Works | Compatible |
| `preact` | ✅ Works | Excellent support |
| `solid-js` | ✅ Works | Compatible |

## Package Managers

| Tool | Status | Notes |
|------|--------|-------|
| `npm` | ⚠️ Replace | Use `bun install` |
| `yarn` | ⚠️ Replace | Use `bun install` |
| `pnpm` | ⚠️ Replace | Use `bun install` |

## Version-Specific Issues

### Bun 1.0.x

- Native modules may require specific versions
- Some packages with C++ bindings need testing
- Binary packages may need platform-specific builds

### Known Good Versions

Track working versions of problematic packages:

```json
{
  "dependencies": {
    "sharp": "^0.32.0",
    "@node-rs/bcrypt": "^1.9.0"
  }
}
```

## Testing Compatibility

When encountering unknown packages, test with:

```bash
# Install and test
bun add <package-name>
bun run --eval "import pkg from '<package-name>'; console.log(pkg)"

# Run package's own tests if available
bun test
```

## Reporting Issues

If you find incompatible packages:

1. Check [Bun's GitHub issues](https://github.com/oven-sh/bun/issues)
2. Test with latest Bun version
3. Report with minimal reproduction
4. Include package version and Bun version

## Resources

- [Bun Compatibility Tracker](https://github.com/oven-sh/bun/issues?q=is%3Aissue+label%3Acompat)
- [Bun Runtime APIs](https://bun.sh/docs/runtime)
- [Bun Discord Community](https://bun.sh/discord)
