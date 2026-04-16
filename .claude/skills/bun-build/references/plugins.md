# Build Plugins and Custom Loaders

## Custom Plugin System

Bun supports custom plugins for transforming files during the build process.

### Plugin Interface

```typescript
import type { BunPlugin } from 'bun';

const myPlugin: BunPlugin = {
  name: 'my-plugin',
  setup(build) {
    // Plugin implementation
  },
};
```

## Example: Inline SVG Plugin

```typescript
import type { BunPlugin } from 'bun';

const inlineSvgPlugin: BunPlugin = {
  name: 'inline-svg',
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async (args) => {
      const text = await Bun.file(args.path).text();

      // Only inline small SVGs
      if (text.length < 10000) {
        return {
          contents: `export default ${JSON.stringify(text)}`,
          loader: 'js',
        };
      }

      return undefined; // Use default loader
    });
  },
};

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins: [inlineSvgPlugin],
});
```

## Example: Banner/Footer Plugin

```typescript
const bannerPlugin: BunPlugin = {
  name: 'banner',
  setup(build) {
    build.onLoad({ filter: /.*/ }, async (args) => {
      const contents = await Bun.file(args.path).text();
      const banner = `/* Built with Bun v${Bun.version} */\n`;

      return {
        contents: banner + contents,
        loader: 'js',
      };
    });
  },
};
```

## Example: Environment Variables Plugin

```typescript
const envPlugin: BunPlugin = {
  name: 'env-plugin',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      let contents = await Bun.file(args.path).text();

      // Replace process.env.VAR with actual values
      contents = contents.replace(
        /process\.env\.(\w+)/g,
        (_, key) => JSON.stringify(process.env[key] || '')
      );

      return {
        contents,
        loader: 'ts',
      };
    });
  },
};
```

## Example: CSS Modules Plugin

```typescript
const cssModulesPlugin: BunPlugin = {
  name: 'css-modules',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
      const css = await Bun.file(args.path).text();

      // Simple CSS modules implementation
      const classNames: Record<string, string> = {};
      const transformed = css.replace(
        /\.([a-zA-Z0-9_-]+)/g,
        (_, className) => {
          const hashed = `${className}_${hash(args.path)}`;
          classNames[className] = hashed;
          return `.${hashed}`;
        }
      );

      return {
        contents: `
          export default ${JSON.stringify(classNames)};
          const style = document.createElement('style');
          style.textContent = ${JSON.stringify(transformed)};
          document.head.appendChild(style);
        `,
        loader: 'js',
      };
    });
  },
};

function hash(str: string): string {
  return Bun.hash(str).toString(36).slice(0, 6);
}
```

## Example: Image Optimization Plugin

```typescript
const imageOptimizePlugin: BunPlugin = {
  name: 'image-optimize',
  setup(build) {
    build.onLoad({ filter: /\.(png|jpg|jpeg)$/ }, async (args) => {
      // Use sharp or other image library to optimize
      const buffer = await Bun.file(args.path).arrayBuffer();

      // Placeholder: In real implementation, optimize image
      const optimized = buffer;

      // Write optimized file
      const outputPath = args.path.replace(/src/, 'dist');
      await Bun.write(outputPath, optimized);

      return {
        contents: `export default ${JSON.stringify(outputPath)}`,
        loader: 'js',
      };
    });
  },
};
```

## Example: TypeScript Path Alias Plugin

```typescript
const pathAliasPlugin: BunPlugin = {
  name: 'path-alias',
  setup(build) {
    const aliases = {
      '@/': './src/',
      '@components/': './src/components/',
      '@utils/': './src/utils/',
    };

    build.onResolve({ filter: /^@\// }, (args) => {
      for (const [alias, path] of Object.entries(aliases)) {
        if (args.path.startsWith(alias)) {
          return {
            path: args.path.replace(alias, path),
          };
        }
      }
    });
  },
};
```

## Example: Markdown Plugin

```typescript
const markdownPlugin: BunPlugin = {
  name: 'markdown',
  setup(build) {
    build.onLoad({ filter: /\.md$/ }, async (args) => {
      const markdown = await Bun.file(args.path).text();

      // Use markdown parser (simplified)
      const html = markdownToHtml(markdown);

      return {
        contents: `export default ${JSON.stringify(html)}`,
        loader: 'js',
      };
    });
  },
};

function markdownToHtml(md: string): string {
  // Simplified - use marked or similar in production
  return md.replace(/^# (.+)$/gm, '<h1>$1</h1>');
}
```

## Example: JSON Import with Validation

```typescript
import { z } from 'zod';

const jsonSchemaPlugin: BunPlugin = {
  name: 'json-schema',
  setup(build) {
    build.onLoad({ filter: /\.json$/ }, async (args) => {
      const json = await Bun.file(args.path).json();

      // Define schema for validation
      const schema = z.object({
        name: z.string(),
        version: z.string(),
      });

      // Validate
      try {
        schema.parse(json);
      } catch (error) {
        throw new Error(`Invalid JSON in ${args.path}: ${error}`);
      }

      return {
        contents: `export default ${JSON.stringify(json)}`,
        loader: 'js',
      };
    });
  },
};
```

## Using Multiple Plugins

```typescript
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins: [
    inlineSvgPlugin,
    cssModulesPlugin,
    pathAliasPlugin,
    markdownPlugin,
  ],
});
```

## Plugin Execution Order

Plugins execute in the order they're defined:

```typescript
plugins: [
  plugin1,  // Runs first
  plugin2,  // Runs second
  plugin3,  // Runs third
]
```

## Error Handling in Plugins

```typescript
const safePlugin: BunPlugin = {
  name: 'safe-plugin',
  setup(build) {
    build.onLoad({ filter: /\.custom$/ }, async (args) => {
      try {
        const contents = await Bun.file(args.path).text();
        return {
          contents: transform(contents),
          loader: 'js',
        };
      } catch (error) {
        console.error(`Error processing ${args.path}:`, error);
        throw error; // Re-throw to fail build
      }
    });
  },
};
```

## Plugin Best Practices

1. **Name your plugins**: Always set a descriptive `name`
2. **Handle errors gracefully**: Catch and report errors clearly
3. **Use specific filters**: Don't match more files than necessary
4. **Cache when possible**: Avoid redundant work
5. **Document dependencies**: List any required packages

## Testing Plugins

```typescript
// test-plugin.ts
import { test, expect } from 'bun:test';

test('inline SVG plugin', async () => {
  const result = await Bun.build({
    entrypoints: ['./test/fixtures/app.ts'],
    plugins: [inlineSvgPlugin],
  });

  expect(result.success).toBe(true);
  // Additional assertions
});
```
