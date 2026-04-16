# Build Optimization Strategies

## Code Splitting

Enable code splitting for optimal caching:

```typescript
await Bun.build({
  entrypoints: [
    './src/index.ts',
    './src/admin.ts', // Separate entry for admin panel
  ],
  outdir: './dist',
  target: 'browser',
  splitting: true, // Enable code splitting
  naming: {
    entry: '[dir]/[name].[ext]',
    chunk: 'chunks/[name]-[hash].[ext]',
    asset: 'assets/[name]-[hash].[ext]',
  },
});
```

## Tree Shaking

Tree shaking is automatic, but you can help:

```typescript
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  minify: true,

  // Remove debug code
  define: {
    'process.env.DEBUG': 'false',
    '__DEV__': 'false',
  },

  // Mark side-effect-free packages
  external: [],
});
```

Use named exports for better tree shaking:

```typescript
// ❌ Harder to tree shake
export default { foo, bar, baz };

// ✅ Tree shakeable
export { foo, bar, baz };
```

## Minification

### Basic Minification

```typescript
await Bun.build({
  minify: true,  // Simple boolean
});
```

### Granular Minification

```typescript
await Bun.build({
  minify: {
    whitespace: true,    // Remove whitespace
    identifiers: true,   // Shorten variable names
    syntax: true,        // Simplify syntax
  },
});
```

## Source Maps

```typescript
await Bun.build({
  sourcemap: 'external',  // Separate .map files
  // or
  sourcemap: 'inline',    // Inline in bundle
  // or
  sourcemap: 'none',      // No source maps
});
```

## Asset Loaders

```typescript
await Bun.build({
  loader: {
    '.png': 'file',     // Copy file, return path
    '.jpg': 'file',
    '.svg': 'dataurl',  // Inline as data URL
    '.css': 'css',      // Process as CSS
    '.txt': 'text',     // Inline as string
    '.json': 'json',    // Inline as JSON
  },

  // Public path for assets
  publicPath: '/static/',
});
```

## Bundle Analysis

Create `build-analyze.ts`:

```typescript
#!/usr/bin/env bun

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  splitting: true,
  sourcemap: 'external',
});

// Analyze bundle sizes
interface BundleAnalysis {
  total: number;
  byType: Record<string, { size: number; count: number }>;
  largest: Array<{ path: string; size: number }>;
}

const analysis: BundleAnalysis = {
  total: 0,
  byType: {},
  largest: [],
};

for (const output of result.outputs) {
  const size = output.size;
  const ext = output.path.split('.').pop() || 'unknown';

  analysis.total += size;

  if (!analysis.byType[ext]) {
    analysis.byType[ext] = { size: 0, count: 0 };
  }

  analysis.byType[ext].size += size;
  analysis.byType[ext].count++;

  analysis.largest.push({
    path: output.path,
    size: size,
  });
}

// Sort by size
analysis.largest.sort((a, b) => b.size - a.size);
analysis.largest = analysis.largest.slice(0, 10);

// Report
console.log('\n📊 Bundle Analysis\n');
console.log(`Total Size: ${(analysis.total / 1024).toFixed(2)} KB`);
console.log(`Files: ${result.outputs.length}\n`);

console.log('By Type:');
for (const [type, data] of Object.entries(analysis.byType)) {
  const sizeKB = (data.size / 1024).toFixed(2);
  console.log(`  ${type}: ${sizeKB} KB (${data.count} files)`);
}

console.log('\nLargest Files:');
for (const file of analysis.largest) {
  const sizeKB = (file.size / 1024).toFixed(2);
  const name = file.path.split('/').pop();
  console.log(`  ${name}: ${sizeKB} KB`);
}

// Check size limits
const MAX_BUNDLE_SIZE = 500 * 1024; // 500 KB
if (analysis.total > MAX_BUNDLE_SIZE) {
  console.warn('\n⚠️  Warning: Bundle exceeds 500 KB');
  process.exit(1);
}
```

## Environment-Specific Builds

```typescript
#!/usr/bin/env bun

const env = process.env.NODE_ENV || 'development';

const configs = {
  development: {
    minify: false,
    sourcemap: 'inline',
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.API_URL': '"http://localhost:3000"',
    },
  },
  staging: {
    minify: true,
    sourcemap: 'external',
    define: {
      'process.env.NODE_ENV': '"staging"',
      'process.env.API_URL': '"https://staging-api.example.com"',
    },
  },
  production: {
    minify: {
      whitespace: true,
      identifiers: true,
      syntax: true,
    },
    sourcemap: 'external',
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.API_URL': '"https://api.example.com"',
    },
  },
};

const config = configs[env as keyof typeof configs];

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  splitting: true,
  ...config,
});

if (!result.success) {
  console.error('❌ Build failed');
  process.exit(1);
}

console.log(`✅ ${env} build successful`);
```

Run with:
```bash
NODE_ENV=production bun run build-env.ts
```

## Performance Tips

1. **Use --hot for development**: Faster than full rebuilds
2. **Enable code splitting**: Better caching
3. **Externalize dependencies**: Don't bundle node_modules for backend
4. **Use proper loaders**: 'dataurl' for small files, 'file' for large
5. **Enable minification**: Only in production

## Watch Mode

```typescript
// build-watch.ts
import { watch } from 'fs';

async function build() {
  console.log('🔨 Building...');

  const result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'browser',
    minify: false,
    sourcemap: 'inline',
  });

  if (result.success) {
    console.log('✅ Build complete');
  } else {
    console.error('❌ Build failed');
  }
}

// Initial build
await build();

// Watch for changes
watch('./src', { recursive: true }, async (event, filename) => {
  if (filename?.endsWith('.ts') || filename?.endsWith('.tsx')) {
    console.log(`\n📝 ${filename} changed`);
    await build();
  }
});

console.log('\n👀 Watching for changes...');
```

## Bundle Size Limits

Enforce size limits:

```typescript
const MAX_SIZES = {
  total: 500 * 1024,     // 500 KB total
  chunk: 200 * 1024,     // 200 KB per chunk
};

for (const output of result.outputs) {
  if (output.size > MAX_SIZES.chunk) {
    console.error(`❌ Chunk too large: ${output.path}`);
    process.exit(1);
  }
}

const totalSize = result.outputs.reduce((sum, o) => sum + o.size, 0);
if (totalSize > MAX_SIZES.total) {
  console.error(`❌ Total bundle too large: ${totalSize} bytes`);
  process.exit(1);
}
```
