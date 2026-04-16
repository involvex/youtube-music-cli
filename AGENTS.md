# AGENTS.md - Agentic Coding Guidelines

This file provides guidance for AI agents operating in this repository.

## Project Overview

**@involvex/youtube-music-cli** is a Terminal UI (TUI) music player for YouTube Music, built with React and TypeScript using Ink for terminal rendering. It features search, playback controls, queue management, and multiple UI themes.

## Build Commands

### Development

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `bun run dev`       | Start in watch mode (TypeScript compilation)   |
| `bun run dev:watch` | Watch mode with auto-restart                   |
| `bun run build`     | Compile TypeScript to `dist/`                  |
| `bun run start`     | Run compiled CLI binary (`dist/source/cli.js`) |
| `bun run clean`     | Remove `dist/` directory                       |

### Code Quality

| Command                | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `bun run format`       | Format code with Prettier                             |
| `bun run format:check` | Check formatting without modifying                    |
| `bun run lint`         | Lint code with ESLint                                 |
| `bun run lint:fix`     | Fix linting issues automatically                      |
| `bun run typecheck`    | Type check without emitting                           |
| `bun run prebuild`     | Run format → lint:fix → typecheck (used before build) |

### Testing

| Command                                             | Description                             |
| --------------------------------------------------- | --------------------------------------- |
| `bun run test`                                      | Run full test suite (build + AVA tests) |
| `bunx ava tests/<file>.test.js`                     | Run specific test file                  |
| `bunx ava tests/<file>.test.js --match "test name"` | Run single test by name                 |

Example - run single test:

```bash
bunx ava tests/player-service-mpv-args.test.js --match "gapless playback"
```

## Code Style Guidelines

### General Principles

- **ESM Modules**: Project uses `"type": "module"` - all imports use ES syntax
- **Bun Runtime**: Use Bun as the runtime and package manager (`bun run`)
- **Strict TypeScript**: Project uses `@sindresorhus/tsconfig` with strict mode enabled

### Imports & Module Organization

- **Extensions Required**: Include `.ts`/`.tsx` extensions in imports (compiler rewrites them)
- **Organized Imports**: Prettier organizes imports automatically via plugins:
  - `prettier-plugin-organize-imports`
  - `prettier-plugin-sort-imports`
  - `prettier-plugin-packagejson`
- **Import Order**: Groups: React → external libs → internal services/types → relative paths

### Formatting

- **Config**: Uses `@vdemedes/prettier-config`
- **Line Length**: Default Prettier settings (80 chars typical)
- **Quotes**: Single quotes for JS/TS, double for JSX attributes
- **Semicolons**: Yes (trailing)
- **Trailing Commas**: ES5 style
- **No Comments**: Avoid adding comments unless necessary

### Naming Conventions

| Element                | Convention               | Example                          |
| ---------------------- | ------------------------ | -------------------------------- |
| Files (components)     | PascalCase               | `PlayerControls.tsx`             |
| Files (services/hooks) | kebab-case               | `player.service.ts`              |
| Files (types)          | kebab-case               | `player.types.ts`                |
| Functions              | camelCase                | `getPlayerService()`             |
| Components             | PascalCase               | `PlayerControls`                 |
| Hooks                  | camelCase (prefix `use`) | `usePlayer()`, `useKeyBinding()` |
| Constants              | SCREAMING_SNAKE_CASE     | `MAX_QUEUE_SIZE`                 |
| Types/Interfaces       | PascalCase               | `PlayerState`, `Track`           |

### TypeScript Guidelines

- **Explicit Types**: Always type function parameters and return values
- **Type Imports**: Use `import { type Foo }` for types only
- **Avoid `any`**: Use `unknown` when type is truly unknown
- **Unused Variables**: Prefix with `_` to ignore (e.g., `_event`)

```typescript
// Good
function playTrack(track: Track): Promise<void> { ... }

// Good - unused param
function handleEvent(_event: KeyboardEvent): void { ... }
```

### React & Ink Patterns

- **JSX Runtime**: Automatic (`jsx: "react-jsx"`) - no React import needed
- **Text Wrapping**: ALL text must be wrapped in `<Text>` components
- **Box Usage**: Use `<Box>` with flexbox-style positioning for layouts
- **Custom Hooks**: Must throw if used outside provider

```typescript
// Good - text in Text component
<Box>
  <Text>Hello World</Text>
</Box>

// Bad - raw text outside Text
<Box>
  Hello World
</Box>
```

### Error Handling

- **Service Errors**: Catch and log with logger service, return meaningful errors
- **Async Operations**: Always handle promise rejections
- **User Feedback**: Display errors via UI notifications when appropriate

### File Organization

```
source/
├── components/       # UI components organized by feature
│   ├── layouts/
│   ├── player/
│   ├── search/
│   └── common/
├── contexts/         # React contexts
├── hooks/            # Custom hooks
├── services/         # Business logic (stateless/singleton)
├── stores/           # State management (Context + useReducer)
├── types/            # TypeScript type definitions
└── cli.tsx           # Entry point
```

## Architecture Patterns

### State Management (Provider + Hook)

All stores follow this pattern:

1. Provider component wraps children
2. Custom hook throws if used outside provider
3. Action-based reducers for state transitions

Example: `source/stores/player.store.tsx`

### Service Layer

Services provide abstraction over external dependencies:

- Stateless or singleton pattern
- Use getter functions: `getPlayerService()`
- Located in `source/services/`

## ! Testing

- **Framework**: AVA
- **Location**: `tests/*.test.js`
- **TUI Testing**: Use `ink-testing-library` for terminal output assertions
- **Import**: Use `ts-node/esm` registration for TypeScript imports

## Common Patterns

### Keyboard Events

Use `useKeyBinding` hook instead of raw stdin listeners to avoid `MaxListenersExceededWarning`.

### Audio URLs

Always sanitize audio URLs to prevent shell injection. Use the `youtube-ext` and `youtubei.js` services for obtaining streams.

### Store Usage

```typescript
// In component
const { currentTrack, isPlaying } = usePlayer();

// Provider must wrap component tree in app.tsx
<PlayerProvider>
  <App />
</PlayerProvider>
```

## Key Files Reference

| File                                | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `source/cli.tsx`                    | CLI argument parsing with meow          |
| `source/app.tsx`                    | Root React component, sets up providers |
| `source/stores/player.store.tsx`    | Player state management                 |
| `source/stores/favorites.store.tsx` | Favorites state management              |
| `source/types/player.types.ts`      | Player type definitions                 |
| `source/services/player/`           | Audio playback service                  |
| `eslint.config.ts`                  | ESLint flat config                      |
| `package.json`                      | Dependencies and scripts                |

## Commands Reference

```bash
# Development
bun run dev          # Start development
bun run build        # Build for production
bun run start        # Run built binary

# Quality
bun run format       # Format code
bun run lint:fix     # Fix lint issues
bun run typecheck    # Check types
bun run test         # Run tests

# Single test
bunx ava tests/player-service-mpv-args.test.js --match "test name"
```

## CLI Subcommands

```
youtube-music-cli                    # Interactive UI
youtube-music-cli play <track-id>    # Play track
youtube-music-cli search <query>     # Search and play
youtube-music-cli playlist <id>      # Play playlist
youtube-music-cli --theme=matrix    # Set theme
youtube-music-cli --headless         # Run without TUI
```
