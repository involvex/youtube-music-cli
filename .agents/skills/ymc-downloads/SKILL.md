# YMC Downloads

Download pipeline and on-disk playback index for youtube-music-cli.

## Pipeline

1. Destination: `{downloadDirectory}/{Artist}/{Album}/{Title} [{videoId}].{mp3|m4a}` via `getTrackDestinationPath` (legacy title-only paths still resolve).
2. Source: yt-dlp (`--continue`) → youtubei.js stream → mpv `--stream-record`.
3. ffmpeg convert + metadata/cover.
4. Upsert `downloads-index.json` on success and on skip-if-exists (never before ffmpeg succeeds).

## Cancel and resume

- One active batch at a time (`AbortController`). `cancel()` kills the yt-dlp/ffmpeg/mpv child (Windows: `taskkill /T`).
- Partial `.source` files are kept on cancel/failure so the next yt-dlp run can resume.
- Stream URL and mpv fallbacks delete any partial source and restart from scratch.

## Key files

- `source/services/download/download.service.ts`
- `source/utils/local-track.ts` — index + path helpers + `resolveLocalTrackPath`
- `source/utils/download-path.ts` — normalize/ensure directory
- `source/utils/download-progress.ts` — progress/summary formatting
- Config: `downloadsEnabled`, `downloadDirectory`, `downloadFormat`, `preferLocalPlayback` (Settings toggle)

## UI / CLI

- Ink / immersive: Shift+D download; Shift+D again cancels; progress via `formatDownloadProgress`.
- CLI: `ymc download <track-id|youtube-url|saved-playlist-id>` (headless; Ctrl+C cancels).
- Settings: Prefer Local Playback ON/OFF.
- Playing a downloaded track prefers disk when `preferLocalPlayback` is true.
