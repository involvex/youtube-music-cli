# Feature Suggestions & Improvements

This document tracks potential features, enhancements, and improvements for youtube-music-cli.

## 🎵 Playback Features

### High Priority

- Implemented **Gapless Playback** - Seamless transitions between tracks without audio gaps
- Implemented **Crossfade Support** - Smooth audio crossfading between songs (configurable duration)
- Implemented **Equalizer** - Built-in audio equalizer with preset profiles (Bass Boost, Vocal, Bright, Warm, Flat)
- Implemented **Listening Stats Dashboard** - Stats view showing top tracks, top artists, listening time, streaks, and 14-day timeline (Shift+S)
- Implemented **Volume Fade In/Out** - Gradually fade volume at track start and end for smooth transitions
- Implemented **A/B Loop** - Mark two points in a track and loop between them (practice/review mode)
- Implemented **Audio Normalization** - Optional ffmpeg dynaudnorm loudness normalization filter
- Implemented **Playback Speed Control** - Adjustable speed from 0.25x to 4.0x
- Implemented **Background Playback / Detach** - Continue audio playback after CLI exit; restore with --continue
- Implemented **Playback Stall Watchdog** - Reconnect on IPC drop, EOF pause suppression, advance debounce, 15s transition grace
- Implemented **Autoplay Coordinator** - Seed planning, deduplication, retry logic, explicit queue length, session history dedup

### Medium Priority

- Implemented **Mini Player Mode** - Compact single-line player for use alongside other terminal work
- Planned **Multiple Audio Backends** - Support VLC and ffplay as alternatives to mpv
- Planned **Configurable Audio Output Device** - Select audio output device (useful for DACs, multi-monitor setups)
- Partial **Track Seek Bar** - Display-only progress bar in TUI; interactive seek in web companion
- **Implemented Offline Mode** - Full offline mode with network status indicator (⚠️ Online/📡 Offline in header), Shift+O offline queue UI, local track detection, offline queue management, periodic network health checks (30s), seamless fallback to local files when network is unavailable, and download shortcuts (D/Shift+D in Favorites, Search, Playlists)
- Planned **YouTube Video Support** - Play regular YouTube videos (not just music content)
- Suggested **Smart Shuffle** - Similarity-aware shuffle that groups related songs instead of pure random
- Planned **Resume Playback Position** - Remember per-track playback position so long tracks resume where you left off

### Low Priority

- Planned **Podcast Support** - Play YouTube podcasts with chapter markers and bookmarking
- Planned **Pipe/Audio Output Routing** - Route audio to specific output devices per-track or per-playlist
- Suggested **ReplayGain Support** - Use ReplayGain metadata for consistent perceived loudness across tracks
- Suggested **Per-Track Crossfade** - Override global crossfade duration per track or playlist
- Implemented **Sleep Timer Fade-Out** - Volume ramps to zero over ~30s before pausing when the sleep timer expires, then restores the prior volume

## 🔍 Discovery & Search

### High Priority

- Implemented **Advanced Search Filters** - Filter by artist, album, year, and duration
- Implemented **Search History** - Recent search queries with selection
- Implemented **Suggestions** - Related track suggestions based on currently playing track
- Implemented **Mix from Track** - Create a queue of similar tracks from any result (M key, createMixFromResult)
- Implemented **Similar Artists** - Discover similar tracks via mix creation from artist/track results
- Implemented **Smart Recommendations** - History/stats-scored candidate sorting and artist diversity capping powering the Suggestions view and AI discovery
- Implemented **Genre Browsing** - Browse music by genre or mood
- Implemented **New Releases** - Dedicated view for newly released music
- Implemented **Trending** - Dedicated view for trending music
- Implemented **Search Result Cache** - LRU cache with configurable TTL for search API responses
- Implemented **Mood-Based Radio** - Predefined mood presets (relaxing, energetic, focus, chill, workout, sleep, party, melancholy) that seed radio playback via the existing RadioService + getSuggestions pipeline
- Implemented **AI Playlist Generation** - A generate_playlist LLM tool that takes a natural-language description, searches for matching tracks, and queues or creates a playlist

