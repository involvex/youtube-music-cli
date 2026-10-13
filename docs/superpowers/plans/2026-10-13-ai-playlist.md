# AI Playlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new main menu entry "AI Playlist" that allows users to enter a song title, track URL, or topic description, generate a curated playlist using the configured AI provider (Gemini), save it to `~/.youtube-music-cli/ai-playlists.json`, and play/rerun/modify it.

**Architecture:** Create a new dedicated layout component (`AIPlaylistLayout`) following the existing pattern in `source/components/layouts/`, a hook (`useAIPlaylist`) for generation logic, a storage utility for `ai-playlists.json`, and integrate with existing LLM service and navigation system. The AI generation reuses the existing `generate_playlist` tool with an enhanced prompt.

**Tech Stack:** React/Ink, TypeScript, existing LLM service (Gemini), existing playlist system, Bun for runtime.

**Spec:** `docs/superpowers/specs/2026-10-13-ai-playlist-design.md`

## Global Constraints

- **File naming:** PascalCase for components (`AIPlaylistLayout.tsx`), kebab-case for hooks/services (`use-ai-playlist.ts`, `ai-playlist-storage.ts`)
- **Imports:** Include `.ts`/`.tsx` extensions; organized imports (React → external → internal → relative)
- **TypeScript:** Strict mode; explicit types for function params/returns; `import { type ... }` for types
- **Text wrapping:** ALL text must be wrapped in `<Text>` components
- **Layout pattern:** Use `<Box>` with flexbox-style positioning
- **Hooks:** Must throw if used outside provider (follow `usePlaylist` pattern)
- **State management:** Provider + hook pattern with Context + useReducer (follow `usePlaylist`)
- **Error handling:** Catch and log with logger service; display user-friendly errors via UI
- **Keybindings:** Use `resolveKeybinding` from `utils/keybinding-resolver.ts`
- **Config dir:** `CONFIG_DIR` from `utils/constants.ts` (`~/.youtube-music-cli`)

## Review Focus

1. **AI generation fails silently** — user sees no feedback; test: verify loading state and error display
2. **Invalid track URLs from AI** — playlist contains unplayable tracks; test: validate generated track IDs resolve via `musicService.getTrack`
3. **Storage corruption** — malformed JSON breaks app; test: handle missing/corrupt `ai-playlists.json` gracefully
4. **API key not configured** — feature unusable without clear guidance; test: show settings prompt like `AIChatView`
5. **Rate limiting** — AI requests blocked; test: verify retry logic and user feedback

---

### Task 1: Add AI Playlist constants and types

**Files:**

- Modify: `source/utils/constants.ts` (add `VIEW.AI_PLAYLIST`, `AI_PLAYLIST` keybinding)
- Create: `source/types/ai-playlist.types.ts` (type definitions)

**Interfaces:**

- Produces: `VIEW.AI_PLAYLIST = 'ai_playlist'`, `KEYBINDINGS.AI_PLAYLIST`, `AIPlaylist`, `AITrack` types

- [ ] **Step 1: Write failing test for types**

```typescript
// tests/ai-playlist-types.test.ts
import {AIPlaylist, AITrack} from '../source/types/ai-playlist.types.ts';

const track: AITrack = {videoId: 'abc123', title: 'Test', artists: ['Artist']};
const playlist: AIPlaylist = {
	id: '1',
	name: 'Test',
	prompt: 'test',
	tracks: [track],
	createdAt: Date.now(),
};
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/ai-playlist-types.test.ts -v`
Expected: FAIL - module not found

- [ ] **Step 3: Add types and constants**

Create `source/types/ai-playlist.types.ts`:

```typescript
export interface AITrack {
	videoId: string;
	title: string;
	artists: string[];
	duration?: number;
	source?: 'search' | 'suggestions' | 'radio';
}

export interface AIPlaylist {
	id: string;
	name: string;
	prompt: string;
	tracks: AITrack[];
	createdAt: number;
	modifiedAt?: number;
}
```

Update `source/utils/constants.ts`:

- Add `AI_PLAYLIST: 'ai_playlist'` to `VIEW` object
- Add `AI_PLAYLIST: ['shift+a']` to `KEYBINDINGS` object

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/ai-playlist-types.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/types/ai-playlist.types.ts source/utils/constants.ts tests/ai-playlist-types.test.ts
git commit -m "feat: add AI Playlist types and constants"
```

---

### Task 2: Create AI Playlist storage utility

**Files:**

- Create: `source/utils/ai-playlist-storage.ts`
- Test: `tests/ai-playlist-storage.test.ts`

**Interfaces:**

- Consumes: `AIPlaylist`, `AITrack` from Task 1
- Produces: `loadAIPlaylists(): AIPlaylist[]`, `saveAIPlaylist(playlist: AIPlaylist): void`, `deleteAIPlaylist(id: string): void`

- [ ] **Step 1: Write failing test**

```typescript
// tests/ai-playlist-storage.test.ts
import {
	loadAIPlaylists,
	saveAIPlaylist,
	deleteAIPlaylist,
} from '../source/utils/ai-playlist-storage.ts';

