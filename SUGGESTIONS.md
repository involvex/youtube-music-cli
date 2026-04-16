# Feature Suggestions & Improvements

This document tracks potential features, enhancements, and improvements for youtube-music-cli.

## 🎵 Playback Features

### High Priority

- Implemented **Gapless Playback** - Seamless transitions between tracks without audio gaps
- Implemented **Crossfade Support** - Smooth audio crossfading between songs (configurable duration)
- Implemented **Equalizer** - Built-in audio equalizer with preset profiles (Bass Boost, Vocal, etc.)

### Medium Priority

- Implemented **Volume Fade In/Out** - Gradually fade volume at track start and end for smooth transitions
- Implemented **Mini Player Mode** - Compact single-line player for use alongside other terminal work
- Implemented **Recently Played** - Dedicated view showing full listening history with timestamps
- Implemented **Startup Screen** - Welcome screen showing recently played and favorite content
- Implemented **A/B Loop** - Mark two points in a track and loop between them (practice/review mode)

## 🔍 Discovery & Search

## : High Priority

- Implemented **Advanced Search Filters** - Filter by artist, album, year, duration
- Planned **Smart Recommendations** - AI/ML-based track suggestions beyond YouTube's built-in algorithm

## : Medium Priority

- Planned **Genre Browsing** - Browse music by genre or mood
- Planned **New Releases** - Dedicated view for newly released music
- Planned **Similar Artists** - Discover artists similar to the currently playing one
- Planned **Mood-Based Radio** - Start a radio station seeded by a mood or energy level selection
- Planned **AI Playlist Generation** - Generate a playlist from a natural-language prompt (e.g. "relaxing morning jazz")

## 📋 Playlist Management

## ! High Priority

- Implemented **Favorites** - Persistence for favorite tracks, toggle with `f`, view with `Shift+F`
- Planned **Playlist Sync** - Two-way sync with YouTube Music account playlists
- Planned **Smart Playlists** - Auto-generated playlists based on listening history and habits

## ! Medium Priority

- Planned **Collaborative Playlists** - Share playlists with others via a shareable link or file
- Planned **Playlist Folders** - Organize playlists into named folders/groups
- Planned **Duplicate Detection** - Warn when adding a track that already exists in a playlist
- Planned **Queue Snapshots** - Save and restore the current queue as a named snapshot
- Planned **Playlist Statistics** - Show stats per playlist (total duration, top artists, play counts)
- Planned **Track Bookmarks** - Bookmark a timestamp within a track to return to it later

## 🎨 User Interface

### !High Priority

- Planned **Visualizer** - ASCII/ANSI audio visualizer rendered in the terminal
- Planned **Album Art** - Display album artwork using terminal graphics protocols (sixel, kitty)
- Planned **Mini Player Mode** - Compact single-line player for use alongside other terminal work
- Planned **Split View** - Side-by-side panels for queue and search results

### !!Medium Priority

- Planned **Mouse Support** - Click and scroll interactions for modern terminal emulators
- Planned **More Themes** - Additional color schemes: Dracula, Nord, Solarized, Catppuccin
- Planned **Waveform Progress Bar** - Replace the plain progress bar with an ASCII waveform representation
- Planned **Configurable Layout** - User-adjustable panel sizes and component arrangement

## 🔧 Technical Improvements

### !!!High Priority

- Planned **Multiple Audio Backends** - Support VLC and ffplay as alternatives to mpv
- Implemented **Shell Completions** - Tab-completion scripts for Bash, Zsh, Powershell and Fish
- Planned **Custom mpv Config Passthrough** - Allow extra mpv flags to be specified in config or via CLI

### !Medium Priority

- Planned **Configurable Audio Output Device** - Select audio output device (useful for DACs, multi-monitor setups)
- Planned **Auto-Update Mechanism** - Built-in self-update command (`youtube-music-cli update`)
- Planned **Configurable Cache TTL** - Set how long API responses and stream URLs are cached
- Planned **Multi-instance Sync** - Sync playback state across multiple terminal sessions
- Planned **Battery Saver Mode** - Reduce IPC polling frequency when running on battery power

### Low Priority

- Planned **Telemetry (Opt-in)** - Anonymous usage statistics to guide future development
- Planned **Performance Profiling** - Built-in performance monitoring and timing tools

## 🔐 Security & Privacy

### !!High Priority

- Planned **TOR Support** - Route all traffic through the TOR network for anonymity
- Planned **No Tracking Mode** - Prevent YouTube from logging listening history via account linkage

### !!!Medium Priority

- Planned **Encrypted Config** - Encrypt stored preferences and session tokens at rest
- Planned **Audit Logging** - Structured log of all outbound network requests
- Planned **Token Refresh** - Automatically refresh expired YouTube session tokens without requiring re-login
- Planned **OS Credential Manager Integration** - Store secrets in macOS Keychain, Windows Credential Manager, or libsecret

## 📱 Platform & Integration

### !! Medium Priority

- Implemented **Homebrew Formula** - Easy installation on macOS via `brew install`
- Planned **AUR Package** - Arch Linux package for `yay`/`paru` users
- Planned **Snap/Flatpak** - Linux universal packages for broader distro support
- Implemented **Windows MSIX Package** - MSIX installer for Windows users via `bun run msix` (requires self-signed cert for dev installs; see `msix-config.json`)
- Planned **NixOS / Nix Flake** - Reproducible Nix package for NixOS and `nix profile install`

### ! Low Priority

- Planned **Mobile Companion App** - Remote control playback from a mobile device
- Planned **Alfred/Raycast Extension** - macOS launcher integration for quick search and playback
- Planned **tmux Status Line** - Show currently playing track in the tmux status bar
- Planned **GitHub Actions Release Pipeline** - Automated cross-platform binary builds on tag push

## 🐛 Known Issues to Fix

- Planned Occasional audio stream interruption on slow connections
- Planned Search results sometimes don't include all available tracks
- Planned Theme colors may not render correctly on some terminal emulators
- Planned Volume control precision varies by audio backend

## 💡 Community Requested

_This section will be populated based on GitHub issues and discussions._

---

## Contributing

Want to work on any of these? Check our [Contributing Guide](CONTRIBUTING.md) and feel free to:

1. Open an issue to discuss the feature
2. Submit a PR implementing the feature
3. Help with documentation or testing

## Priority Legend

- **High Priority**: Core functionality improvements, frequently requested
- **Medium Priority**: Nice-to-have features, moderate complexity
- **Low Priority**: Future considerations, complex implementations

## 🛠 Implementation Plan

- **[In progress] Crossfade & gapless playback**
  We are iterating on a crossfade-aware queue and mpv configuration that keeps playback seamless and gapless. See `docs/roadmap.md` for the technical steps, the settings that will surface the option, and the verification checkpoints.
- **Next stops**
  After the core crossfade/gapless work stabilizes we will expand the story to cover the broader equalizer feature set and the smart recommendation items listed above. Each focus area should be tracked in `docs/roadmap.md` with matching README/CLAUDE callouts so the rest of the team can stay aligned.