### Medium Priority

- Implemented **Playlist Radio Mode** - Press m on any saved playlist for endless radio: shuffled playlist queue first, then autoplay extends with related tracks; immersive-style extension continues via fetchMoreTracks anchoring on playlist tracks
- Implemented **Radio Browser** - Browse internet radio stations via radio-browser.service.ts
- Implemented **Live Streams Catalog** - Curated yt-dlp/mpv live stream catalog (source/data/builtin-live-streams.ts)
- Suggested **Discovery Queue** - Personalized queue of new tracks/artists based on listening habits
- Suggested **Artist/Album Radio** - One-key radio from any artist or album page

## 📋 Playlist Management

### High Priority

- Implemented **Favorites** - Persistence for favorite tracks, toggle with f, view with Shift+F
- Implemented **Listening History** - Track recently played songs with history store + history service
- Implemented **Playlist Creation & Management** - Create, edit, and delete playlists within the TUI
- Implemented **Playlist Import** - Import playlists from Spotify and YouTube
- Implemented **Playlist Export** - Export playlists to JSON and M3U8 formats
- Planned **Playlist Sync** - Two-way sync with YouTube Music account playlists
- Planned **Smart Playlists** - Auto-generated playlists based on listening history and habits

### Medium Priority

- Planned **Collaborative Playlists** - Share playlists with others via a shareable link or file
- Planned **Playlist Folders** - Organize playlists into named folders/groups
- Implemented **Duplicate Detection** - Warn when adding a track that already exists in a playlist (force-override available)
- Planned **Queue Snapshots** - Save and restore the current queue as a named snapshot
- Planned **Playlist Statistics** - Show stats per playlist (total duration, top artists, play counts)
- Planned **Track Bookmarks** - Bookmark a timestamp within a track to return to it later
- Planned **Queue Drag-Reorder** - Reorder queue items using keyboard navigation
- Suggested **Playlist Artwork** - Custom cover art per playlist
- Suggested **Batch Operations** - Bulk favorite, delete, and add-to-playlist from search results
- Suggested **Queue Import/Export** - Export current queue as a playlist file or import saved queues
- Planned **Apple Music Import** - Import playlists from Apple Music (extends the Spotify/YouTube import family)

## 🎨 User Interface

### High Priority

- Implemented **Visualizer** (immersive only) - Audio visualizer rendered in the immersive Windows mode (source/immersive/visualizer/)
- Planned **Album Art** - Display album artwork using terminal graphics protocols (sixel, kitty)
- Planned **Split View** - Side-by-side panels for queue and search results

### Medium Priority

- Implemented **More Themes** - 8 built-in themes (Dark, Light, Midnight, Matrix, Dracula, Nord, Solarized, Catppuccin) plus custom theme support
- Implemented **Responsive Terminal Layout** - Adapts to terminal width with reduced padding on narrow terminals
- Implemented **Karaoke Lyrics View** - Active lyric line rendered as a smooth per-character color gradient sweep with theme-aware karaoke colors (sung/peak/upcoming hex triples per theme), interpolated progress clock, and terminal-height-aware window sizing
- Implemented **Visual Shortcuts Bar** - Context-sensitive shortcut hints at bottom of screen
- Planned **Mouse Support** - Click and scroll interactions for modern terminal emulators
- Planned **Waveform Progress Bar** - Replace the plain progress bar with an ASCII waveform representation
- Planned **Configurable Layout** - User-adjustable panel sizes and component arrangement
- Implemented **Terminal Title Integration** - TUI sets window title with track/artist/playback state; web companion sets document.title; immersive uses native title
- Suggested **TUI Audio Visualizer** - ASCII/blessed audio visualizer for the Ink TUI (in addition to immersive)
- Suggested **Spectrum Analyzer** - Real-time frequency spectrum display in immersive mode

