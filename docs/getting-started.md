---
layout: default
title: Getting Started
---

# Getting Started

This guide will help you install and start using youtube-music-cli.

## Prerequisites

Before installing youtube-music-cli, you need to install:

### mpv (Required)

mpv is the media player used for audio playback.

**Windows:**

```bash
# Scoop
scoop install mpv

# Chocolatey
choco install mpv
```

**macOS:**

```bash
brew install mpv
```

**Linux:**

```bash
# Ubuntu/Debian
sudo apt install mpv

# Arch
sudo pacman -S mpv

# Fedora
sudo dnf install mpv
```

### yt-dlp (Required)

yt-dlp extracts audio streams from YouTube.

**Windows:**

```bash
scoop install yt-dlp
# or
choco install yt-dlp
```

**macOS:**

```bash
brew install yt-dlp
```

**Linux:**

```bash
pip install yt-dlp
# or
sudo apt install yt-dlp
```

## Installation

### Bun (Recommended)

> **Note:** bun is required at runtime. Install it from [bun.sh](https://bun.sh) before proceeding.

```bash
bun install -g @involvex/youtube-music-cli
```

### npm

> **Note:** bun must still be installed on your system — the CLI entry point uses `#!/usr/bin/env bun`. npm only manages the package download.

```bash
npm install -g @involvex/youtube-music-cli
```

### Homebrew

```bash
brew tap involvex/youtube-music-cli https://github.com/involvex/youtube-music-cli.git
brew install youtube-music-cli
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

## First Run

Launch the TUI:

```bash
youtube-music-cli
```

<p align="center">
  <img src="{{ '/assets/player-preview.gif' | relative_url }}" alt="youtube-music-cli terminal preview" width="800">
</p>

You should see the main player interface. Press `?` for help or `/` to search.

## Basic Usage

### Search for Music

1. Press `/` to open search
2. Type your query
3. Press `Enter` to search
4. Use `↑`/`↓` to navigate results
5. Press `Enter` to play

### Playback Controls

- `Space` - Play/Pause
- `n` or `→` - Next track
- `b` or `←` - Previous track
- `=` - Volume up
- `-` - Volume down

### Navigation

- `?` - Help screen
- `,` - Settings
- `p` - Plugins
- `g` - Suggestions
- `Esc` - Go back
- `q` - Quit

## CLI Commands

You can also use youtube-music-cli from the command line:

```bash
# Search
youtube-music-cli search "lofi beats"

# Play a specific video
youtube-music-cli play dQw4w9WgXcQ

# Headless mode (no TUI)
youtube-music-cli search "music" --headless
```

## Next Steps

- [Configure your settings](./configuration)
- [Learn all keyboard shortcuts](./keyboard-shortcuts)
- [Install plugins](./PLUGIN_DEVELOPMENT)
