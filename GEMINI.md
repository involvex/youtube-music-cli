# GEMINI.md

## Project Overview

`youtube-music-cli` is a sophisticated Terminal User Interface (TUI) music player for YouTube Music. It leverages React and Ink to provide a rich, interactive experience directly in the terminal, featuring search capabilities, playlist management, and a full-featured playback interface.

### Main Technologies

- **UI Framework**: [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- **Runtime & Task Runner**: [Bun](https://bun.sh/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **API Integration**: [node-youtube-music](https://github.com/Kallmerten/node-youtube-music) (Innertube)
- **Audio Playback**: [play-sound](https://github.com/shaozhee/play-sound)
- **CLI Parsing**: [meow](https://github.com/sindresorhus/meow)
- **State Management**: React Context & Reducers

### Architecture

The project follows a modern React architecture adapted for the terminal:

- **`source/cli.tsx`**: Entry point for CLI execution and flag parsing.
- **`source/app.tsx` & `source/main.tsx`**: Application root and provider orchestration.
- **`source/components/`**: Modular UI components organized by feature (player, search, artist, etc.).
- **`source/services/`**: Infrastructure layer for API communication and low-level player control.
- **`source/stores/`**: Centralized state management using React Context for Navigation and Player state.
- **`source/hooks/`**: Custom hooks encapsulating business logic and state access.
- **`source/types/`**: Comprehensive TypeScript definitions for API responses and application state.

---

## Building and Running

The project uses `bun` as the primary tool for development tasks.

### Key Commands

- **Build**: `bun run build` (Runs `tsc` to compile TypeScript to `dist/`)
- **Development**: `bun run dev` (Runs `bun source/cli.tsx`)
- **Run**: `bun run start` (Runs the compiled CLI from `dist/source/cli.js`)
- **Typecheck**: `bun run typecheck` (Runs `tsc --noEmit`)
- **Lint**: `bun run lint` (Uses `eslint` and `xo`)
- **Format**: `bun run format` (Uses `prettier`)
- **Test**: `bun run test` (Uses `ava` and `ink-testing-library`)

---

## Development Conventions

### Coding Styles

- **Functional React**: Use functional components and hooks exclusively.
- **Strict Typing**: Ensure all components and services are fully typed.
- **Surgical Logic**: Logic is separated into services and hooks; components should primarily handle rendering and layout.
- **Key Bindings**: Global keyboard shortcuts are managed via the `useKeyBinding` hook and constants in `source/utils/constants.ts`.

### Project-Specific Patterns

- **TUI Layouts**: Layouts use `Box` components from `ink` for flexbox-style positioning.
- **State Reducers**: Complex state (like the player) is managed using the `useReducer` pattern in stores.
- **API Singleton**: The `MusicService` is implemented as a singleton accessed via `getMusicService()`.

### Testing Practices

- Tests are located in `test.tsx` (and presumably other `.test.ts/tsx` files if they exist).
- Use `ink-testing-library` for asserting on TUI output.
- `ava` is the test runner, configured to handle TypeScript modules.

---

## Core Data Types

The application uses a set of core interfaces for YouTube Music entities, defined in `source/types/youtube-music.types.ts`:

- **`Track`**: Represents a song, including `videoId`, `title`, `artists`, and optional `album`.
- **`Album`**: Represents an album with `albumId`, `name`, and associated `artists`.
- **`Artist`**: Represents an artist with `artistId` and `name`.
- **`Playlist`**: Represents a collection of tracks with `playlistId` and `name`.
- **`SearchResult`**: A discriminated union used for polymorphic search results.

---

## Recent Updates

- **Fixed CLI Crash**: Resolved an Ink rendering error where text was placed outside `<Text>` components in `SearchLayout.tsx`.
- **Improved Dev Experience**: Updated `dev` command to prevent double-instance launch in Bun.
- **Robust Error Handling**: Added `ErrorBoundary` to catch and display runtime errors gracefully.
- **Music Suggestions**: New `suggestions` command and view (key: `g`) to discover related tracks based on current playback.
- **Stream Quality Settings**: Added settings view (key: `,`) to toggle between Low, Medium, and High quality.
