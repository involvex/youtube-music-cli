// Explicit action type definitions
import type {SearchFilters, Track} from './youtube-music.types.ts';

export interface PlayAction {
	readonly category: 'PLAY';
	track: Track;
}

export interface PauseAction {
	readonly category: 'PAUSE';
}

export interface ResumeAction {
	readonly category: 'RESUME';
}

export interface StopAction {
	readonly category: 'STOP';
}

export interface NextAction {
	readonly category: 'NEXT';
}

export interface PreviousAction {
	readonly category: 'PREVIOUS';
}

export interface SeekAction {
	readonly category: 'SEEK';
	position: number;
}

export interface SetVolumeAction {
	readonly category: 'SET_VOLUME';
	volume: number;
}

export interface VolumeUpAction {
	readonly category: 'VOLUME_UP';
}

export interface VolumeDownAction {
	readonly category: 'VOLUME_DOWN';
}

export interface VolumeFineUpAction {
	readonly category: 'VOLUME_FINE_UP';
}

export interface VolumeFineDownAction {
	readonly category: 'VOLUME_FINE_DOWN';
}

export interface ToggleShuffleAction {
	readonly category: 'TOGGLE_SHUFFLE';
}

export interface ToggleRepeatAction {
	readonly category: 'TOGGLE_REPEAT';
}

export interface ToggleAutoplayAction {
	readonly category: 'TOGGLE_AUTOPLAY';
}

export interface SetQueueAction {
	readonly category: 'SET_QUEUE';
	queue: Track[];
}

export interface AddToQueueAction {
	readonly category: 'ADD_TO_QUEUE';
	track: Track;
}

export interface RemoveFromQueueAction {
	readonly category: 'REMOVE_FROM_QUEUE';
	index: number;
}

export interface ClearQueueAction {
	readonly category: 'CLEAR_QUEUE';
}

export interface SetQueuePositionAction {
	readonly category: 'SET_QUEUE_POSITION';
	position: number;
}

export interface UpdateProgressAction {
	readonly category: 'UPDATE_PROGRESS';
	progress: number;
}

export interface SetDurationAction {
	readonly category: 'SET_DURATION';
	duration: number;
}

export interface TickAction {
	readonly category: 'TICK';
}

export interface SetLoadingAction {
	readonly category: 'SET_LOADING';
	loading: boolean;
}

export interface SetErrorAction {
	readonly category: 'SET_ERROR';
	error: string | null;
}

export interface RestoreStateAction {
	readonly category: 'RESTORE_STATE';
	currentTrack: Track | null;
	queue: Track[];
	queuePosition: number;
	progress: number;
	volume: number;
	shuffle: boolean;
	repeat: 'off' | 'all' | 'one';
	autoplay?: boolean;
}

export interface SetSpeedAction {
	readonly category: 'SET_SPEED';
	speed: number;
}

export interface SetSubtitleAction {
	readonly category: 'SET_SUBTITLE';
	subtitle: string | null;
}

export interface SetABLoopAction {
	readonly category: 'SET_AB_LOOP';
	a: number | null;
	b: number | null;
}

// Navigation actions
export interface NavigateAction {
	readonly category: 'NAVIGATE';
	view: string;
}

export interface GoBackAction {
	readonly category: 'GO_BACK';
}

export interface SetSearchQueryAction {
	readonly category: 'SET_SEARCH_QUERY';
	query: string;
}

export interface SetSearchCategoryAction {
	readonly category: 'SET_SEARCH_CATEGORY';
	searchType: string;
}

export interface SetSearchFiltersAction {
	readonly category: 'SET_SEARCH_FILTERS';
	filters: Partial<SearchFilters>;
}

export interface ClearSearchFiltersAction {
	readonly category: 'CLEAR_SEARCH_FILTERS';
}

export interface SetSelectedResultAction {
	readonly category: 'SET_SELECTED_RESULT';
	index: number;
}

export interface SetSelectedPlaylistAction {
	readonly category: 'SET_SELECTED_PLAYLIST';
	index: number;
}

export interface SetHasSearchedAction {
	readonly category: 'SET_HAS_SEARCHED';
	hasSearched: boolean;
}

export interface SetSearchLimitAction {
	readonly category: 'SET_SEARCH_LIMIT';
	limit: number;
}

export interface TogglePlayerModeAction {
	readonly category: 'TOGGLE_PLAYER_MODE';
}

export interface DetachAction {
	readonly category: 'DETACH';
}
