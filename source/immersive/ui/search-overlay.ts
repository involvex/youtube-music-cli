import {applySearchFilters} from '../../utils/search-filters.ts';
import type {
	SearchFilters,
	SearchResult,
} from '../../types/youtube-music.types.ts';

export type SearchPhase = 'query' | 'results';

export type SearchType = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

export type SearchFilterField = 'artist' | 'album';

const SEARCH_TYPE_ORDER: SearchType[] = [
	'all',
	'songs',
	'albums',
	'artists',
	'playlists',
];

const DEFAULT_SEARCH_LIMIT = 25;
const MIN_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 50;
const SEARCH_LIMIT_STEP = 5;

export interface SearchOverlayState {
	active: boolean;
	phase: SearchPhase;
	query: string;
	rawResults: SearchResult[];
	results: SearchResult[];
	selectedIndex: number;
	status: string | null;
	searchType: SearchType;
	searchLimit: number;
	filters: SearchFilters;
	filterEdit: SearchFilterField | null;
	filterDraft: string;
}

export function createSearchOverlayState(): SearchOverlayState {
	return {
		active: false,
		phase: 'query',
		query: '',
		rawResults: [],
		results: [],
		selectedIndex: 0,
		status: null,
		searchType: 'all',
		searchLimit: DEFAULT_SEARCH_LIMIT,
		filters: {artist: '', album: '', year: '', duration: 'all'},
		filterEdit: null,
		filterDraft: '',
	};
}

export function formatSearchTypeLabel(type: SearchType): string {
	return type.toUpperCase();
}

export function openSearchOverlay(state: SearchOverlayState): void {
	state.active = true;
	state.phase = 'query';
	state.query = '';
	state.rawResults = [];
	state.results = [];
	state.selectedIndex = 0;
	state.status = null;
	state.filterEdit = null;
	state.filterDraft = '';
}

export function closeSearchOverlay(state: SearchOverlayState): void {
	state.active = false;
	state.phase = 'query';
	state.query = '';
	state.rawResults = [];
	state.results = [];
	state.selectedIndex = 0;
	state.status = null;
	state.filterEdit = null;
	state.filterDraft = '';
}

function applyFiltersToResults(state: SearchOverlayState): void {
	state.results = applySearchFilters(state.rawResults, state.filters);
	state.selectedIndex = Math.min(
		state.selectedIndex,
		Math.max(0, state.results.length - 1),
	);
}

export function setSearchResults(
	state: SearchOverlayState,
	rawResults: SearchResult[],
): void {
	state.rawResults = rawResults;
	applyFiltersToResults(state);
	state.selectedIndex = 0;
	state.phase = 'results';
	state.status = null;
}

export function backToSearchQuery(state: SearchOverlayState): void {
	state.phase = 'query';
	state.rawResults = [];
	state.results = [];
	state.selectedIndex = 0;
	state.status = null;
	state.filterEdit = null;
	state.filterDraft = '';
}

export function cycleSearchType(state: SearchOverlayState): void {
	const currentIndex = SEARCH_TYPE_ORDER.indexOf(state.searchType);
	const nextIndex =
		currentIndex === -1 ? 0 : (currentIndex + 1) % SEARCH_TYPE_ORDER.length;
	state.searchType = SEARCH_TYPE_ORDER[nextIndex] ?? 'all';
	state.status = `Type: ${formatSearchTypeLabel(state.searchType)} · Limit: ${state.searchLimit}`;
}

export function increaseSearchLimit(state: SearchOverlayState): void {
	state.searchLimit = Math.min(
		MAX_SEARCH_LIMIT,
		state.searchLimit + SEARCH_LIMIT_STEP,
	);
	state.status = `Type: ${formatSearchTypeLabel(state.searchType)} · Limit: ${state.searchLimit}`;
}

export function decreaseSearchLimit(state: SearchOverlayState): void {
	state.searchLimit = Math.max(
		MIN_SEARCH_LIMIT,
		state.searchLimit - SEARCH_LIMIT_STEP,
	);
	state.status = `Type: ${formatSearchTypeLabel(state.searchType)} · Limit: ${state.searchLimit}`;
}

export function beginFilterEdit(
	state: SearchOverlayState,
	field: SearchFilterField,
): void {
	state.filterEdit = field;
	state.filterDraft = state.filters[field]?.trim() ?? '';
	state.status = `Filter ${field}: ${state.filterDraft || '(empty)'}`;
}

export function saveFilterEdit(state: SearchOverlayState): void {
	if (!state.filterEdit) {
		return;
	}

	const field = state.filterEdit;
	state.filters = {
		...state.filters,
		[field]: state.filterDraft.trim(),
	};
	state.filterEdit = null;
	state.filterDraft = '';

	if (state.phase === 'results' && state.rawResults.length > 0) {
		applyFiltersToResults(state);
		state.status = `${state.results.length} of ${state.rawResults.length} shown`;
		return;
	}

	state.status = `${field} filter saved`;
}