### Low Priority

- Implemented **Startup Screen** - Branded boot screen with YMC ASCII art and sponsor line on launch (TUI + immersive)

## 🖥️ Immersive Windows Mode

### High Priority

- Implemented **Immersive Engine** - Full native Win32 rendering via @bun-win32/user32 + @bun-win32/kernel32
- Implemented **Settings Overlay** - 28-row settings panel mirroring Ink TUI (IMMERSIVE_SETTINGS_COUNT)
- Implemented **Search Overlay** - Full search UI with type filters and result limits
- Implemented **Library Overlays** - Favorites, saved playlists, queue/history
- Implemented **Radio Overlays** - Radio Browser search, live streams, mood radio
- Implemented **Windows Tray Icon** - Right-click menu with Settings and Exit
- Implemented **Global Hotkeys** - Play/pause, next, previous, volume (=/+/−)
- Implemented **Track Change Toast** - Desktop notifications on track change
- Implemented **Disco Mode** - Audio visualizer mode with multiple effects

### Medium Priority

- Implemented **Queue Management** - Full queue UI with UP NEXT preview
- Implemented **Shuffle/Repeat/Autoplay** - Complete playback order controls
- Implemented **Download Support** - Download from search results with progress
- Suggested **Immersive Lyrics** - Synchronized lyrics overlay in immersive mode

## 🌐 Web Companion

### High Priority

- Implemented **Web UI** - Full React + Vite companion app (web/ → dist/web/)
- Implemented **WebSocket Sync** - Real-time state sync between TUI backend and web client
- Implemented **Player View** - Now playing, progress bar, transport controls
- Implemented **Search View** - Search with type filter, results with play/queue/favorite actions
- Implemented **Favorites View** - List, toggle, play random
- Implemented **Live View** - Radio browser + live streams
- Implemented **Settings View** - Volume, repeat, shuffle, autoplay
- Implemented **Queue Panel** - Side panel with queue management
- Implemented **Token-based Auth** - WebSocket authentication
- Implemented **CORS Support** - Configurable allowed origins
- Implemented **Media Session API** - System media controls from the web client (lock screen / media keys via navigator.mediaSession, artwork, position state)

### Medium Priority

- Implemented **Interactive Seek** - Click-to-seek progress bar (not available in TUI)
- Suggested **Web Remote Control** - Control TUI playback from phone/tablet browser
- Implemented **Mini-Player Route** - Compact low-footprint /mini browser route for ambient control (open via /mini?mini query, pop-out button; mini.css + MiniPlayerView)

## 📻 Radio Browser & Live Streams

### High Priority

- Implemented **Radio Browser** - Browse internet radio stations by country, language, genre
- Implemented **Live Streams Catalog** - Curated yt-dlp/mpv live stream catalog
- Implemented **Mood Radio** - Predefined mood presets seeding radio playback
- Implemented **Mix from Track** - Create radio-like queue from any track/artist/album

### Medium Priority

- Implemented **Station Favorites** - Save favorite radio stations (persisted to radio-favorites.json, toggle in TUI + immersive)
- Suggested **Station History** - Track recently played radio stations

## 📜 Queue & History

### High Priority

- Implemented **Merged Queue & History** - Combined view (Shift+H) with focus panes for queue and recently played
- Implemented **Queue Persistence** - Queue survives app restart via player-state.json

### Medium Priority

- Implemented **UP NEXT Preview** - Preview upcoming tracks in queue
- Planned **Queue Drag-Reorder** - Reorder queue items using keyboard navigation
- Suggested **Queue Import/Export** - Export queue as playlist file or import saved queues

## 🔌 Integration & Plugins

### High Priority

