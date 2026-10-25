# CLAUDE.md

Guidance for Claude Code in this repository. Prefer root [`AGENTS.md`](AGENTS.md) for the full playbook; keep this file short and in sync.

## Project Overview

**@involvex/youtube-music-cli** is a TUI music player for YouTube Music (React + Ink + TypeScript, Bun runtime, mpv playback).

## Commands

```bash
bun run dev          # Run CLI
bun run build        # CLI + web companion
bun run test         # bun:test
bun run format       # Prettier
bun run lint         # ESLint
bun run typecheck    # bun check
bun run sync:skills  # Copy .agents/skills → .claude/skills
```

`prebuild` runs format → lint:fix → typecheck.

## Architecture (quick)

- Entry: `source/cli.tsx` → Ink TUI or direct play/search/playlist
- Win32 immersive: `source/immersive/` (`--win32`)
- Player state: `source/stores/player.store.tsx`
- Playback: `source/services/player/` (mpv IPC)
- Lyrics: `source/services/lyrics/` (Musixmatch richsync + LRCLIB fallback; karaoke utils in `source/utils/karaoke.ts`)
- Local downloads: `source/utils/local-track.ts` + `source/services/download/`
- Config: `source/services/config/config.service.ts`

## Agent tooling

- Canonical skills: `.agents/skills/` (sync to `.claude` via `bun run sync:skills`)
- Keep: `.agents`, `.claude`, `.cursor`, `.opencode`
- Plans: `docs/superpowers/plans/`
- MCP is editor-local (Cursor/Claude settings), not shipped in this repo
