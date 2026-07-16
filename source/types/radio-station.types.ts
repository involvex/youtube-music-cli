export interface RadioStation {
	id: string;
	name: string;
	streamUrl: string;
	region?: string;
	genre?: string;
}

export type PlaybackMode = 'youtube' | 'stream';
