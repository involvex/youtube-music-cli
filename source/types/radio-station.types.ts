export interface RadioStation {
	id: string;
	name: string;
	streamUrl: string;
	region?: string;
	genre?: string;
	source?: 'builtin' | 'radio-browser';
	stationuuid?: string;
}

export interface StreamNowPlaying {
	title: string | null;
	artist: string | null;
	raw: string | null;
}

export type PlaybackMode = 'youtube' | 'stream';

export type RadioCountryOption = {
	code: string;
	label: string;
};

export const RADIO_COUNTRY_OPTIONS: readonly RadioCountryOption[] = [
	{code: 'DE', label: 'Germany'},
	{code: 'AT', label: 'Austria'},
	{code: 'CH', label: 'Switzerland'},
	{code: 'US', label: 'United States'},
	{code: 'GB', label: 'United Kingdom'},
	{code: 'FR', label: 'France'},
	{code: 'NL', label: 'Netherlands'},
	{code: 'ALL', label: 'All countries'},
] as const;

export type RadioBrowserCacheFile = {
	schemaVersion: number;
	updatedAt: string;
	entries: Record<
		string,
		{
			fetchedAt: string;
			stations: RadioStation[];
		}
	>;
};

export type RadioFavoritesFile = {
	schemaVersion: number;
	stations: RadioStation[];
	lastUpdated: string;
};
