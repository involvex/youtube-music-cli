// Player store type definitions
import type {RadioSeed} from './radio.types.ts';
import type {Track} from './youtube-music.types.ts';
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
	VolumeFineUpAction,
	VolumeFineDownAction,
	ToggleShuffleAction,
	ToggleRepeatAction,
	ToggleAutoplayAction,
	SetQueueAction,
	AddToQueueAction,
	RemoveFromQueueAction,
	ClearQueueAction,
	SetQueuePositionAction,
	UpdateProgressAction,
	SetDurationAction,
	TickAction,
	SetLoadingAction,
	SetErrorAction,
	RestoreStateAction,
	SetSpeedAction,
	StartRadioAction,
	StopRadioAction,
} from './actions.ts';

export interface PlayerState {
	currentTrack: Track | null;
	isPlaying: boolean;
	volume: number;
	speed: number;
	progress: number;
	duration: number;
	queue: Track[];
	queuePosition: number;
	repeat: 'off' | 'all' | 'one';
	shuffle: boolean;
	autoplay: boolean;
	isLoading: boolean;
	error: string | null;
	playRequestId: number;
	abLoop: {a: number | null; b: number | null};
	subtitle: string | null;
	radioIsActive: boolean;
	radioSeed: RadioSeed | null;
	explicitQueueLength: number;
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
	| VolumeFineUpAction
	| VolumeFineDownAction
	| ToggleShuffleAction
	| ToggleRepeatAction
	| ToggleAutoplayAction
	| SetQueueAction
	| AddToQueueAction
	| RemoveFromQueueAction
	| ClearQueueAction
	| SetQueuePositionAction
	| UpdateProgressAction
	| SetDurationAction
	| TickAction
	| SetLoadingAction
	| SetErrorAction
	| RestoreStateAction
	| SetSpeedAction
	| SetSpeedAction
	| import('./actions.ts').SetABLoopAction
	| import('./actions.ts').SetSubtitleAction
	| StartRadioAction
	| StopRadioAction
	| import('./actions.ts').ToggleRadioAction;