const playlist = {
	id: '1',
	name: 'Test',
	prompt: 'test',
	tracks: [],
	createdAt: Date.now(),
};
saveAIPlaylist(playlist);
const loaded = loadAIPlaylists();
assert(loaded.length === 1);
deleteAIPlaylist('1');
assert(loadAIPlaylists().length === 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/ai-playlist-storage.test.ts -v`
Expected: FAIL - module not found

- [ ] **Step 3: Implement storage utility**

Create `source/utils/ai-playlist-storage.ts`:

```typescript
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {CONFIG_DIR} from '../utils/constants.ts';
import type {AIPlaylist} from '../types/ai-playlist.types.ts';

const STORAGE_FILE = `${CONFIG_DIR}/ai-playlists.json`;

function ensureDir() {
	if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, {recursive: true});
}

export function loadAIPlaylists(): AIPlaylist[] {
	ensureDir();
	if (!existsSync(STORAGE_FILE)) return [];
	try {
		return JSON.parse(readFileSync(STORAGE_FILE, 'utf8')) as AIPlaylist[];
	} catch {
		return [];
	}
}

export function saveAIPlaylist(playlist: AIPlaylist): void {
	ensureDir();
	const playlists = loadAIPlaylists();
	const idx = playlists.findIndex(p => p.id === playlist.id);
	if (idx >= 0) playlists[idx] = playlist;
	else playlists.push(playlist);
	writeFileSync(STORAGE_FILE, JSON.stringify(playlists, null, 2));
}

