# GEMINI.md

## Project Overview

**@involvex/youtube-music-cli** is a high-performance, feature-rich Terminal User Interface (TUI) music player for YouTube Music. It is built with **React** and **TypeScript**, using **Ink** for terminal rendering and **Bun** as the primary runtime.

### Key Features

- **TUI/CLI Hybrid**: Supports both a full interactive TUI and direct CLI commands (e.g., `play`, `search`).
- **Audio Engine**: Powered by **mpv** with JSON IPC control for precise playback management.
- **API Integration**: Uses **youtubei.js** (Innertube) for interacting with YouTube Music.
- **Plugin System**: Extensible architecture allowing for features like adblocking, lyrics, and Discord Rich Presence.
- **State Management**: Robust custom store pattern using React Context and `useReducer`.
- **Persistence**: Local configuration and player state persistence (history, queue, volume).

### Core Tech Stack

- **Runtime**: Bun (supports Node.js compatibility).
- **UI**: React + Ink (Terminal UI).
- **Language**: TypeScript (ESM).
- **Audio**: mpv (via `spawn` and IPC socket).
- **Extraction**: yt-dlp (via mpv integration).

---

## Architecture

### 1. Entry Points

- **`source/cli.tsx`**: The main entry point. Parses CLI arguments using `meow`, handles direct commands, and renders the `App` component for the TUI.
- **`source/app.tsx`**: Root React component that sets up providers and the main UI shell.

### 2. State Management (`source/stores/`)

The project uses a predictable state management pattern:

- **`PlayerProvider`**: Manages playback state, queue, volume, and shuffle/repeat modes.
- **`NavigationProvider`**: Handles view transitions and navigation history.
- **`PluginsProvider`**: Manages the lifecycle and state of loaded plugins.

### 3. Service Layer (`source/services/`)

Services provide a singleton-based abstraction for side effects:

- **`PlayerService`**: Low-level `mpv` process management and IPC communication.
- **`MusicService`**: High-level wrapper for YouTube Music search and metadata retrieval.
- **`ConfigService`**: Manages user configuration stored in `~/.youtube-music-cli/config.json`.
- **`PluginService`**: Handles plugin discovery, installation, and activation.

### 4. Components (`source/components/`)

UI is organized by feature:

- `layouts/`: Master containers (Player, Search, Settings).
- `player/`: Playback controls, progress bars, and queue lists.
- `search/`: Input fields and result grids.
- `common/`: Reusable UI primitives and help dialogs.

---

## Building and Running

### Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Run the app in development mode (with Bun)
bun run dev:watch    # Run with watch mode
```

### Production Build

```bash
bun run build        # Compile TypeScript to dist/ (using tsc)
bun run start        # Run the compiled CLI from dist/
```

### Code Quality & Testing

```bash
bun run typecheck    # Run TypeScript compiler (noEmit)
bun run lint:fix     # Run ESLint and fix issues
bun run format       # Format code with Prettier
bun run test         # Run tests (AVA)
```

---

## Development Conventions

### 1. Module System

- The project is **Pure ESM**. Always use `import` and `export`.
- TypeScript imports **MUST** include the file extension (e.g., `import {X} from './types.ts'`).

### 2. React Patterns

- Prefer **Functional Components** and **Hooks**.
- Use **Context Providers** for global state. Custom hooks (`usePlayer`, `useTheme`) should throw an error if used outside their respective providers.
- UI should be built using Ink primitives (`Box`, `Text`, `Newline`).

### 3. Service Pattern

- Services should be implemented as **Classes** with a `getInstance()` static method or a `getService()` factory function to ensure singletons.
- Long-running processes (like `mpv`) must be cleaned up on app exit using `process.on('exit', ...)` or React `useEffect` cleanup.

### 4. Code Quality

- Follow **Prettier** formatting (configuration is in `package.json`).
- Ensure all new features have corresponding types in `source/types/`.
- Use the provided **LoggerService** (`source/services/logger/`) for debugging instead of `console.log`.

---

## File Structure Highlights

- `plugins/`: Core plugins included with the project.
- `templates/`: Boilerplate for creating new plugins.
- `docs/`: Detailed guides for architecture, API, and development.
- `tests/`: End-to-end and unit tests using `ava`.
