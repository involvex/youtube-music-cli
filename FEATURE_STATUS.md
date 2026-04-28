# Feature Status & Implementation Plan

## 1. Feature Status Table

| Section                    | Feature                           | Status      |
| :------------------------- | :-------------------------------- | :---------- |
| **Playback Features**      | Gapless Playback                  | Implemented |
| Playback Features          | Crossfade Support                 | Implemented |
| Playback Features          | Equalizer                         | Implemented |
| Playback Features          | Volume Fade In/Out                | Planned     |
| Playback Features          | A/B Loop                          | Planned     |
| **Discovery & Search**     | Advanced Search Filters           | Implemented |
| Discovery & Search         | Smart Recommendations             | Planned     |
| Discovery & Search         | Genre Browsing                    | Planned     |
| Discovery & Search         | New Releases                      | Planned     |
| Discovery & Search         | Similar Artists                   | Planned     |
| Discovery & Search         | Mood-Based Radio                  | Planned     |
| Discovery & Search         | Recently Played                   | Implemented |
| Discovery & Search         | AI Playlist Generation            | Planned     |
| **Playlist Management**    | Playlist Sync                     | Planned     |
| Playlist Management        | Smart Playlists                   | Planned     |
| Playlist Management        | Collaborative Playlists           | Planned     |
| Playlist Management        | Playlist Folders                  | Planned     |
| Playlist Management        | Duplicate Detection               | Planned     |
| Playlist Management        | Queue Snapshots                   | Planned     |
| Playlist Management        | Playlist Statistics               | Planned     |
| Playlist Management        | Track Bookmarks                   | Planned     |
| **User Interface**         | Visualizer                        | Planned     |
| User Interface             | Album Art                         | Planned     |
| User Interface             | Mini Player Mode                  | Planned     |
| User Interface             | Split View                        | Planned     |
| User Interface             | Mouse Support                     | Planned     |
| User Interface             | More Themes                       | Planned     |
| User Interface             | Waveform Progress Bar             | Planned     |
| User Interface             | Configurable Layout               | Planned     |
| User Interface             | Startup Screen                    | Planned     |
| User Interface             | Listening Stats Dashboard         | Implemented |
| **Technical Improvements** | Multiple Audio Backends           | Planned     |
| Technical Improvements     | Shell Completions                 | Implemented |
| Technical Improvements     | Custom mpv Config Passthrough     | Planned     |
| Technical Improvements     | Configurable Audio Output Device  | Planned     |
| Technical Improvements     | Auto-Update Mechanism             | Planned     |
| Technical Improvements     | Configurable Cache TTL            | Planned     |
| Technical Improvements     | Multi-instance Sync               | Planned     |
| Technical Improvements     | Battery Saver Mode                | Planned     |
| Technical Improvements     | Telemetry (Opt-in)                | Planned     |
| Technical Improvements     | Performance Profiling             | Planned     |
| **Security & Privacy**     | TOR Support                       | Planned     |
| Security & Privacy         | No Tracking Mode                  | Planned     |
| Security & Privacy         | Encrypted Config                  | Planned     |
| Security & Privacy         | Audit Logging                     | Planned     |
| Security & Privacy         | Token Refresh                     | Planned     |
| Security & Privacy         | OS Credential Manager Integration | Planned     |
| **Platform & Integration** | Homebrew Formula                  | Implemented |
| Platform & Integration     | AUR Package                       | Planned     |
| Platform & Integration     | Snap/Flatpak                      | Planned     |
| Platform & Integration     | Windows MSIX Package              | Implemented |
| Platform & Integration     | NixOS / Nix Flake                 | Planned     |
| Platform & Integration     | Mobile Companion App              | Planned     |
| Platform & Integration     | Alfred/Raycast Extension          | Planned     |
| Platform & Integration     | tmux Status Line                  | Planned     |
| Platform & Integration     | GitHub Actions Release Pipeline   | Planned     |

## 2. Unimplemented Features by Section

### Playback Features

- Volume Fade In/Out
- A/B Loop

### Discovery & Search

- Smart Recommendations
- Genre Browsing
- New Releases
- Similar Artists
- Mood-Based Radio
- AI Playlist Generation

### Playlist Management

- Playlist Sync
- Smart Playlists
- Collaborative Playlists
- Playlist Folders
- Duplicate Detection
- Queue Snapshots
- Playlist Statistics
- Track Bookmarks

### User Interface

- Visualizer
- Album Art
- Mini Player Mode
- Split View
- Mouse Support
- More Themes
- Waveform Progress Bar
- Configurable Layout
- Startup Screen
- ~~Listening Stats Dashboard~~ ✓ Implemented

### Technical Improvements

- Multiple Audio Backends
- Custom mpv Config Passthrough
- Configurable Audio Output Device
- Auto-Update Mechanism
- Configurable Cache TTL
- Multi-instance Sync
- Battery Saver Mode
- Telemetry (Opt-in)
- Performance Profiling

### Security & Privacy

- TOR Support
- No Tracking Mode
- Encrypted Config
- Audit Logging
- Token Refresh
- OS Credential Manager Integration

### Platform & Integration

- AUR Package
- Snap/Flatpak
- NixOS / Nix Flake
- Mobile Companion App
- Alfred/Raycast Extension
- tmux Status Line
- GitHub Actions Release Pipeline

## 3. Plan to Fix IDE Problems

1. **Missing `Track` Type Exports**: Identify where the `Track` interface has been moved to (likely `player.types.ts`) and update the imports in `plugins/lyrics/index.ts`, `plugins/discord-rpc/index.ts`, and `plugins/adblock/index.ts`.
2. **`PluginEvent` and `NavigationEvent` issues**: The payload for the plugin events has been refactored. The property `track` is no longer at the root of the event object. I will inspect `plugin.types.ts` to find the correct shape (e.g. `event.payload.track` or a type narrowed event based on event name) and update the hook handlers accordingly.
3. **`adblock/index.ts` Specific Fixes**:
   - `stream-request` lacking type assignment: Update the plugin hooks array type in the manifest or simply remove the invalid string.
   - `onStreamRequest` interface mismatch: Wait to see the exact signature in `plugin.types.ts`. Sometimes async returns are expected, but here we see a standard mismatch `Promise<string | null>` vs `string | null | Promise<string>`. That implies the return type signature on `context.audio.onStreamRequest` needs the handler to return `Promise<string>` but it returns `Promise<string | null>`. It might be expecting returning `url` or something specific.
   - `isAd(track)` parameter mismatch: Ensure the `duration` property has the correct `{ totalSeconds: number }` signature as defined by the latest `Track` type.