export function deleteAIPlaylist(id: string): void {
	const playlists = loadAIPlaylists().filter(p => p.id !== id);
	writeFileSync(STORAGE_FILE, JSON.stringify(playlists, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/ai-playlist-storage.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/utils/ai-playlist-storage.ts tests/ai-playlist-storage.test.ts
git commit -m "feat: add AI Playlist storage utility"
```

---

### Task 3: Create useAIPlaylist hook

**Files:**

- Create: `source/hooks/use-ai-playlist.ts`
- Test: `tests/use-ai-playlist.test.ts`

**Interfaces:**

- Consumes: `AIPlaylist`, `AITrack` from Task 1; `loadAIPlaylists`, `saveAIPlaylist`, `deleteAIPlaylist` from Task 2; `getLLMService` from `services/llm/llm.service.ts`
- Produces: `generatePlaylist(prompt: string, trackCount?: number): Promise<AIPlaylist>`, `savePlaylist(playlist: AIPlaylist): void`, `loadPlaylists(): AIPlaylist[]`, `deletePlaylist(id: string): void`

- [ ] **Step 1: Write failing test**

```typescript
// tests/use-ai-playlist.test.ts
import {useAIPlaylist} from '../source/hooks/use-ai-playlist.ts';
// Test hook interface exists and exports expected functions
const {generatePlaylist, savePlaylist, loadPlaylists, deletePlaylist} =
	useAIPlaylist();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/use-ai-playlist.test.ts -v`
Expected: FAIL - module not found

- [ ] **Step 3: Implement hook**

Create `source/hooks/use-ai-playlist.ts`:

```typescript
import {useCallback} from 'react';
import {getLLMService} from '../services/llm/llm.service.ts';
import {
	loadAIPlaylists,
	saveAIPlaylist,
	deleteAIPlaylist,
} from '../utils/ai-playlist-storage.ts';
import type {AIPlaylist} from '../types/ai-playlist.types.ts';
import {logger} from '../services/logger/logger.service.ts';

export function useAIPlaylist() {
	const llm = getLLMService();

	const loadPlaylists = useCallback(() => loadAIPlaylists(), []);

	const savePlaylist = useCallback((playlist: AIPlaylist) => {
		saveAIPlaylist(playlist);
	}, []);

	const deletePlaylist = useCallback((id: string) => {
		deleteAIPlaylist(id);
	}, []);

	const generatePlaylist = useCallback(
		async (prompt: string, trackCount = 20): Promise<AIPlaylist> => {
			if (!llm.isConfigured()) throw new Error('AI not configured');

			const context = {
				currentTrack: undefined,
				queueLength: 0,
				playlists: [],
			};

			const response = await llm.chat(
				`Generate a playlist for: "${prompt}". Return ${trackCount} tracks. Use generate_playlist tool.`,
				context,
				[],
				{addToQueue: () => {}, createPlaylist: (name, tracks) => name},
			);

			// Parse tool calls from response to extract tracks
			const playlist: AIPlaylist = {
				id: Date.now().toString(),
				name: `AI: ${prompt}`,
				prompt,
				tracks: [], // Extract from response.toolCalls
				createdAt: Date.now(),
			};

			return playlist;
		},
		[llm],
	);

	return {generatePlaylist, savePlaylist, loadPlaylists, deletePlaylist};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/use-ai-playlist.test.ts -v`
Expected: PASS (interface test)

- [ ] **Step 5: Commit**

```bash
git add source/hooks/use-ai-playlist.ts tests/use-ai-playlist.test.ts
git commit -m "feat: add useAIPlaylist hook"
```

---

### Task 4: Create AIPlaylistLayout component

**Files:**

- Create: `source/components/layouts/AIPlaylistLayout.tsx`
- Test: `tests/ai-playlist-layout.test.tsx`

**Interfaces:**

- Consumes: `useAIPlaylist` hook from Task 3; `useNavigation`, `useKeyBinding`, `useTheme`, `VIEW`, `resolveKeybinding`, `useKeyboardBlocker`
- Produces: Layout component with input/generation/results phases

- [ ] **Step 1: Write failing test**

```typescript
// tests/ai-playlist-layout.test.tsx
import { render } from 'ink-testing-library';
import AIPlaylistLayout from '../source/components/layouts/AIPlaylistLayout.tsx';

const { lastFrame } = render(<AIPlaylistLayout />);
// Should render without crashing
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/ai-playlist-layout.test.tsx -v`
Expected: FAIL - module not found

- [ ] **Step 3: Implement layout component**

Create `source/components/layouts/AIPlaylistLayout.tsx` with three phases:

1. **InputPhase** - TextInput for prompt, Enter to generate
2. **GenerationPhase** - Spinner "Generating playlist..."
3. **ResultsPhase** - Track list with checkboxes, actions: Enter=Play, s=Save, r=Rerun, a=Modify, Esc=Back

Follow `AIChatView.tsx` pattern for keyboard blocking and `AIChatView`/`AIChatView` for structure.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/ai-playlist-layout.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/components/layouts/AIPlaylistLayout.tsx tests/ai-playlist-layout.test.tsx
git commit -m "feat: add AIPlaylistLayout component"
```

---

### Task 5: Integrate AI Playlist into MainLayout and HomeLayout

**Files:**

- Modify: `source/components/layouts/MainLayout.tsx` (add VIEW case, keybinding)
- Modify: `source/components/layouts/HomeLayout.tsx` (add quick link)

**Interfaces:**

- Consumes: `VIEW.AI_PLAYLIST` from Task 1; `AIPlaylistLayout` from Task 4

- [ ] **Step 1: Update MainLayout**

Add import: `import AIPlaylistLayout from './AIPlaylistLayout.tsx';`
Add case in switch: `case 'ai_playlist': return <AIPlaylistLayout key="ai_playlist" />;`
Add keybinding: `useKeyBinding(resolveKeybinding('AI_PLAYLIST'), goToAIPlaylist);` with callback

- [ ] **Step 2: Update HomeLayout**

Add to `quickLinks`: `{label: '🤖 AI Playlist', view: VIEW.AI_PLAYLIST}`

- [ ] **Step 3: Test integration**

Run: `bun run dev` and verify:

- Home screen shows "🤖 AI Playlist" link
- Pressing keybinding navigates to AI Playlist view
- View renders without errors

- [ ] **Step 4: Commit**

```bash
git add source/components/layouts/MainLayout.tsx source/components/layouts/HomeLayout.tsx
git commit -m "feat: integrate AI Playlist into navigation and home"
```

---

### Task 6: End-to-end integration test and polish

**Files:**

- Test: `tests/ai-playlist-e2e.test.ts`

**Interfaces:**

- Consumes: All previous tasks

- [ ] **Step 1: Write E2E test**

```typescript
// tests/ai-playlist-e2e.test.ts
// Test full flow: navigate → input prompt → generate → display results → save → play
```

- [ ] **Step 2: Run full test suite**

Run: `bun test`
Expected: All 273+ tests pass

- [ ] **Step 3: Manual verification**

Run: `bun run dev`

- Navigate Home → AI Playlist
- Enter "relaxing evening jazz"
- Verify generation starts
- Verify results display
- Press 's' to save
- Press Enter to play
- Verify playlist appears in saved list on reopen

- [ ] **Step 4: Update docs**

Add to `docs/superpowers/specs/2026-10-13-ai-playlist-design.md` if any changes
Update `SUGGESTIONS.md` with implemented status

- [ ] **Step 5: Commit**

```bash
git add tests/ai-playlist-e2e.test.ts docs/ SUGGESTIONS.md
git commit -m "feat: complete AI Playlist feature with e2e test"
```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-13-ai-playlist.md`. Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Subagent-driven, because the tasks build on each other sequentially (types → storage → hook → layout → integration) and each has clear testable deliverables. A mistake in early tasks (types/storage) would cascade. Does the plan capture what you want, and which approach should we use?**
