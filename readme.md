<div align="center">

# 🎵 youtube-music-cli

A powerful Terminal User Interface (TUI) music player for YouTube Music

[![npm version](https://img.shields.io/npm/v/@involvex/youtube-music-cli.svg)](https://www.npmjs.com/package/@involvex/youtube-music-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Plugins](#plugins) • [Documentation](https://involvex.github.io/youtube-music-cli)

</div>

---

## Features

- 🎨 **Beautiful TUI** - Rich terminal interface built with React and Ink
- 🔍 **Search** - Find songs, albums, artists, and playlists
- 📋 **Queue Management** - Build and manage your playback queue
- 🔀 **Shuffle & Repeat** - Multiple playback modes
- 🎚️ **Volume Control** - Fine-grained volume adjustment
- 💡 **Smart Suggestions** - Discover related tracks
- 🎨 **Themes** - Dark, Light, Midnight, Matrix themes
- 🔌 **Plugin System** - Extend functionality with plugins
- ⌨️ **Keyboard-Driven** - Efficient vim-style navigation
- 🖥️ **Headless Mode** - Run without TUI for scripting
- 💾 **Downloads** - Save tracks/playlists/artists with `Shift+D`
- 🏷️ **Metadata Tagging** - Auto-tag title/artist/album with optional cover art

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

### npm (Recommended)

```bash
npm install -g @involvex/youtube-music-cli
```

### Bun

```bash
bun install -g @involvex/youtube-music-cli
```

### Homebrew

```bash
brew install involvex/youtube-music-cli/youtube-music-cli
```

### GitHub Releases

```bash
https://github.com/involvex/youtube-music-cli/releases
```

### Install Script (bash)

```bash
curl -fssl https://raw.githubusercontent.com/involvex/youtube-music-cli/main/scripts/install.sh | bash
```

### Install Script (PowerShell)

```powershell
iwr https://raw.githubusercontent.com/involvex/youtube-music-cli/main/scripts/install.ps1 | iex
```

### From Source

```bash
git clone https://github.com/involvex/youtube-music-cli.git
cd youtube-music-cli
bun install
bun run build
bun link
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
```

### Options

| Flag         | Short | Description                                  |
| ------------ | ----- | -------------------------------------------- |
| `--theme`    | `-t`  | Theme: `dark`, `light`, `midnight`, `matrix` |
| `--volume`   | `-v`  | Initial volume (0-100)                       |
| `--shuffle`  | `-s`  | Enable shuffle mode                          |
| `--repeat`   | `-r`  | Repeat mode: `off`, `all`, `one`             |
| `--headless` |       | Run without TUI                              |
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

| Key   | Action          |
| ----- | --------------- |
| `?`   | Show help       |
| `/`   | Search          |
| `p`   | Plugins manager |
| `g`   | Suggestions     |
| `,`   | Settings        |
| `Esc` | Go back         |
| `q`   | Quit            |

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
  - `<downloadDirectory>/<artist>/<album>/<title>.mp3` (or `.m4a`)
- MP3/M4A files are tagged with metadata (`title`, `artist`, `album`) and include cover art when available.

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

- **Runtime:** [Bun](https://bun.sh/) / Node.js
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

## Supporting

**[☕ Buymeacoffee](https://buymeacoffee.com/involvex)**

**[🪙 Paypal](https://paypal.me/involvex)**

**[⌨️ Github Sponsors](https://github.com/sponsors/involvex)**
