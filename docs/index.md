---
layout: default
title: Home
---

<div class="hero">
  <h1>🎵 youtube-music-cli</h1>
  <p>A powerful Terminal User Interface (TUI) music player for YouTube Music</p>
<p align="center">
  <img src="assets/player-preview.gif" alt="youtube-music-cli terminal preview" width="800">
</p>
  <div class="hero-buttons">
    <a href="{{ '/getting-started' | relative_url }}" class="btn btn-primary">Get Started</a>
    <a href="https://github.com/involvex/youtube-music-cli" class="btn btn-secondary">View on GitHub</a>
  </div>
</div>

## Features

<div class="features">
  <div class="feature">
    <span class="feature-icon">🎨</span>
    <div>
      <h3>Beautiful TUI</h3>
      <p>Rich terminal interface with multiple themes (Dark, Light, Midnight, Matrix)</p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">🖥️</span>
    <div>
      <h3>Immersive Mode (Windows)</h3>
      <p>Fullscreen visual experience with audio visualization and disco effects</p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">🔍</span>
    <div>
      <h3>Powerful Search</h3>
      <p>Find songs, albums, artists, and playlists instantly</p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">📋</span>
    <div>
      <h3>Queue Management</h3>
      <p>Build and manage your playback queue with ease</p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">❤️</span>
    <div>
      <h3>Favorites</h3>
      <p>Mark tracks with <code>f</code> and access your collection with <code>Shift+F</code></p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">🔀</span>
    <div>
      <h3>Shuffle & Repeat</h3>
      <p>Multiple playback modes to suit your listening style</p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">🔌</span>
    <div>
      <h3>Plugin System</h3>
      <p>Extend functionality with plugins like adblock, lyrics, and more</p>
    </div>
  </div>
  <div class="feature">
    <span class="feature-icon">⌨️</span>
    <div>
      <h3>Keyboard-Driven</h3>
      <p>Efficient vim-style navigation for power users</p>
    </div>
  </div>
</div>

## Quick Start

```bash
# Install
npm install -g @involvex/youtube-music-cli

# Run
youtube-music-cli
ymc
```

## Navigation

<div class="card-grid">
  <a href="{{ '/getting-started' | relative_url }}" class="card">
    <h3>📖 Getting Started</h3>
    <p>Installation and first steps</p>
  </a>
  <a href="{{ '/configuration' | relative_url }}" class="card">
    <h3>⚙️ Configuration</h3>
    <p>Customize your experience</p>
  </a>
  <a href="{{ '/keyboard-shortcuts' | relative_url }}" class="card">
    <h3>⌨️ Keyboard Shortcuts</h3>
    <p>Full shortcuts reference</p>
  </a>
  <a href="{{ '/PLUGIN_API' | relative_url }}" class="card">
    <h3>🔌 Plugin API</h3>
    <p>Build your own plugins</p>
  </a>
  <a href="{{ '/PLUGIN_DEVELOPMENT' | relative_url }}" class="card">
    <h3>🛠️ Plugin Development</h3>
    <p>Step-by-step guide</p>
  </a>
  <a href="{{ '/architecture' | relative_url }}" class="card">
    <h3>🏗️ Architecture</h3>
    <p>Technical overview</p>
  </a>
  <a href="{{ '/roadmap' | relative_url }}" class="card">
    <h3>🛣️ Roadmap</h3>
    <p>See what the team is implementing next and how to contribute</p>
  </a>
</div>

## Requirements

- Node.js 18+
- [mpv](https://mpv.io/) - Media player
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube audio extraction
