# Feature Suggestions & Improvements

This document tracks potential features, enhancements, and improvements for youtube-music-cli.

## 🎵 Playback Features

### High Priority

- [ ] **Gapless Playback** - Seamless transitions between tracks without audio gaps
- [ ] **Crossfade Support** - Smooth audio crossfading between songs (configurable duration)
- [ ] **Equalizer** - Built-in audio equalizer with preset profiles (Bass Boost, Vocal, etc.)

### Medium Priority

- [ ] **Volume Fade In/Out** - Gradually fade volume at track start and end for smooth transitions
- [ ] **A/B Loop** - Mark two points in a track and loop between them (practice/review mode)

## 🔍 Discovery & Search

### High Priority

- [ ] **Advanced Search Filters** - Filter by artist, album, year, duration
- [ ] **Smart Recommendations** - AI/ML-based track suggestions beyond YouTube's built-in algorithm

### Medium Priority

- [ ] **Genre Browsing** - Browse music by genre or mood
- [ ] **New Releases** - Dedicated view for newly released music
- [ ] **Similar Artists** - Discover artists similar to the currently playing one
- [ ] **Mood-Based Radio** - Start a radio station seeded by a mood or energy level selection
- [ ] **Recently Played** - Dedicated view showing full listening history with timestamps
- [ ] **AI Playlist Generation** - Generate a playlist from a natural-language prompt (e.g. "relaxing morning jazz")

## 📋 Playlist Management

### High Priority

- [ ] **Playlist Sync** - Two-way sync with YouTube Music account playlists
- [ ] **Smart Playlists** - Auto-generated playlists based on listening history and habits

### Medium Priority

- [ ] **Collaborative Playlists** - Share playlists with others via a shareable link or file
- [ ] **Playlist Folders** - Organize playlists into named folders/groups
- [ ] **Duplicate Detection** - Warn when adding a track that already exists in a playlist
- [ ] **Queue Snapshots** - Save and restore the current queue as a named snapshot
- [ ] **Playlist Statistics** - Show stats per playlist (total duration, top artists, play counts)
- [ ] **Track Bookmarks** - Bookmark a timestamp within a track to return to it later

## 🎨 User Interface

### High Priority

- [ ] **Visualizer** - ASCII/ANSI audio visualizer rendered in the terminal
- [ ] **Album Art** - Display album artwork using terminal graphics protocols (sixel, kitty)
- [ ] **Mini Player Mode** - Compact single-line player for use alongside other terminal work
- [ ] **Split View** - Side-by-side panels for queue and search results

### Medium Priority

- [ ] **Mouse Support** - Click and scroll interactions for modern terminal emulators
- [ ] **More Themes** - Additional color schemes: Dracula, Nord, Solarized, Catppuccin
- [ ] **Waveform Progress Bar** - Replace the plain progress bar with an ASCII waveform representation
- [ ] **Configurable Layout** - User-adjustable panel sizes and component arrangement
- [ ] **Startup Screen** - Welcome screen showing recently played and favorite content

## 🔧 Technical Improvements

### High Priority

- [ ] **Multiple Audio Backends** - Support VLC and ffplay as alternatives to mpv
- [ ] **Shell Completions** - Tab-completion scripts for Bash, Zsh, and Fish
- [ ] **Custom mpv Config Passthrough** - Allow extra mpv flags to be specified in config or via CLI

### Medium Priority

- [ ] **Configurable Audio Output Device** - Select audio output device (useful for DACs, multi-monitor setups)
- [ ] **Auto-Update Mechanism** - Built-in self-update command (`youtube-music-cli update`)
- [ ] **Configurable Cache TTL** - Set how long API responses and stream URLs are cached
- [ ] **Multi-instance Sync** - Sync playback state across multiple terminal sessions
- [ ] **Battery Saver Mode** - Reduce IPC polling frequency when running on battery power

### Low Priority

- [ ] **Telemetry (Opt-in)** - Anonymous usage statistics to guide future development
- [ ] **Performance Profiling** - Built-in performance monitoring and timing tools

## 🔐 Security & Privacy

### High Priority

- [ ] **TOR Support** - Route all traffic through the TOR network for anonymity
- [ ] **No Tracking Mode** - Prevent YouTube from logging listening history via account linkage

### Medium Priority

- [ ] **Encrypted Config** - Encrypt stored preferences and session tokens at rest
- [ ] **Audit Logging** - Structured log of all outbound network requests
- [ ] **Token Refresh** - Automatically refresh expired YouTube session tokens without requiring re-login
- [ ] **OS Credential Manager Integration** - Store secrets in macOS Keychain, Windows Credential Manager, or libsecret

## 📱 Platform & Integration

### Medium Priority

- [ ] **Homebrew Formula** - Easy installation on macOS via `brew install`
- [ ] **AUR Package** - Arch Linux package for `yay`/`paru` users
- [ ] **Snap/Flatpak** - Linux universal packages for broader distro support
- [ ] **Windows Installer** - MSI/EXE installer for Windows users
- [ ] **NixOS / Nix Flake** - Reproducible Nix package for NixOS and `nix profile install`

### Low Priority

- [ ] **Mobile Companion App** - Remote control playback from a mobile device
- [ ] **Alfred/Raycast Extension** - macOS launcher integration for quick search and playback
- [ ] **tmux Status Line** - Show currently playing track in the tmux status bar
- [ ] **GitHub Actions Release Pipeline** - Automated cross-platform binary builds on tag push

## 🐛 Known Issues to Fix

- [ ] Occasional audio stream interruption on slow connections
- [ ] Search results sometimes don't include all available tracks
- [ ] Theme colors may not render correctly on some terminal emulators
- [ ] Volume control precision varies by audio backend

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
