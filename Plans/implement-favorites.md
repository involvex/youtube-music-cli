# Implementation Plan - Favorites Feature

This plan outlines the steps to implement a "Favorites" feature for `youtube-music-cli`.

## Objective

Allow users to mark songs as favorites, persist this list, and easily access/manage it via a dedicated view.

## Scope

- **Persistence**: Save/Load favorites to `~/.youtube-music-cli/favorites.json`.
- **State Management**: New `FavoritesProvider` and `useFavorites` hook.
- **UI**:
  - Add visual indicator (Heart icon) to player and lists.
  - Add `FavoritesList` component and `FavoritesLayout`.
  - Update `MainLayout` to include the new view.
- **Interactions**:
  - `f`: Toggle favorite status for current track or selected item.
  - `Shift+F`: Open Favorites view.

## detailed Implementation Steps

### 1. Persistence Service

- **File**: `source/services/favorites/favorites.service.ts`
- **Functionality**:
  - `loadFavorites()`: Read from JSON file.
  - `saveFavorites(tracks)`: Write to JSON file.
  - `PersistedFavorites` interface with schema versioning.

### 2. State Management

- **File**: `source/stores/favorites.store.tsx`
- **Functionality**:
  - Context with `favorites` state (Track[]).
  - Actions: `ADD`, `REMOVE`, `TOGGLE`.
  - Expose `isFavorite(trackId)` helper.

### 3. Constants & Types

- **File**: `source/utils/constants.ts`
  - Add `FAVORITES: 'favorites'` to `VIEW`.
  - Add `FAVORITES_VIEW: ['shift+f']` to `KEYBINDINGS`.
  - Add `TOGGLE_FAVORITE: ['f']` to `KEYBINDINGS`.

### 4. Components

#### A. Favorites View

- **File**: `source/components/favorites/FavoritesList.tsx`
  - Render list of favorite tracks.
  - Handle navigation (up/down/enter to play).
  - Handle `delete` or `d` to remove.
  - Handle `shift+s` to shuffle play all.
- **File**: `source/components/layouts/FavoritesLayout.tsx`
  - Wrapper for `FavoritesList` and `PlayerControls`.

#### B. Player Controls Update

- **File**: `source/components/player/NowPlaying.tsx`
  - Display `<3` (Heart) if current track is favorite.
- **File**: `source/components/player/PlayerControls.tsx`
  - Register `f` key binding to toggle favorite for current track.

#### C. List Components Update

- **File**: `source/components/player/QueueList.tsx`
  - Show heart icon next to tracks.
  - Handle `f` key to toggle favorite for selected track.
- **File**: `source/components/search/SearchResults.tsx`
  - Show heart icon next to tracks.
  - Handle `f` key to toggle favorite for selected track.

### 5. Integration

- **File**: `source/main.tsx` (or `app.tsx`)
  - Wrap app with `FavoritesProvider`.
  - Register `Shift+F` global shortcut to navigate to `VIEW.FAVORITES`.
- **File**: `source/components/layouts/MainLayout.tsx`
  - Add case for `VIEW.FAVORITES` to render `FavoritesLayout`.

## Verification Plan

1. **Startup**: Verify `favorites.json` is created (or loaded) on startup.
2. **Add Favorite**: Play a song, press `f`. Verify it appears in `favorites.json` and UI shows heart.
3. **List View**: Press `Shift+F`. Verify list shows the added song.
4. **Remove Favorite**: Press `f` again on the song in the list (or `delete`). Verify it's removed.
5. **Playback**: Select a song in favorites list and press Enter. Verify it plays.
6. **Persistence**: Restart app. Verify favorites are still there.
