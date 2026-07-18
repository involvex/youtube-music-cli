// Player store type definitions
import type {RadioSeed} from './radio.types.ts';
import type {
	PlaybackMode,
	RadioStation,
	StreamNowPlaying,
} from './radio-station.types.ts';
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
	PlayStreamAction,
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
	playbackMode: PlaybackMode;
	currentStation: RadioStation | null;
	streamNowPlaying: StreamNowPlaying | null;
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
	| import('./actions.ts').SetStreamNowPlayingAction
	| StartRadioAction
	| StopRadioAction
	| import('./actions.ts').ToggleRadioAction
	| PlayStreamAction;
