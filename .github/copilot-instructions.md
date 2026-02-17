# Copilot Instructions for youtube-music-cli

## Quick Start

This is a Terminal User Interface (TUI) music player for YouTube Music, built with React and TypeScript using Ink for terminal rendering.

**Key Commands:**

```bash
bun run dev          # Start in watch mode (TypeScript compilation)
bun run build        # Compile TypeScript to dist/
bun run start        # Run compiled CLI binary
bun run lint:fix     # Fix linting and formatting issues
bun run test         # Run full test suite (formatting + linting + tests)
```

## Architecture Overview

### Entry Points

- **CLI Entry**: `source/cli.tsx` - Parses CLI arguments with `meow`, handles direct commands (`play`, `search`, `playlist`)
- **App Root**: `source/app.tsx` → `source/main.tsx` - Root React component that sets up providers
- **Compiled Binary**: `dist/source/cli.js` (referenced in package.json `bin` field)

### Core Layers

**State Management** (all follow the same pattern: Provider + useHook):

- `source/stores/player.store.tsx` - Player state (playback, queue, volume, shuffle/repeat) with action-based reducers
- `source/stores/navigation.store.tsx` - View navigation state
- `source/contexts/theme.context.tsx` - Theme management

**Services** (abstraction over external dependencies):

- `source/services/youtube-music/` - Wrapper around `node-youtube-music` API for search and track lookup
- `source/services/player/` - Audio playback via `play-sound`
- `source/services/config/` - Configuration persistence (theme, volume settings)

**Components** (organized by feature, use Ink primitives: Box, Text, etc.):

```
source/components/
├── layouts/       # Main UI containers (PlayerLayout, SearchLayout, etc.)
├── player/        # Player-specific UI (PlayerControls, QueueList, etc.)
├── search/        # Search UI (SearchBar, SearchResults)
├── playlist/      # Playlist management UI
├── theme/         # Theme switching UI
└── common/        # Shared components (Help, ErrorBoundary, etc.)
```

**Types** (core domain models):

- `source/types/player.types.ts` - PlayerState, PlayerAction
- `source/types/youtube-music.types.ts` - Track, Album, Artist, Playlist, SearchResult
- `source/types/theme.types.ts` - Theme interface
- `source/types/cli.types.ts` - CLI flags and options

### Key Patterns

**React Hooks & Context**: All custom hooks throw an error if used outside their provider. Always verify the provider wrapper is in place before using a hook.

**Action-Based Reducers**: Player state changes happen through action categories (PLAY, PAUSE, NEXT, SEEK, etc.) dispatched to the reducer. Check `PlayerAction` type for available actions.

**Terminal Size Responsiveness**: Use `useTerminalSize()` to scale UI elements and truncate text based on terminal width.

## Development Conventions

### Imports & Modules

- **ESM Modules**: Project uses `"type": "module"` - all imports use ES syntax
- **TypeScript Extensions**: Imports include `.ts`/`.tsx` extensions (compiler rewrites them)
- **Bun Runtime**: Primary runtime and package manager (scripts use `bun run`)

### Code Quality

- **Linting**: ESLint with flat config, extends XO and XO-React
- **Formatting**: Prettier with `@vdemedes/prettier-config` and import organization plugins
- **TypeScript**: Strict mode via `@sindresorhus/tsconfig`
- **React Transform**: JSX uses automatic transform (`jsx: "react-jsx"`)

### Testing

- **Test Runner**: AVA (configured for TypeScript modules)
- **TUI Testing**: `ink-testing-library` for asserting on terminal output
- **Test Location**: `test.tsx` and other `.test.ts/tsx` files
- **Single Test**: `bunx ava test.tsx --match "test name"` to run specific test

## CLI Commands

### Interactive Mode

```bash
youtube-music-cli                    # Launch interactive UI
youtube-music-cli --theme=matrix     # Set theme via flag
```

### Subcommands

```bash
youtube-music-cli play <track-id>    # Play specific track directly
youtube-music-cli search <query>     # Search and play
youtube-music-cli playlist <id>      # Play playlist
youtube-music-cli pause              # Pause playback
youtube-music-cli resume             # Resume playback
youtube-music-cli skip               # Skip to next track
youtube-music-cli back               # Go to previous track
youtube-music-cli --headless         # Run without TUI
```

## Critical Implementation Details

### Keyboard Event Management

- Use `useKeyBinding` hook to register global shortcuts
- Keyboard events are centralized to prevent `MaxListenersExceededWarning`
- Avoid adding raw stdin listeners directly; use the hook instead

### Audio Streaming

- High-quality audio URLs are obtained via `youtube-ext` and `youtubei.js`
- Audio is played via `play-sound` service
- **Security**: Always sanitize audio URLs to prevent shell injection

### Search & Results

- Search is polymorphic: returns discriminated union of Track/Album/Artist/Playlist results
- Search triggering happens on Enter key press
- Results are paginated to avoid excessive API calls

### Terminal Rendering

- All text must be wrapped in `<Text>` components
- Use `<Box>` with flexbox-style positioning
- Never place raw text outside of `<Text>` components (will cause Ink render errors)

## Common Debugging Tips

1. **Type Errors**: Run `bun run typecheck` without emitting to catch TS errors quickly
2. **Render Crashes**: Check that all text is wrapped in `<Text>` components
3. **State Not Updating**: Verify the store provider is wrapping the consuming component tree
4. **Keyboard Events Not Firing**: Use `useKeyBinding` hook instead of raw stdin listeners
5. **API Failures**: Check `youtube-music` service error handling; Innertube API may require authentication tokens

## File Organization Standards

- Keep component logic surgical: move business logic to hooks/services
- Place reusable logic in `source/hooks/`
- Use TypeScript types from `source/types/` for all public APIs
- Services should be stateless or singleton (like MusicService via `getMusicService()`)
- Avoid circular dependencies between stores and components

## MCP Servers

The `.mcp/servers.json` file configures Model Context Protocol servers for enhanced Copilot capabilities:

- **Node MCP** - Runtime analysis and module introspection for Node.js dependencies
- **Filesystem MCP** - Safe directory and file operations within the repo
- **Git MCP** - Git history, diff, and version control operations

These provide deeper context for code analysis and can be enabled in compatible Copilot environments.

## See Also

- **CLAUDE.md** - Detailed developer documentation
- **GEMINI.md** - Architecture and recent updates overview
- **package.json** - Full list of dependencies and scripts
- **.mcp/servers.json** - MCP server configuration
