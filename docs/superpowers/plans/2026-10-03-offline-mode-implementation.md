# Offline Mode Implementation

## Summary

This implementation adds true offline mode support to youtube-music-cli, allowing users to access and play tracks that have been downloaded locally without requiring a network connection.

## Files Created

1. **`source/services/offline/offline-mode.service.ts`** - Offline mode service that:
   - Detects network status via fetch health checks
   - Loads and caches locally available tracks from the downloads index
   - Provides reactive state management for offline mode

2. **`source/components/offline/OfflineQueue.tsx`** - Offline queue component for the TUI that displays locally available tracks

3. **`source/components/layouts/OfflineLayout.tsx`** - Layout component for the offline view

4. **`source/hooks/useOfflineMode.ts`** - Hook for managing offline state with periodic network health checks

## Files Modified

1. **`source/services/offline/offline-mode.service.ts`** - Updated with:
   - Periodic network health checks (every 30 seconds)
   - `NETWORK_CHECK_INTERVAL` constant for configurable interval
   - `startPeriodicNetworkChecks()` and `stopPeriodicNetworkChecks()` functions

2. **`source/utils/local-track.ts`** - Added:
   - `isTrackPlayableOffline()` - Check if a track is available locally
   - `areTracksPlayableOffline()` - Check if multiple tracks are playable offline
   - `resetDownloadsIndexForTests()` - Test utility for resetting downloads index

3. **`source/utils/constants.ts`** - Added:
   - `VIEW.OFFLINE` constant for the offline view
   - `KEYBINDINGS.OFFLINE_QUEUE` for Shift+O shortcut

4. **`source/components/layouts/MainLayout.tsx`** - Added:
   - Import for OfflineLayout
   - `goToOffline` navigation function
   - Route for the offline view in the switch statement
   - Keybinding registration for offline queue

5. **`source/components/layouts/HomeLayout.tsx`** - Added:
   - Import for `getOfflineState` from offline mode service
   - `useOfflineMode` hook for tracking offline state changes
   - Network status indicator (⚠️ Online / 📡 Offline) in header

6. **`source/utils/icons.ts`** - Added:
   - `FILE_DOWNLOAD` icon for offline queue display

7. **`source/components/favorites/FavoritesList.tsx`** - Added:
   - Download all favorites functionality (Shift+D)
   - LOCAL playback indicator
   - Download shortcut (D)

8. **`SUGGESTIONS.md`** - Updated offline mode status from "Partial" to "Implemented"

9. **`docs/roadmap.md`** - Added offline mode to shipped features

## Key Features

- **Network Detection**: Automatic detection when network is unavailable
- **Network Status Indicator**: Shows ⚠️ Online or 📡 Offline in the status area
- **Periodic Health Checks**: Network status checked every 30 seconds
- **Offline Queue View**: Accessible via Shift+O hotkey
- **Local Track Detection**: Shows all downloaded tracks in a dedicated view
- **Seamless Fallback**: When `preferLocalPlayback` is enabled, local files are used automatically
- **LOCAL Playback Indicator**: Shows "LOCAL" label when a track is playing from local storage
- **Download Selected Track**: D shortcut in Favorites, Search, and Playlists views
- **Download All Favorites**: Shift+D in Favorites view to batch download all favorites
- **TUI Integration**: Full keyboard navigation with Enter to play, W to queue, Y to play next

## Usage

### Offline Queue (Shift+O)

1. Press `Shift+O` to access the offline queue view
2. View all downloaded tracks from your downloads index
3. Select and play with shortcuts:
   - `[Enter]` - Play selected track
   - `[W]` - Add to queue
   - `[Y]` - Play next
   - `[D]` - Download selected track
   - `[Esc]` - Go back

### Favorites View

- `[D]` - Download selected track
- `[Shift+D]` - Download all favorites to local storage

### Search Results

- `[D]` - Download selected track

### Network Status

- The CLI shows network status in the header:
  - ⚠️ Online - Internet connection available
  - 📡 Offline - No internet connection detected

## Testing

Located in `tests/offline-mode.test.ts`:

- Tests for `isTrackPlayableOffline()`
- Tests for `resolveTrackPlayUrl()` with `preferLocal` option
- Tests for offline state management (`getOfflineState`, `setOfflineState`)
- Tests for `areTracksPlayableOffline()` utility

## Future Enhancements

- Sync offline queue across devices
- Offline queue import/export
- Offline playlist support
- Offline album art caching

## Testing Commands

```bash
# Run offline mode tests
bun test tests/offline-mode.test.ts --timeout=60000

# Type check
bun run typecheck

# Lint
bun run lint
```
