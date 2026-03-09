# Fix Autoplay Loop and Timer Stuttering

## Problem Analysis

1.  **Infinite Skip Loop (The "Autoplay Loop")**:
    - The `Handle track completion` effect in `PlayerManager` (around line 680) triggers whenever `state.progress` or `state.duration` changes.
    - It checks `hasNextTrack`. If tracks were added by the Autoplay fetcher, `hasNextTrack` is true.
    - It **lacks a progress check**, so it dispatches `NEXT` immediately as soon as a track has a `duration > 0` and there's something next in the queue.
    - This explains why adding autoplay suggestions causes the player to immediately skip all tracks.

2.  **Timer Stuttering (0:01 -> 0:00)**:
    - As the loop runs, `progress` starts at 0, `TICK` increments it to 1, then the `Handle track completion` effect (triggered by the progress change) dispatches `NEXT`.
    - `NEXT` resets `progress` to 0.
    - This cycle repeats rapidly, causing the "stuttering" and the `MaxPerformanceEntryBufferExceededWarning`.

3.  **Timer Stuck / IPC Issues**:
    - Rapidly killing and spawning `mpv` processes (due to the loop) can cause IPC socket conflicts on Windows.
    - If `connectIpc` fails after 10 attempts, the player runs without IPC, meaning `duration` stays 0 and `TICK` doesn't run (as it guards on `duration > 0`).
    - This explains the "timer stuck at 0:00" symptom.

## Proposed Fixes

### 1. `source/stores/player.store.tsx`

- **Fix `Handle track completion` effect**:
  - Add a check to ensure `state.progress >= state.duration - 2` (or similar) before advancing.
  - Add a check `if (!state.isPlaying) return;` to prevent advancing while paused.
- **Refine Autoplay fetcher callback**:
  - Keep the resume logic but ensure `state.duration > 0` and it's actually near the end of the track.
  - Actually, the `Handle track completion` effect (once fixed) will handle the resume automatically because adding tracks to the queue will trigger it, and if the song is already finished, it will dispatch `NEXT`.

### 2. `source/services/player/player.service.ts`

- Increase IPC connection delay to 500ms on Windows.
- Add more retries or a longer timeout for IPC connection.
- Ensure `resume()` doesn't call `play()` if `mpvProcess` already exists.

## Verification Plan

1.  **Test Skipping**:
    - Play a song with autoplay enabled.
    - Verify the song doesn't skip immediately when suggestions are added to the queue.
2.  **Test Completion**:
    - Let a song finish naturally.
    - Verify it advances to the next track (either from queue or autoplay).
3.  **Test Pause/Resume**:
    - Pause and resume a song.
    - Verify the timer continues correctly and doesn't reset or stutter.
4.  **Check Logs**:
    - Verify no `MaxPerformanceEntryBufferExceededWarning` and no rapid `play()` calls.
