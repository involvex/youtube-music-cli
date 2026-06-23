---
layout: default
title: Roadmap
---

# Roadmap

This document captures how the team is turning the ideas listed in `SUGGESTIONS.md` into concrete work, starting with the gapless/crossfade story. It also explains how reviewers and contributors can follow along or pick up the next item in the queue.

## Source of truth

- `SUGGESTIONS.md` is where every proposed feature, enhancement, and bug fix is logged. Each proposal is tagged with a priority, and the list above this document indicates what the team is discussing next.
- The README and CLAUDE guidance both link to this roadmap so anyone landing in the repo knows where to look for the current focus.

## Active initiative: Crossfade & gapless playback

1. **Understand the player plumbing**
   - `source/services/player/player.service.ts` already passes `--gapless-audio` plus an `acrossfade` filter to mpv, so the groundwork for gapless/crossfade is in place. This initiative verifies the existing hooks, exercises the `crossfadeDuration` and `gaplessPlayback` config keys, and ensures we can toggle them without regression.
2. **Surface configuration in the UI**
   - Update `source/components/settings/Settings.tsx` and any shortcuts/UI referenced in `source/components/player/PlayerControls.tsx` so users can enable/disable gapless playback and adjust the crossfade duration.
3. **Iteration & verification**
   - Add targeted tests (hooks or integration) that exercise the new settings where possible. Manual verification includes listening for seamless transitions and confirming mpv logs show the expected `acrossfade` filter settings.
4. **Document the outcome**
   - Once the feature stabilizes, update `README.md`, `docs/roadmap.md`, and `SUGGESTIONS.md` to record how the feature behaves, which files were touched, and what testers should look for.

## Next priorities

- **Equalizer presets** – extend the existing `equalizerPreset` config so that the presets align with the UX designs in the player controls and document the new filter stack.
- **Volume fade in/out** – add optional fade logic when a track starts or ends to soften transitions; evaluate whether this belongs inside `player.service` or as part of `playerReducer`.
- **Discovery & smart recommendations** – extend the suggestions view by surfacing AI-powered or similarity-based results once the playback layer is stable.

## Recent additions

- **Immersive Windows Mode** - A fullscreen TUI experience for Windows with ANSI-based audio visualization and disco mode. Launch with `youtube-music-cli --win32` or use `bun run dev:win32` for development. Build via `bun run build:win32` to produce a standalone `ymc-win32.exe`.
- **Favorites feature** – Users can now mark tracks as favorites using the `f` key and view their collection with `Shift+F`. Favorites are persisted in `~/.youtube-music-cli/favorites.json` and indicated with a heart icon (♥) across all views.
- **Shell completions for `ymc`** – the CLI now ships with `ymc completions <bash|zsh|powershell|fish>` to emit shell-specific helper scripts.

Whenever a new priority becomes actionable, give it a subsection here describing the technical owner, the files that will change, and any follow-up documentation that needs to be touched.

## How to contribute

1. Pick a high-priority item from `SUGGESTIONS.md`.
2. Read or update this roadmap section so it describes your implementation plan, including the files you expect to modify.
3. Work through the plan, keep the README/CLAUDE pointers alive, and when the work lands, mark the checklist here as complete so the next initiative is clear.
