# youtube-music-cli

- A Commandline music player for youtube-music

## Prerequisites

**Required:**

- [mpv](https://mpv.io/) - Media player for audio playback
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube downloader (used by mpv)

### Installing Prerequisites

**Windows (with Scoop):**

```bash
scoop install mpv yt-dlp
```

**Windows (with Chocolatey):**

```bash
choco install mpv yt-dlp
```

**macOS:**

```bash
brew install mpv yt-dlp
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt install mpv
pip install yt-dlp
```

## Install

```bash
npm install --global @involvex/youtube-music-cli
```

## CLI

```
$ youtube-music-cli --help

  Usage
    $ youtube-music-cli

  Options
    --theme, -t    Theme to use (dark, light, midnight, matrix)
    --volume, -v   Initial volume (0-100)
    --shuffle, -s   Enable shuffle mode
    --repeat, -r   Repeat mode (off, all, one)
    --headless     Run without TUI (just play)
    --help, -h     Show this help

  Examples
    $ youtube-music-cli
    $ youtube-music-cli play dQw4w9WgXcQ
    $ youtube-music-cli search "Rick Astley"
    $ youtube-music-cli play dQw4w9WgXcQ --headless
```
