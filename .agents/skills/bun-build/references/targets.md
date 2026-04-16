# Build Targets and Configurations

Complete configurations for different build targets using Bun's native bundler.

## Browser/Frontend Build

```typescript
// build-browser.ts
await Bun.build({
  entrypoints: ['./src/index.tsx'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true,
  },
  splitting: true,
  sourcemap: 'external',
  external: [], // Bundle everything
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.API_URL': '"https://api.example.com"',
  },
  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.svg': 'file',
    '.css': 'css',
  },
});
```

## Node.js Backend Build

```typescript
// build-node.ts
await Bun.build({
  entrypoints: ['./src/server.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  minify: true,
  sourcemap: 'inline',
  external: ['*'], // Don't bundle node_modules
  // Or be explicit:
  // external: ['express', 'mongodb', 'redis'],
});
```

## Library Build (Dual Format)

```typescript
// build-library.ts

// ESM build
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist/esm',
  target: 'node',
  format: 'esm',
  minify: true,
  sourcemap: 'external',
  external: ['*'],
});

// CommonJS build
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist/cjs',
  target: 'node',
  format: 'cjs',
  minify: true,
  sourcemap: 'external',
  external: ['*'],
});

console.log('✅ Built ESM and CJS formats');
```

Update `package.json`:

```json
{
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/esm/index.d.ts"
    }
  },
  "files": ["dist"]
}
```

## CLI Tool Build

```typescript
// build-cli.ts
await Bun.build({
  entrypoints: ['./src/cli.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: true,
  // Bundle everything for single-file distribution
  external: [],
});

// Make executable
import { chmod } from 'fs/promises';
await chmod('./dist/cli.js', 0o755);

console.log('✅ CLI built and made executable');
```

Update `package.json`:

```json
{
  "bin": {
    "your-cli-name": "./dist/cli.js"
  }
}
```

## Cloudflare Workers

```typescript
// build-worker.ts
await Bun.build({
  entrypoints: ['./src/worker.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  minify: true,
  external: [],
});
```

## Bun Runtime Target

```typescript
// build-bun.ts
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  minify: true,
  // Can use Bun-specific features
});
```

## Target Comparison

| Target | Use Case | Node APIs | Browser APIs | Bun APIs |
|--------|----------|-----------|--------------|----------|
| `browser` | Frontend apps | ❌ | ✅ | ❌ |
| `node` | Backend apps | ✅ | ❌ | ❌ |
| `bun` | Bun-specific apps | ✅ | ❌ | ✅ |

## Format Options

### ESM (Recommended)

```typescript
{
  format: 'esm',  // Modern, tree-shakeable
}
```

Output:
```javascript
export default function() {}
export { foo, bar };
```

### CommonJS

```typescript
{
  format: 'cjs',  // Legacy Node.js
}
```

Output:
```javascript
module.exports = function() {}
exports.foo = foo;
```

### IIFE (Browser Scripts)

```typescript
{
  format: 'iife',  // Self-contained browser script
}
```

Output:
```javascript
(function() {
  // Your code
})();
```
