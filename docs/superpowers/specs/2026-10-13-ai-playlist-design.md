# AI Playlist Feature Design

**Date:** 2026-10-13
**Feature:** AI Playlist Generator - Main Menu Entry
**Status:** Design Phase

---

## 1. Overview

Add a new main menu entry "AI Playlist" that allows users to:

1. Enter a song title, track URL, or topic description
2. Use the configured AI provider (Gemini) to generate a curated playlist
3. View generated tracks with preview
4. Save playlist to `~/.youtube-music-cli/ai-playlists.json`
5. Play immediately, rerun generator with modifications, or iterate with AI

---

## 2. User Flow

```
Home Layout → [A] AI Playlist → AIPlaylistLayout
                                           │
                                           ▼
                                    ┌──────────────────┐
                                    │ Input Prompt     │
                                    │ (song/URL/topic) │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ Generate Playlist│
                                    │ (call LLM)       │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ Display Results  │
                                    │ - Track list     │
                                    │ - Duration       │
                                    │ - Save/Play/Redo │
                                    └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
            ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
            │ Save & Play │           │ Rerun Gen   │           │ Modify w/ AI│
            └─────────────┘           └─────────────┘           └─────────────┘
```

---

## 3. Technical Architecture

### 3.1 New Files

```
source/
├── components/
│   └── layouts/
│       └── AIPlaylistLayout.tsx      # New main layout component
├── hooks/
│   └── useAIPlaylist.ts              # Hook for AI playlist generation
├── services/
│   └── ai/
│       └── ai-playlist.service.ts    # Service for AI playlist operations
└── utils/
    └── ai-playlist-storage.ts        # Storage for ai-playlists.json
```

### 3.2 Modified Files

```
source/
├── utils/
│   └── constants.ts                  # Add VIEW.AI_PLAYLIST, keybindings
├── components/
│   └── layouts/
│       ├── MainLayout.tsx            # Add VIEW case, keybinding
│       └── HomeLayout.tsx            # Add quick link
├── hooks/
│   └── useNavigation.ts              # Ensure VIEW type includes AI_PLAYLIST
```

### 3.3 Data Model

```typescript
// ai-playlists.json
interface AIPlaylist {
	id: string; // timestamp-based
	name: string; // e.g., "AI: relaxing evening jazz"
	prompt: string; // user's original input
	tracks: AITrack[];
	createdAt: number; // Date.now()
	modifiedAt?: number; // for regenerated playlists
}

interface AITrack {
	videoId: string;
	title: string;
	artists: string[];
	duration?: number;
	source: 'search' | 'suggestions' | 'radio';
}
```

---

## 4. Key Components

### 4.1 AIPlaylistLayout.tsx

- **Input phase**: Text input with placeholder "Enter song, URL, or topic..."
- **Generation phase**: Loading spinner with "Generating playlist..."
- **Results phase**: List of tracks with checkboxes, play button, save button
- **Actions**: [Enter] Play, [s] Save, [r] Rerun, [a] Modify with AI, [Esc] Back

### 4.2 useAIPlaylist.ts Hook

```typescript
interface AIPlaylistHook {
	generatePlaylist: (
		prompt: string,
		options?: {
			trackCount?: number;
			seedType?: 'song' | 'url' | 'topic';
		},
	) => Promise<AIPlaylistResult>;
	savePlaylist: (playlist: AIPlaylist) => void;
	loadSavedPlaylists: () => AIPlaylist[];
	deletePlaylist: (id: string) => void;
}
```

### 4.3 ai-playlist.service.ts

- Calls LLMService with specialized prompt for playlist generation
- Uses existing `generate_playlist` tool internally
- Handles track resolution and validation

---

## 5. Integration Points

### 5.1 LLM Integration

- Reuse existing `getLLMService()`
- Create specialized system prompt for playlist generation
- Leverage existing `generate_playlist` tool but with enhanced prompt

### 5.2 Navigation

```typescript
// constants.ts
VIEW: {
  ...
  AI_PLAYLIST: 'ai_playlist',  // NEW
}

// Keybinding
AI_PLAYLIST: ['shift+a'],  // or similar unused key
```

### 5.3 Home Layout Quick Link

Add to `quickLinks` array in HomeLayout.tsx:

```typescript
{label: '🤖 AI Playlist', view: VIEW.AI_PLAYLIST}
```

---

## 6. Keybindings (Proposed)

| Key             | Action                                     |
| --------------- | ------------------------------------------ |
| `A` (from Home) | Open AI Playlist                           |
| `Enter`         | Play selected/generated playlist           |
| `s`             | Save playlist to ai-playlists.json         |
| `r`             | Rerun generation with same prompt          |
| `a`             | Modify with AI (conversational refinement) |
| `Esc`           | Back to Home                               |

---

## 7. AI Prompt Engineering

### System Prompt for Playlist Generation

```
You are a music curator for YouTube Music CLI. Generate a playlist based on user input.

Input types:
- Song title: "Bohemian Rhapsody" → create playlist of similar tracks/era
- Track URL: "https://music.youtube.com/watch?v=..." → use as seed
- Topic/mood: "relaxing evening jazz" → curate themed playlist

Output: Use generate_playlist tool with:
- description: detailed curation rationale
- trackCount: 15-25 (user configurable)
- mode: "playlist" (save only, don't auto-queue)
```

---

## 8. Error Handling

- No API key configured → show settings prompt (like AIChatView)
- Rate limited → show retry countdown
- No tracks found → suggest broader prompt
- Network error → fallback to cached suggestions

---

## 9. Testing Strategy

- Unit tests for AIPlaylistStorage (save/load/delete)
- Integration test for generatePlaylist flow
- Manual test: Home → AI Playlist → generate → save → play

---

## 10. Future Enhancements (Post-MVP)

- Playlist history/versions
- Export to YouTube Music account
- Share playlist via link
- Scheduled generation (daily mix)
- Multi-seed playlists (mix multiple songs/topics)
