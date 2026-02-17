// Player store type definitions
import type {
	PlayAction,
	PauseAction,
	ResumeAction,
	StopAction,
	NextAction,
	PreviousAction,
	SeekAction,
	SetVolumeAction,
	VolumeUpAction,
	VolumeDownAction,
	ToggleShuffleAction,
	ToggleRepeatAction,
	SetQueueAction,
	AddToQueueAction,
	RemoveFromQueueAction,
	ClearQueueAction,
	SetQueuePositionAction,
	UpdateProgressAction,
	TickAction,
	SetLoadingAction,
	SetErrorAction,
} from './actions.ts';

import type {Track} from './youtube-music.types.ts';

export interface PlayerState {
	currentTrack: Track | null;
	isPlaying: boolean;
	volume: number;
	progress: number;
	duration: number;
	queue: Track[];
	queuePosition: number;
	repeat: 'off' | 'all' | 'one';
	shuffle: boolean;
	isLoading: boolean;
	error: string | null;
}

export type PlayerAction =
	| PlayAction
	| PauseAction
	| ResumeAction
	| StopAction
	| NextAction
	| PreviousAction
	| SeekAction
	| SetVolumeAction
	| VolumeUpAction
	| VolumeDownAction
	| ToggleShuffleAction
	| ToggleRepeatAction
	| SetQueueAction
	| AddToQueueAction
	| RemoveFromQueueAction
	| ClearQueueAction
	| SetQueuePositionAction
	| UpdateProgressAction
	| TickAction
	| SetLoadingAction
	| SetErrorAction;
