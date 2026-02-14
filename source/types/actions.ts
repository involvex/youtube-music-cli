// Explicit action type definitions
import type {Track} from './youtube-music.types.ts';

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

export interface ToggleShuffleAction {
	readonly category: 'TOGGLE_SHUFFLE';
}

export interface ToggleRepeatAction {
	readonly category: 'TOGGLE_REPEAT';
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

export interface SetLoadingAction {
	readonly category: 'SET_LOADING';
	loading: boolean;
}

export interface SetErrorAction {
	readonly category: 'SET_ERROR';
	error: string | null;
}
