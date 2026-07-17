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

Always sanitize audio URLs to prevent shell injection. Stream URLs for downloads come from **yt-dlp** (primary), then **youtubei.js**, then **Invidious** (with persisted instance health / auto-discovery). Playback passes watch URLs to mpv/yt-dlp directly.

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
youtube-music-cli --win32            # Windows immersive mode (Bun native)
```

## Learned User Preferences

- Do not create git commits unless the user explicitly asks
- Verify build, test, and lint pass before declaring work complete
- Prefer direct communication; avoid filler acknowledgments and apologies
- Win32 immersive player volume should match Ink TUI: `=`/`+` for up and `-` for down (not arrow keys)

## Learned Workspace Facts

- Win32 immersive mode (`--win32`, `bun run dev:win32`, `build:win32`) lives under `source/immersive/` and is separate from the Ink TUI
- Immersive library and search overlays share helpers in `source/immersive/actions/playback-actions.ts`; shortcuts include `=`/`+`/`-` (player volume), L/P/E (library), Shift+S (shuffle), R (repeat), `,` / Ctrl+, (settings), Tab/Ctrl+A/Ctrl+L/+/- (search filters and limit), Shift+D (download), M (mix), and F (favorite); tray right-click offers Settings and Exit
- Immersive settings overlay mirrors Ink TUI with 23 rows (`IMMERSIVE_SETTINGS_COUNT` in `source/immersive/settings/settings-items.ts`)
- `playback-actions.ts` types music calls via `ImmersiveMusicService` instead of importing `getMusicService()`, so immersive AVA tests avoid loading the heavy YouTube API module
- Immersive stdin uses raw `process.stdin.on('data')` without escape buffering; `Ctrl+,` on Windows Terminal may need `\x0c` plus CSI u sequences in `key-parser.ts`
- Windows FFI uses only `@bun-win32/user32` and `@bun-win32/kernel32` (not `@bun-win32/terminal`, combase, or shell32), dynamically imported via `source/immersive/native/win32-ffi.ts`; major `@bun-win32/*` upgrades must bump user32 and kernel32 together (shared `@bun-win32/core` 2.x)
- Shared mpv IPC sync lives in `source/services/player/mpv-event-policy.ts` (Ink `player.store.tsx` and immersive `immersive-app.ts`): EOF pause suppression, 15s advance grace during track transitions, 3s playback stall watchdog, advance debounce
- Immersive shuffle uses `playbackOrder` in `source/immersive/state/queue-state.ts` for advance, previous track, and UP NEXT preview; Random Favorite queues all favorites starting at a random index (not a single track)
- Run immersive AVA tests with `--timeout=60s` — default 30s can timeout when heavy modules load; coverage in `tests/immersive.test.js` and `tests/favorites.test.js`
- Ink TUI and immersive share favorites via `getFavoritesManager()` in `source/services/favorites/favorites.service.ts`, persisting to `~/.youtube-music-cli/favorites.json` (`schemaVersion` + `tracks` + `lastUpdated`); do not write favorites before hydration completes; `saveFavorites()` refuses empty overwrite unless `allowEmptyOverwrite`; tests must use `resetFavoritesManagerForTests()` / `setFavoritesFilePathForTests()`
- mpv 0.41+ subtitle language uses `--slang=en` in `buildMpvArgs`, not `--sub-lang=en` — the old flag makes mpv exit immediately when subtitles are enabled; `PlayerService` uses `playGeneration` to invalidate stale `play()` promises after `stop()`, `isValidIpcPipePath()` for Windows pipe paths, and aborts stale IPC connect retries on stop
- `SET_ERROR` in `player.store.tsx` sets `isLoading: false` and, only when `error` is non-null, `isPlaying: false` (clearing with `null` must not force paused UI while mpv still plays)
- When Windows named-pipe IPC drops, `PlayerService.pause()`/`resume()` reconnect via `tryReconnectIpc()` before commanding mpv; orphan mpv that cannot be reached is stopped so UI and audio stay aligned
- Ink TUI and immersive stall watchdogs attempt IPC reconnect when progress freezes while mpv is still alive
- Downloads prefer **yt-dlp**, then youtubei.js stream URLs, then Invidious; progress is reported via `onProgress` (`formatDownloadProgress`) in Ink search/playlist and immersive search overlay
- Invidious instance health / discovery lives in `source/services/invidious/invidious-health.service.ts`, persisted to `~/.youtube-music-cli/invidious-health.json` (24h discovery TTL from `api.invidious.io/instances.json`)
