---
layout: default
title: Roadmap
---

# Roadmap

How ideas in `SUGGESTIONS.md` become concrete work, and what to pick up next.

## Source of truth

- `SUGGESTIONS.md` — proposed features, enhancements, and fixes (priority tags).
- This roadmap — current focus and recently shipped initiatives.
- README + AGENTS.md link here for contributors.

## Shipped (through 0.1.0)

- Crossfade & gapless playback (settings + mpv)
- Equalizer presets
- Volume fade in/out
- AI Chat (Gemini)
- Imports & exports (Spotify / YouTube / JSON / M3U8)
- Stats dashboard
- Plugin system
- **Web companion** — bundled Phosphor Console UI (`--web` / `--web-only`)
- Immersive Windows mode (`--win32`)
- Favorites, shell completions, radio streams, live streams catalog
- Download pipeline (yt-dlp → youtubei → Invidious) + mpv IPC hardening
- History/Favorites save hardening (#23) + clearer error formatting
- Prefer local downloads (`preferLocalPlayback`, downloads index, Local badge)
- Immersive visualizer (`source/immersive/visualizer/`)
- Mix from track / similar tracks (`M` key, `createMixFromResult`)
- Config doctor (`youtube-music-cli config doctor [--fix]`)
- Cookies for yt-dlp (`cookiesFromBrowser` / `cookiesFile` settings)
- Sleep timer (5/10/15/30/60 min presets)
- Version check (24h auto-check)
- Dependency checker (brew/scoop/choco/apt/dnf/pacman install plans)
- Debug logs (daily rotation, 14-day retention, 5 MB mid-session rotate)
- Subtitle support (`--slang=en`, `--sub-scale=1.3`)
- Proxy support (`--http-proxy` + HTTPS_PROXY env)
- Batch downloads (`downloadTracks()` multi-track)
- Downloads index (`downloads-index.json` for local playback preference)
- GitHub Actions release pipeline (cross-platform binaries on tag → GitHub Releases + npm)
- Web favorites/live nav (`web/src/components/favorites/`, `web/src/components/live/`)
- Mood-Based Radio (8 presets: relaxing, energetic, focus, chill, workout, sleep, party, melancholy)
- AI Playlist Generation (`generate_playlist` LLM tool with queue/playlist/both modes)
- LLM tool executor refactored with `ToolExecutorContext` for real queue/playlist dispatch
- **Offline Mode** — Full offline mode with network status indicator (⚠️ Online/📡 Offline in header), Shift+O offline queue UI, periodic network health checks (30s interval), local track detection, download shortcuts (D/Shift+D), seamless fallback to local files

## Active focus (post-0.1.0)

1. **Web v1.1** — Media Session API for system media controls; mini-player route for low-footprint browser control.
2. **Discovery** — Smart recommendations beyond YouTube's built-in related tracks; playlist radio mode.
3. **Downloads Enhancement** — Batch download optimization, download resumption, and improved UX.

## Toward 1.0.0

Reserve a major `1.0.0` for a documented support/install matrix and a stability signal—not for the next feature drop. Until then, ship `0.1.x` patches and `0.2.x` feature minors.

## How to contribute

1. Pick a high-priority item from `SUGGESTIONS.md`.
2. Update this roadmap with the files you expect to touch.
3. Implement, keep README/AGENTS pointers alive, and mark the initiative shipped when it lands.
