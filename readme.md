<div align="center">

# 🎵 youtube-music-cli

A powerful Terminal User Interface (TUI) music player for YouTube Music

<p align="center">
  <img src="assets/player-preview.gif" alt="youtube-music-cli terminal preview" width="800">
</p>

[![npm version](https://img.shields.io/npm/v/@involvex/youtube-music-cli.svg)](https://www.npmjs.com/package/@involvex/youtube-music-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Plugins](#plugins) • [Documentation](https://involvex.github.io/youtube-music-cli)

</div>

---

## Features

- 🎨 **Beautiful TUI** - Rich terminal interface built with React and Ink
- 🔍 **Search** - Find songs, albums, artists, and playlists
- 📋 **Queue Management** - Build and manage your playback queue
- ❤️ **Favorites** - Mark tracks as favorites with `f` and view them with `Shift+F`
- 🔀 **Shuffle & Repeat** - Multiple playback modes
- 🎚️ **Volume Control** - Fine-grained volume adjustment
- 💡 **Smart Suggestions** - Discover related tracks
- 🎨 **Themes** - Dark, Light, Midnight, Matrix themes
- 🔌 **Plugin System** - Extend functionality with plugins
- ⌨️ **Keyboard-Driven** - Efficient vim-style navigation
- 🖥️ **Immersive Mode** - Fullscreen Windows TUI with audio visualizer and disco effects
- 🌐 **Web Companion** - Browser UI with synced playback controls (`--web`); included in every production build
- 🔗 **Playlist Sync** - Sync YouTube Music playlists to local config with `ymc sync`; search and list saved playlists
- 💾 **Downloads** - Save tracks/playlists/artists with `Shift+D`
- 📊 **Listening Stats** - Press `o` for totals, top tracks/artists, streaks; share with `S` / `E` or `ymc stats --share`
- 🏷️ **Metadata Tagging** - Auto-tag title/artist/album with optional cover art
- ⚡️ **Shell Completions** - `ymc completions <bash|zsh|powershell|fish>` emits scripts you can source or save so the CLI (also available as `ymc`) tab-completes subcommands and flags

## Support the Project

If you find youtube-music-cli useful, consider supporting its development:

- ☕ [Buy Me a Coffee](https://buymeacoffee.com/involvex)
- 🪙 [PayPal](https://paypal.me/involvex)
- ⌨️ [GitHub Sponsors](https://github.com/sponsors/involvex?sponsor=1)

Your support helps keep this project alive and improving!

## Roadmap

**0.1.0** is out — [celebratory notes](docs/releases/v0.1.0.md). Visit [`SUGGESTIONS.md`](SUGGESTIONS.md) for the backlog and [`docs/roadmap.md`](docs/roadmap.md) for post-0.1.0 focus (hardening, discovery, offline, web v1.1).

## What's new in 0.1.0

- Bundled **web companion** (`--web` / `--web-only`) — no extra build step
- Live streams + radio, Win32 immersive, and playback reliability fixes from the 0.0.x centennial era
- Full highlight reel: [`docs/releases/v0.1.0.md`](docs/releases/v0.1.0.md)

## Prerequisites

**Required:**

- [mpv](https://mpv.io/) - Media player for audio playback
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube audio extraction

### Installing Prerequisites

<details>
<summary><b>Windows</b></summary>

```bash
# With Scoop
scoop install mpv yt-dlp

# With Chocolatey
choco install mpv yt-dlp
```

</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install mpv yt-dlp
```

</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Ubuntu/Debian
sudo apt install mpv
pip install yt-dlp

# Arch Linux
sudo pacman -S mpv yt-dlp

# Fedora
sudo dnf install mpv yt-dlp
```

</details>

## Installation

### Install Script (standalone binary — no Node/Bun required)

Downloads the latest GitHub Release binary into `~/.local/bin` (Windows: `%USERPROFILE%\.local\bin`). Falls back to bun/npm if the download fails. Use `--from-npm` to skip the binary and install from the registry.

```bash
curl -fsSL https://raw.githubusercontent.com/involvex/youtube-music-cli/main/scripts/install.sh | bash
```

```powershell
iwr https://raw.githubusercontent.com/involvex/youtube-music-cli/main/scripts/install.ps1 | iex
```

### GitHub Releases

Manual download: https://github.com/involvex/youtube-music-cli/releases

Release assets (prefer the platform-specific name; install scripts fall back to legacy names):

| Platform            | Asset                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Windows x64         | `youtube-music-cli-windows-x64.exe` (legacy: `youtube-music-cli.exe`) |
| Linux x64           | `youtube-music-cli-linux-x64` (legacy: `youtube-music-cli`)           |
| macOS Apple Silicon | `youtube-music-cli-darwin-arm64`                                      |
| macOS Intel         | `youtube-music-cli-darwin-x64`                                        |

Immersive Win32 build (`ymc-win32.exe`) is separate (`bun run build:win32`) and is not the default install-script binary.

> **Note for Linux packagers:** The compiled binaries are produced by `bun build --compile` and **must not be stripped** (e.g., `strip`, `dh_strip`, pacman's automatic stripping). The `strip` command removes embedded JS/TS code, not just debug symbols, causing the binary to fall back to the raw Bun runtime. For Arch Linux, use `options=('!strip')` in your `PKGBUILD`. For Nix, use `stdenvNoCC.mkDerivation` or set `dontStrip = true`. For dpkg/RPM, exclude the binary from the strip phase. The npm package (`@involvex/youtube-music-cli`) does not have this limitation.

### Package managers (bun / npm)

```bash
bun install -g @involvex/youtube-music-cli
# or
npm install -g @involvex/youtube-music-cli
```

### Homebrew

```bash
brew tap involvex/youtube-music-cli https://github.com/involvex/youtube-music-cli.git
brew install youtube-music-cli
```

### Scoop (Windows)

```powershell
scoop bucket add ymc https://github.com/involvex/scoop-ymc
scoop install youtube-music-cli
```

This installs both `youtube-music-cli` and `ymc` commands.

### From Source

```bash
git clone https://github.com/involvex/youtube-music-cli.git
cd youtube-music-cli

# With bun (recommended for development)
bun install
bun run build
bun link

# With npm
npm install
npm run build
npm link
```

## Usage

### Interactive Mode

Launch the TUI:

```bash
youtube-music-cli
```

### CLI Commands

```bash
# Play a specific track
youtube-music-cli play <video-id|youtube-url>

# Search for music
youtube-music-cli search "artist or song name"

# Play a playlist
youtube-music-cli playlist <playlist-id>

# Get suggestions based on current track
youtube-music-cli suggestions

# Playback control
youtube-music-cli pause
youtube-music-cli resume
youtube-music-cli skip
youtube-music-cli back

# Sync a YouTube Music playlist to local config
ymc sync <playlist-id|ytm-url>

# Search your synced playlists
ymc sync search "query"

# List your synced playlists
ymc sync list
```

### Authentication

Authenticate with your YouTube Music account to access personalized features (library, playlists, and ad-free playback for Premium users) via the OAuth2 Device Flow or cookie-based auth:

```bash
# Sign in (displays device code and verification URL)
ymc login

# Sign in with a cookies.txt file (useful if OAuth2 is blocked)
ymc login --cookies-file "/path/to/cookies.txt"

# Sign in by extracting cookies from a browser
ymc login --cookies-from-browser edge

# Check current account status
ymc whoami

# Sign out and remove stored credentials
ymc logout
```

**Cookie-based auth** is a fallback for when OAuth2 Device Flow is blocked by YouTube. You can either pass a `cookies.txt` file exported from your browser, or let the CLI extract cookies automatically from Chrome, Edge, Brave, or Firefox. On Windows, browser cookie extraction uses a Python fallback because browsers lock the SQLite database; if you hit that limitation, use `--cookies-file` instead (export from `edge://settings/cookies` or a browser extension).

**Security & Credential Storage:**

- Credentials are stored securely in `~/.youtube-music-cli/credentials.json` with strict file permissions (`0600` on Unix-like systems) so only the owner can read/write them.
- You can also navigate to the **Account** section in the settings view (`Settings → Account`) inside the TUI or immersive mode to view status or sign out.

Launch a fullscreen visual player with real playback, queue controls, and audio visualization. Requires `mpv` and `yt-dlp` (same as normal playback).

```bash
# Standard immersive mode
youtube-music-cli --win32

# Search and play immediately
youtube-music-cli --win32 --search "artist song"

# With disco mode enabled
DISCO_MODE=true youtube-music-cli --win32

# Standalone Windows binary (Bun compile)
bun run build:win32
dist/ymc-win32.exe
```

### Web Companion UI

Every production build (`bun run build`) includes the browser companion at `dist/web/`. No separate `build:web` step is required for users.

```bash
# TUI + web UI (default http://localhost:8080)
youtube-music-cli --web

# Web UI only (no terminal interface)
youtube-music-cli --web-only

# Custom host/port and optional auth token
youtube-music-cli --web --web-host 0.0.0.0 --web-port 3000 --web-auth secret
```

Open the printed URL in a browser for synced playback controls, queue, search, volume, shuffle/repeat/autoplay, and dark/light theme. State stays in sync with the CLI over WebSocket (`/ws`).

**Hotkeys in Immersive Mode:**

| Key        | Action                                       |
| ---------- | -------------------------------------------- |
| `/` or `S` | Open search overlay                          |
| `Tab`      | Cycle search type (query view)               |
| `Ctrl+A`   | Edit artist filter                           |
| `Ctrl+L`   | Edit album filter                            |
| `=` / `+`  | Volume up (+5%, player view)                 |
| `-`        | Volume down (-5%, player view)               |
| `+`        | Increase search result limit (query view)    |
| `-`        | Decrease search result limit (query view)    |
| `Shift+D`  | Download selected search result              |
| `Space`    | Play / Pause                                 |
| `F`        | Toggle favorite (current track or search)    |
| `L`        | Library menu (playlists, favorites)          |
| `P`        | Open saved playlist picker                   |
| `E`        | Play all favorites                           |
| `Shift+S`  | Toggle shuffle                               |
| `R`        | Cycle repeat (off → all → one)               |
| `,`        | Open settings overlay (Ctrl+, on WT also)    |
| `M`        | Create mix from search result (results view) |
| `D`        | Toggle disco mode                            |
| `↑` / `↓`  | Navigate lists (overlays)                    |
| `←` / `→`  | Previous / Next track                        |
| `Enter`    | Select / play (overlays)                     |
| `Esc`      | Back / close overlay                         |
| `Q`        | Quit immersive mode                          |
| `Ctrl+C`   | Force quit                                   |

The footer shows shuffle/repeat/disco status on one line and prioritized shortcuts on the next. Random favorite is available from the library menu (`L`). Right-click the system tray icon for **Settings** or **Exit** (uses `assets/icon.ico`).

Global media keys (Alt+Media keys) also work when the terminal is unfocused on Windows with Bun runtime.

**Troubleshooting immersive playback**

- **Track info shows but time does not move / no audio:** Press `Space` to resume. Immersive auto-starts the last session; if mpv was paused externally (screen share, focus loss), the UI now syncs to `PAUSED` — press `Space` again.
- **Screen sharing (Discord, Teams, OBS):** Remote viewers often do not hear your PC audio unless you enable “share computer sound” / system audio capture. That is a Windows capture limitation, not the player routing audio only to you.
- **Requires Bun for Win32 native features:** Global hotkeys and native console title use `@bun-win32/*` via Bun. Run with `bun run dev:win32` or the compiled `ymc-win32.exe` binary.

### Shell completions

Generate shell completion helpers through the lightweight `ymc` alias that ships with the CLI. Run `ymc completions <bash|zsh|powershell|fish>` to print the completion script for your shell, then source it or persist it in your profile:

```bash
# Bash
source <(ymc completions bash)
ymc completions bash >> ~/.bash_completion

# Zsh
source <(ymc completions zsh)

# PowerShell
ymc completions powershell | Out-File -Encoding utf8 $PROFILE
Invoke-Expression (ymc completions powershell)

# Fish
ymc completions fish > ~/.config/fish/completions/ymc.fish
```

If you installed the CLI globally with an alias or script name, make sure `ymc` points at the same binary before generating completions so that the script matches your install path.

### Options

| Flag         | Short | Description                                  |
| ------------ | ----- | -------------------------------------------- |
| `--theme`    | `-t`  | Theme: `dark`, `light`, `midnight`, `matrix` |
| `--volume`   | `-v`  | Initial volume (0-100)                       |
| `--shuffle`  | `-s`  | Enable shuffle mode                          |
| `--repeat`   | `-r`  | Repeat mode: `off`, `all`, `one`             |
| `--headless` |       | Run without TUI                              |
| `--web`      |       | Enable web companion UI (bundled in build)   |
| `--web-only` |       | Web UI only (no TUI)                         |
| `--web-host` |       | Web server host (default: `localhost`)       |
| `--web-port` |       | Web server port (default: `8080`)            |
| `--web-auth` |       | Optional auth token for the web server       |
| `--win32`    |       | Immersive fullscreen mode (Windows only)     |
| `--help`     | `-h`  | Show help                                    |

### Examples

```bash
# Launch with matrix theme at 80% volume
youtube-music-cli --theme=matrix --volume=80

# Search and play in headless mode
youtube-music-cli search "lofi beats" --headless

# Play with shuffle enabled
youtube-music-cli play dQw4w9WgXcQ --shuffle
```

## Keyboard Shortcuts

### Global

| Key       | Action          |
| --------- | --------------- |
| `?`       | Show help       |
| `/`       | Search          |
| `p`       | Plugins manager |
| `Shift+F` | Favorites view  |
| `o`       | Listening stats |
| `g`       | Suggestions     |
| `,`       | Settings        |
| `Esc`     | Go back         |
| `q`       | Quit            |

### Playback

| Key       | Action            |
| --------- | ----------------- |
| `Space`   | Play / Pause      |
| `n` / `→` | Next track        |
| `b` / `←` | Previous track    |
| `Shift+→` | Seek forward 10s  |
| `Shift+←` | Seek backward 10s |
| `=`       | Volume up         |
| `-`       | Volume down       |
| `f`       | Toggle favorite   |
| `s`       | Toggle shuffle    |
| `r`       | Cycle repeat mode |

### Navigation

| Key       | Action    |
| --------- | --------- |
| `↑` / `k` | Move up   |
| `↓` / `j` | Move down |
| `Enter`   | Select    |
| `Esc`     | Back      |

### Downloads

| Key       | Action                                                  |
| --------- | ------------------------------------------------------- |
| `Shift+D` | Download selected song/artist/playlist or playlist view |

## Plugins

Extend youtube-music-cli with plugins!

### Managing Plugins

**TUI Mode:** Press `p` to open the plugins manager.

**CLI Mode:**

```bash
# List installed plugins
youtube-music-cli plugins list

# Install from default repository
youtube-music-cli plugins install adblock

# Install from GitHub URL
youtube-music-cli plugins install https://github.com/user/my-plugin

# Enable/disable
youtube-music-cli plugins enable my-plugin
youtube-music-cli plugins disable my-plugin

# Update
youtube-music-cli plugins update my-plugin

# Remove
youtube-music-cli plugins remove my-plugin
```

### Available Plugins

| Plugin          | Description                             |
| --------------- | --------------------------------------- |
| `adblock`       | Block ads and sponsored content         |
| `lyrics`        | Display synchronized lyrics             |
| `scrobbler`     | Scrobble to Last.fm                     |
| `discord-rpc`   | Discord Rich Presence integration       |
| `notifications` | Desktop notifications for track changes |

### Developing Plugins

See [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) and [Plugin API Reference](docs/PLUGIN_API.md).

```bash
# Start from a template
cp -r templates/plugin-basic my-plugin
cd my-plugin

# Edit plugin.json and index.ts
# Install for testing
youtube-music-cli plugins install /path/to/my-plugin
```

## Configuration

Config is stored in `~/.youtube-music-cli/config.json`:

```json
{
	"theme": "dark",
	"volume": 70,
	"shuffle": false,
	"repeat": "off",
	"streamQuality": "high",
	"downloadsEnabled": false,
	"downloadDirectory": "D:/Music/youtube-music-cli",
	"downloadFormat": "mp3"
}
```

### Stream Quality

| Quality  | Description             |
| -------- | ----------------------- |
| `low`    | 64kbps - Save bandwidth |
| `medium` | 128kbps - Balanced      |
| `high`   | 256kbps+ - Best quality |

### Download Settings

- Enable/disable downloads in **Settings** (`,`).
- Set your download directory in **Settings → Download Folder**.
- Choose format in **Settings → Download Format** (`mp3` or `m4a`).
- Downloads are saved as:
  - `<downloadDirectory>/<artist>/<album>/<title> [<videoId>].mp3` (or `.m4a`)
- MP3/M4A files are tagged with metadata (`title`, `artist`, `album`) and include cover art when available.
- When a track is available on disk, playback prefers the local file (`preferLocalPlayback`, default `true`; Settings toggle). An index is kept at `~/.youtube-music-cli/downloads-index.json`. Legacy title-only filenames are still detected.

## Troubleshooting

### mpv not found

Ensure mpv is installed and in your PATH:

```bash
mpv --version
```

On startup, the CLI now checks for `mpv` and `yt-dlp`. In interactive terminals it can prompt to run an install command automatically (with explicit confirmation first).

### No audio

1. Check volume isn't muted (`=` to increase)
2. Verify yt-dlp is working: `yt-dlp --version`
3. Try a different track

### TUI rendering issues

If rendering looks wrong, try resizing your terminal window or restarting the app.

### Plugin not loading

1. Check `plugin.json` syntax is valid
2. Verify the plugin is enabled: `youtube-music-cli plugins list`
3. Check logs for errors

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `bun run test`
5. Commit: `git commit -m 'feat: add my feature'`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

### Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build
bun run build

# Lint and format
bun run lint:fix
bun run format

# Type check
bun run typecheck
```

## Tech Stack

- **Runtime:** Node.js 18+ / [Bun](https://bun.sh/)
- **UI Framework:** [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- **Language:** TypeScript
- **Audio:** mpv + yt-dlp
- **API:** YouTube Music Innertube API

## License

MIT © [Involvex](https://github.com/involvex)

---

<div align="center">

**[Documentation](https://involvex.github.io/youtube-music-cli)** • **[Report Bug](https://github.com/involvex/youtube-music-cli/issues)** • **[Request Feature](https://github.com/involvex/youtube-music-cli/issues)**

Made with ❤️ for music lovers

</div>
