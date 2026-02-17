# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@involvex/youtube-music-cli** is a terminal-based music player for YouTube Music, built with React and TypeScript using Ink for terminal UI rendering. It provides a full-featured CLI music player with search, playback controls, queue management, and multiple UI themes.

## Commands

### Development

```bash
bun run dev          # TypeScript watch mode
bun run build        # Compile TypeScript to dist/
bun run start        # Run compiled CLI (dist/source/cli.js)
```

### Code Quality

```bash
bun run format       # Format code with Prettier
bun run format:check # Check formatting without modifying
bun run lint         # Lint code with ESLint
bun run lint:fix     # Fix linting issues automatically
bun run typecheck    # Type check without emitting
```

### Testing

```bash
bun run test         # Run prettier check + XO + AVA
```

The `prebuild` script automatically runs `format` → `lint:fix` → `typecheck` before building.

## Architecture

### Entry Points

- **CLI Entry**: `source/cli.tsx` - Parses CLI arguments with `meow`, handles direct commands (`play`, `search`, `playlist`)
- **App Root**: `source/app.tsx` → `source/main.tsx` - Root React component
- **Compiled Binary**: `dist/source/cli.js` (set as `bin` in package.json)

### State Management Pattern

The codebase uses a custom store pattern built on React Context + useReducer:

- **`source/stores/player.store.tsx`**: Core player state (playback, queue, volume, shuffle/repeat). Exports `PlayerProvider` and `usePlayer()` hook. State transitions happen through action categories (PLAY, PAUSE, NEXT, SEEK, etc.)
- **`source/stores/navigation.store.tsx`**: View navigation state
- **`source/contexts/theme.context.tsx`**: Theme management, exports `ThemeProvider` and `useTheme()` hook

Important: All stores follow the same pattern - Provider component wraps children, custom hook throws if used outside provider.

### Service Layer

Services in `source/services/` provide abstraction over external dependencies:

- **`youtube-music/`**: Wrapper around `node-youtube-music` API for search, track lookup
- **`player/`**: Audio playback via `play-sound`
- **`config/`**: Configuration persistence (theme, volume settings)

### Component Structure

```
source/components/
├── layouts/       # Main layout containers (PlayerLayout, SearchLayout, etc.)
├── player/        # Player-specific components (PlayerControls, QueueList, etc.)
├── search/        # Search components (SearchBar, SearchResults)
├── playlist/      # Playlist management components
├── theme/         # Theme switching components
└── common/        # Shared components (Help, etc.)
```

Components use Ink's terminal UI primitives (Box, Text, etc.) and follow React 18 patterns with hooks.

### CLI Commands

The CLI supports both direct invocation and subcommands:

```
youtube-music-cli                    # Launch interactive UI
youtube-music-cli play <track-id>    # Play specific track directly
youtube-music-cli search <query>     # Search and play
youtube-music-cli playlist <id>      # Play playlist
youtube-music-cli --theme=matrix     # Set theme
```

Flags defined in `source/cli.tsx` are passed through to the App.

## Conventions

- **ESM Modules**: Project uses `"type": "module"` - all imports use ES syntax
- **TypeScript Imports**: Imports include `.ts`/`.tsx` extensions (rewritten by compiler)
- **Bun Runtime**: Project uses Bun as the runtime and package manager (scripts use `bun run`)
- **Prettier Config**: Uses `@vdemedes/prettier-config` with import organization plugins
- **Linting**: ESLint with flat config, extends XO and XO-React configs

## Type Definitions

Key types are in `source/types/`:

- `player.types.ts`: PlayerState, PlayerAction
- `youtube-music.types.ts`: Track, Album, Artist, Playlist
- `theme.types.ts`: Theme interface
- `cli.types.ts`: CLI flags and options