- Implemented **Plugin System** - Full plugin lifecycle (install, enable, disable, update, remove)
- Implemented **YouTube Music Cookies** - cookiesFromBrowser and cookiesFile settings for yt-dlp bot-check bypass
- Planned **YouTube Music Account Login** - OAuth login for library access, premium streams, personal playlists (#18)
- Partial **Custom mpv Config Passthrough** - Many mpv flags configurable; arbitrary custom mpv flags not exposed
- Implemented **Plugin APIs** - Audio API, navigation API, UI API, permissions, hooks

### Medium Priority

- Implemented **Discord Rich Presence** - Show current track on Discord status (built-in service + plugin)
- Implemented **Last.fm & ListenBrainz Scrobbling** - Scrobble tracks to Last.fm and/or ListenBrainz
- Implemented **Desktop Notifications** - Track change notifications via node-notifier
- Implemented **MPRIS (Linux Media Keys)** - D-Bus media control integration for Linux
- Planned **Windows SMTC Integration** - System Media Transport Controls support mirroring MPRIS on Windows
- Implemented **AI Chat (Gemini)** - Natural language music discovery and playback control via LLM
- Implemented **Synchronized Lyrics** - Word-level karaoke timing via native Musixmatch richsync client (persisted token, captcha retry, cookie handling) with LRCLIB line-synced fallback
- Implemented **Adblock Plugin** - Block ads and sponsored content via audio URL transformation
- Planned **OS Credential Manager Integration** - Store secrets in macOS Keychain, Windows Credential Manager, or libsecret
- Planned **Token Refresh** - Automatically refresh expired YouTube session tokens without requiring re-login
- Partial **Global Keyboard Shortcuts** - Immersive mode has global hotkeys; system-wide media keys on all platforms not implemented
- Planned **tmux Status Line** - Show currently playing track in the tmux status bar
- Planned **MCP Server Mode** - Expose search/playback/queue as Model Context Protocol tools for AI assistants (reuses LLM tool executor)
- Planned **Alfred/Raycast Extension** - macOS launcher integration for quick search and playback
- Suggested **Discord/Telegram Bot** - Control playback and queue from chat apps

### Low Priority

- Partial **Additional Lyrics Sources** - Musixmatch richsync integrated natively (v0.1.5); Netease and other providers still open
- Suggested **Watch Party** - Synchronized listening sessions with friends

## 🔧 Technical Improvements

### High Priority

- Implemented **Shell Completions** - Tab-completion scripts for Bash, Zsh, PowerShell, and Fish
- Implemented **Dependency Checker** - Auto-detect and offer to install mpv/yt-dlp via brew/scoop/choco
- Implemented **Version Check** - Auto-check npm registry for updates once per 24 hours
- Implemented **Streaming Quality** - Configurable audio quality (low/medium/high)
- Implemented **Config Doctor** - Diagnose and fix common configuration issues (youtube-music-cli config doctor [--fix])
- Implemented **mpv IPC Hardening** - Play generation, stale promise invalidation, pipe validation, reconnect on drop
- Implemented **Config Resilience** - Atomic writes with temp file + rename + retry; backup rotation (5 max)
- Implemented **Invidious Health** - Persisted instance health with success/failure counts, latency tracking, 24h discovery TTL
- Planned **Auto-Update Mechanism** - Built-in self-update command (youtube-music-cli update)

### Medium Priority

- Implemented **Web Server Mode** - HTTP+WebSocket server for remote control (--web, --web-only)
- Implemented **Web Server Auth** - Token-based authentication for web server
- Implemented **Config/Settings UI** - Full settings panel in TUI with all configuration options
- Implemented **Custom Keybindings** - Remappable keyboard shortcuts persisted to config
- Implemented **Sleep Timer** - Auto-pause after configurable duration (5/10/15/30/60 min presets) with volume fade-out before pause
- Implemented **Subtitle Support** - MPV subtitle rendering with --slang=en and --sub-scale=1.3
- Implemented **Proxy Support** - HTTP proxy via mpv --http-proxy flag and HTTPS_PROXY env
- Implemented **Debug Logs** - Daily rotating log files (debug-YYYY-MM-DD.log) with 14-day retention and 5 MB mid-session rotation
- Implemented **Search Result Cache** - LRU cache with configurable TTL for API responses
- Implemented **Configurable Cache TTL** - cacheTtlMinutes/cacheMaxEntries settings drive shared search/suggestions caches
- Planned **Multi-instance Sync** - Sync playback state across multiple terminal sessions
- Planned **Battery Saver Mode** - Reduce IPC polling frequency when running on battery power
- Planned **CLI Pipe Mode** - Accept track URLs or IDs via stdin for scripting use cases
- Partial **Better Error Messages** - formatError() / formatErrorData() utilities exist but not universally applied
- Suggested **Performance Profiling** - Built-in performance monitoring and timing tools
- Suggested **CLI Playlist CRUD** - Full playlist management via CLI flags for scripting

### Low Priority

- Planned **Telemetry (Opt-in)** - Anonymous usage statistics to guide future development
- Suggested **Audit Logging** - Structured log of all outbound network requests

## 📥 Downloads & Media

### High Priority

- Implemented **Track Downloads** - Download tracks as MP3 or M4A via ffmpeg with Shift+D
- Implemented **Batch Downloads** - Download multiple tracks from search results in one action (downloadTracks())
- Implemented **Cover Art Embedding** - Auto-embed album artwork in downloaded files
- Implemented **Metadata Tagging** - Auto-tag title, artist, album in downloaded files
- Implemented **Download Organization** - Organize downloads by artist/album directories
- Implemented **Downloads Index** - Persistent downloads-index.json tracks all downloaded files; enables preferLocalPlayback and Local badge

### Medium Priority

- Partial **Download Queue** - Batch download support exists; no dedicated download queue management UI
- Partial **Format Options** - MP3 and M4A supported; FLAC, OGG, OPUS not implemented
- Planned **Download Resume** - Resume interrupted downloads
- Planned **Live Stream Recording** - Record live streams and radio stations to file via the yt-dlp pipeline

### Low Priority

- Suggested **LRC Lyrics Support** - Local synced lyrics files for offline use

## 📱 Platform & Distribution

### High Priority

- Implemented **Homebrew Formula** - Easy installation on macOS via brew install
- Implemented **Windows MSIX Package** - MSIX installer for Windows via bun run msix
- Implemented **Standalone Executable** - Single binary distribution with embedded runtime
- Implemented **GitHub Actions Release Pipeline** - Automated cross-platform binary builds (linux-x64, windows-x64.exe, darwin-x64, darwin-arm64) on tag push, published to GitHub Releases + npm

### Medium Priority

- Planned **AUR Package** - Arch Linux package for yay/paru users
- Planned **Snap/Flatpak** - Linux universal packages for broader distro support
- Planned **NixOS / Nix Flake** - Reproducible Nix package for NixOS and nix profile install

### Low Priority

- Planned **Mobile Companion App** - Remote control playback from a mobile device
- Suggested **Chromecast/AirPlay Output** - Cast audio to smart speakers and TVs

## 🔐 Security & Privacy

### High Priority

### Medium Priority

- Planned **Encrypted Config** - Encrypt stored preferences and session tokens at rest
- Planned **Audit Logging** - Structured log of all outbound network requests

### Low Priority

- Planned **OS Credential Manager Integration** - Store secrets in macOS Keychain, Windows Credential Manager, or libsecret
- Suggested **Privacy Dashboard** - View and manage what data the app stores and shares

## 🐛 Known Issues

- Fixed ~~Pause restarts track from beginning instead of resuming~~ (#24)
- Fixed ~~Race condition in HistoryService/FavoritesService saves~~ (#23) — save mutex + unique temp files; clearer error formatting via formatError
- Fixed ~~mpv stderr errors on some Linux setups~~ (#22)
- Known **Search results sometimes don't include all available tracks** - YouTube API pagination limitations
- Known **Theme colors may not render correctly on some terminal emulators** - Limited 256-color support in some terminals
- Known **Volume control precision varies by audio backend** - mpv volume step granularity
- Known **Immersive mode requires Windows** - --win32 only available on Windows due to @bun-win32 FFI dependencies

## 💡 Community Requested

- **YouTube Music Account Login** (#18) - OAuth login for library access, premium streams, and personal playlists
- **Additional Lyrics Sources** (#9) - LRCLIB line-sync (implemented) + Musixmatch word-level richsync (implemented, v0.1.5); further sources welcome

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

## Status Legend

- **Implemented**: Feature is built and available in the current version
- **Planned**: Feature is proposed but not yet started
- **Open**: Bug is reported and not yet fixed
- **Fixed**: Bug has been resolved
- **Partial**: Feature has some implementation but is not fully complete

## 🛠 Implementation Plan

- **[Stable] Crossfade & gapless playback** - Done. Configurable via settings with mpv --gapless-audio and acrossfade filter.
- **[Stable] Equalizer presets** - Done. Five presets (flat, bass_boost, vocal, bright, warm) applied as mpv audio filters.
- **[Stable] Volume fade in/out** - Done. Configurable fade duration in settings.
- **[Stable] AI Chat** - Done. Gemini-powered natural language music discovery and control.
- **[Stable] Imports & Exports** - Done. Spotify and YouTube playlist import, JSON and M3U8 export.
- **[Stable] Stats Dashboard** - Done. Top tracks/artists, listening time, streaks, 14-day timeline.
- **[Stable] Plugin System** - Done. Full lifecycle management with install, enable, disable, update, remove.
- **[Stable] Web frontend** - Bundled Phosphor Console companion UI (web/ → dist/web/) with WebSocket sync; enabled via --web / --web-only.
- **[Stable] History/Favorites save hardening** - Done. Save mutex, unique temp files (#23), and formatError for user-facing messages.
- **[Stable] Downloads pipeline** - Done. yt-dlp → youtubei → Invidious fallback; batch download; downloads-index.json for local playback preference.
- **[Stable] Immersive visualizer + engine** - Done. Audio-collector + disco-engine + hybrid-visualizer in source/immersive/visualizer/. Full Win32 immersive mode with tray, overlays, global hotkeys.
- **[Stable] Config doctor** - Done. youtube-music-cli config doctor [--fix] diagnoses and repairs configuration.
- **[Stable] mpv IPC hardening** - Done. Play generation, stale promise invalidation, pipe validation, reconnect on drop.
- **[Stable] Invidious health** - Done. Persisted instance health with 24h discovery TTL.
- **[Stable] Karaoke lyrics** - Done. Native Musixmatch richsync + LRCLIB fallback; per-character gradient sweep in the lyrics view (v0.1.5).
- **[Stable] Playlist radio mode** - Done. m on a saved playlist (playlists view) starts shuffled radio; autoplay extends endlessly with related tracks.
- **[Stable] Quick wins batch** - Done. TUI terminal title, configurable cache TTL (cacheTtlMinutes/cacheMaxEntries), sleep-timer fade-out.
- **[Stable] Web v1.1 (Media Session + mini-player)** - Done. `useMediaSession` hook for lock-screen / media keys, `MiniPlayerView` + `/mini` route with compact controls.
- **[Next] Auto-update command** - `ymc update` self-update across install channels (standalone/npm/brew/scoop).
- **[Stable] Smart recommendations** - History & stats scoring with artist diversity capping powering the TUI Suggestions view.
- **[Next] Offline mode** - Cache downloaded tracks for playback without network.
- **[Next] YouTube Music login** - OAuth login for library access and premium features.
