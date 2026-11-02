---
layout: default
title: Configuration
---

# Configuration

youtube-music-cli stores its configuration in `~/.youtube-music-cli/config.json`.

## Configuration File

```json
{
	"theme": "dark",
	"volume": 70,
	"shuffle": false,
	"repeat": "off",
	"streamQuality": "high",
	"gaplessPlayback": true,
	"crossfadeDuration": 0,
	"equalizerPreset": "flat",
	"downloadsEnabled": false,
	"downloadDirectory": "D:/Music/youtube-music-cli",
	"downloadFormat": "mp3"
}
```

## Options

### theme

The visual theme for the TUI.

| Value      | Description                  |
| ---------- | ---------------------------- |
| `dark`     | Dark theme (default)         |
| `light`    | Light theme                  |
| `midnight` | Deep blue theme              |
| `matrix`   | Green on black, Matrix-style |

**CLI flag:** `--theme` or `-t`

```bash
youtube-music-cli --theme=matrix
```

### volume

Initial playback volume (0-100).

**Default:** `70`

**CLI flag:** `--volume` or `-v`

```bash
youtube-music-cli --volume=80
```

### shuffle

Enable shuffle mode on startup.

**Default:** `false`

**CLI flag:** `--shuffle` or `-s`

```bash
youtube-music-cli --shuffle
```

### repeat

Repeat mode on startup.

| Value | Description          |
| ----- | -------------------- |
| `off` | No repeat (default)  |
| `all` | Repeat entire queue  |
| `one` | Repeat current track |

**CLI flag:** `--repeat` or `-r`

```bash
youtube-music-cli --repeat=all
```

### streamQuality

Audio streaming quality.

| Value    | Bitrate   | Description            |
| -------- | --------- | ---------------------- |
| `low`    | ~64kbps   | Save bandwidth         |
| `medium` | ~128kbps  | Balanced               |
| `high`   | ~256kbps+ | Best quality (default) |

**Note:** Change via Settings menu (`,` key) in the TUI.

### gaplessPlayback

Enable or disable mpv's gapless audio flag. When turned on (default), mpv will avoid inserting silence between tracks when possible.

**Default:** `true`

### crossfadeDuration

Sets the duration in seconds used for mpv's acrossfade filter between tracks. The Settings menu cycles through Off (0s), 1s, 2s, 3s, and 5s values.

**Default:** `0`

### equalizerPreset

Selects a preconfigured mpv equalizer stack (`flat`, `bass_boost`, `vocal`, `bright`, `warm`). The menu cycles through the presets so you can tailor tonal balance.

**Default:** `flat`

### mpvExtraArgs

Optional space-separated mpv CLI flags appended on spawn (quotes supported). Use this when your `mpv.conf` interferes or you need flags like `--no-config`. YMC already sets `--no-video`, `--force-window=no`, and `--speed`.

**Default:** unset

**Example:** `"--no-config"`

Flags that would break IPC (`--input-ipc-server`, disabling idle) are stripped. Changes apply on the next track spawn. Not available via the web companion.

## Search Filters (TUI)

Use the Search view's filter shortcuts to narrow down results:

- `Ctrl+A`: Set an artist name fragment to match against artist/track metadata.
- `Ctrl+L`: Set an album filter that matches album or playlist titles.
- `Ctrl+Y`: Supply a year or numeric fragment that will be matched against track/album/playlist names.
- `Ctrl+D`: Cycle through duration buckets (`Any`, `short <3m`, `medium 3-5m`, `long >5m`).

Filters are applied client-side and will immediately update the results list without re-running the API search.

### downloadsEnabled

Enable or disable `Shift+D` downloads in the TUI.

**Default:** `false`

### downloadDirectory

Base folder where downloaded files are saved.

Downloaded files are organized as:

`<downloadDirectory>/<artist>/<album>/<title>.<ext>`

**Default:** `<configDir>/downloads`

### downloadFormat

Output format for downloads.

| Value | Description         |
| ----- | ------------------- |
| `mp3` | MP3 with ID3 tags   |
| `m4a` | AAC/M4A tagged file |

**Default:** `mp3`

## Config Directory Structure

```
~/.youtube-music-cli/
├── config.json           # Main configuration
├── favorites.json        # Favorite tracks collection
├── playlists.json        # Synced YouTube Music playlists
├── downloads/            # Default download folder
├── plugins/              # Installed plugins
│   ├── adblock/
│   └── lyrics/
└── plugin-permissions.json  # Plugin permissions
```

## Environment Variables

| Variable                   | Description                      |
| -------------------------- | -------------------------------- |
| `YOUTUBE_MUSIC_CLI_CONFIG` | Override config directory        |
| `DEBUG`                    | Enable debug logging (`DEBUG=*`) |

## Authentication

youtube-music-cli supports two authentication methods:

### OAuth2 Device Flow (default)

The standard sign-in flow. Run `ymc login` and follow the device code prompt.

### Cookie-based Auth (fallback)

When OAuth2 is blocked, you can authenticate using a YouTube Music cookies file:

```bash
# From a cookies.txt export
ymc login --cookies-file "/path/to/cookies.txt"

# Extract directly from a browser
ymc login --cookies-from-browser edge
# or chrome, brave, firefox
```

On Windows, browser cookie extraction uses a Python `sqlite3` fallback because browsers lock the SQLite database. If this fails, close the browser and retry, or use `--cookies-file` with an exported `cookies.txt`.

Cookies are parsed locally and passed to the YouTube Music API client; they are never sent to any server other than YouTube Music.

## Playlist Sync

Sync YouTube Music playlists to your local config for offline access within the CLI:

```bash
# Sync a playlist by ID or URL
ymc sync VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP
ymc sync "https://music.youtube.com/playlist?list=VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP"

# Search playlists
ymc sync search "lofi"

# List saved playlists
ymc sync list
```

Synced playlists are stored in `~/.youtube-music-cli/config.json` under a `playlists` array. Each entry contains the playlist ID, name, and track list. Sync requires an authenticated YouTube Music session (see Authentication above).

## Resetting Configuration

Delete the config file to reset to defaults:

```bash
rm ~/.youtube-music-cli/config.json
```

## Editing Configuration

You can edit `config.json` directly while youtube-music-cli is not running, or use the Settings menu (`,` key) in the TUI.

## Download Metadata

Downloaded files include metadata tags when available:

- `title`
- `artist`
- `album`
- cover art (thumbnail) when available