export function cancelFilterEdit(state: SearchOverlayState): void {
	state.filterEdit = null;
	state.filterDraft = '';
	state.status = null;
}

export type SearchQueryAction = 'submit' | 'cancel' | 'none';

export function handleSearchQueryMetaKey(
	state: SearchOverlayState,
	key: string,
): boolean {
	if (state.filterEdit) {
		return false;
	}

	if (key === 'tab') {
		cycleSearchType(state);
		return true;
	}

	if (key === 'Ctrl+M' || key === '+') {
		increaseSearchLimit(state);
		return true;
	}

	if (key === '-') {
		decreaseSearchLimit(state);
		return true;
	}

	if (key === 'Ctrl+A') {
		beginFilterEdit(state, 'artist');
		return true;
	}

	if (key === 'Ctrl+L') {
		beginFilterEdit(state, 'album');
		return true;
	}

	return false;
}

export type FilterEditAction = 'save' | 'cancel' | 'none';

export function handleFilterEditInput(
	state: SearchOverlayState,
	key: string,
): FilterEditAction {
	if (key === 'escape') {
		cancelFilterEdit(state);
		return 'cancel';
	}

	if (key === 'enter') {
		saveFilterEdit(state);
		return 'save';
	}

	if (key === 'backspace') {
		state.filterDraft = state.filterDraft.slice(0, -1);
		state.status = `Filter ${state.filterEdit}: ${state.filterDraft || '(empty)'}`;
		return 'none';
	}

	if (key.length === 1 && key >= ' ' && key <= '~') {
		if (state.filterDraft.length < 40) {
			state.filterDraft += key;
			state.status = `Filter ${state.filterEdit}: ${state.filterDraft}`;
		}
	}

	return 'none';
}

export function handleSearchQueryInput(
	state: SearchOverlayState,
	key: string,
): SearchQueryAction {
	if (state.filterEdit) {
		return 'none';
	}

	if (key === 'escape') {
		closeSearchOverlay(state);
		return 'cancel';
	}

	if (key === 'enter') {
		if (state.query.trim().length > 0) {
			return 'submit';
		}

		return 'none';
	}

	if (key === 'backspace') {
		state.query = state.query.slice(0, -1);
		return 'none';
	}

	if (key.length === 1 && key >= ' ' && key <= '~') {
		if (state.query.length < 80) {
			state.query += key;
		}
	}

	return 'none';
}

export function handleSearchResultsMetaKey(
	state: SearchOverlayState,
	key: string,
): boolean {
	if (key === 'Ctrl+A') {
		beginFilterEdit(state, 'artist');
		return true;
	}

	if (key === 'Ctrl+L') {
		beginFilterEdit(state, 'album');
		return true;
	}

	return false;
}

export type SearchResultsAction =
	| 'none'
	| 'back'
	| 'play'
	| 'mix'
	| 'favorite'
	| 'download'
	| 'add_to_playlist';

export function handleSearchResultsInput(
	state: SearchOverlayState,
	key: string,
): SearchResultsAction {
	if (state.filterEdit) {
		return 'none';
	}

	if (key === 'escape') {
		if (state.phase === 'results') {
			backToSearchQuery(state);
			return 'back';
		}

		closeSearchOverlay(state);
		return 'back';
	}

	if (key === 'up' || key === 'k') {
		state.selectedIndex = Math.max(0, state.selectedIndex - 1);
		if (state.results.length > 0) {
			state.status = `${state.selectedIndex + 1}/${state.results.length}`;
		}

		return 'none';
	}

	if (key === 'down' || key === 'j') {
		state.selectedIndex = Math.min(
			Math.max(0, state.results.length - 1),
			state.selectedIndex + 1,
		);
		if (state.results.length > 0) {
			state.status = `${state.selectedIndex + 1}/${state.results.length}`;
		}

		return 'none';
	}

	if (key === 'enter') {
		return 'play';
	}

	if (key === 'm') {
		return 'mix';
	}

	if (key === 'f') {
		return 'favorite';
	}

	if (key === 'a') {
		return 'add_to_playlist';
	}

	if (key === 'Shift+D') {
		return 'download';
	}

	return 'none';
}

export function buildSearchHeaderLine(state: SearchOverlayState): string {
	const typeLabel = formatSearchTypeLabel(state.searchType);
	const shown = state.results.length;
	const total = state.rawResults.length;
	const artist = state.filters.artist?.trim();
	const album = state.filters.album?.trim();
	const filterParts: string[] = [];
	if (artist) {
		filterParts.push(`artist:${artist}`);
	}

	if (album) {
		filterParts.push(`album:${album}`);
	}

	const filterSuffix =
		filterParts.length > 0 ? ` · ${filterParts.join(' ')}` : '';
	return `${typeLabel} · limit ${state.searchLimit} · ${shown}/${total} shown${filterSuffix}`;
}
