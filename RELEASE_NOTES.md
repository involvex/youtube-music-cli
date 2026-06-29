## Highlights

- Win32 immersive: full Ink TUI settings parity (23 rows, text edits, sleep timer)
- Richer in-player search (type tabs, filters, Shift+D download)
- Settings hotkey fix (`Ctrl+,` / `,`)
- **Volume control with `=`/`+` and `-` on player view (TUI parity; arrows no longer volume)**
- **System tray: app icon + right-click menu (Settings / Exit)**

## Install

- `bun install -g @involvex/youtube-music-cli`
- Windows: `youtube-music-cli --win32` or `dist/ymc-win32.exe`

## Bun Discord #showcase

Built a fullscreen Windows terminal music player with **Bun** — real YouTube Music playback via mpv, braille audio visualizer, disco mode, in-terminal search/queue/settings, and a compiled `ymc-win32.exe`. Uses Bun for dev, compile, and native Win32 FFI (tray, hotkeys, DPI). Try: `bun install -g @involvex/youtube-music-cli` then `youtube-music-cli --win32`. Repo: https://github.com/involvex/youtube-music-cli

Preview: https://github.com/involvex/youtube-music-cli/blob/main/assets/player-preview.gif
