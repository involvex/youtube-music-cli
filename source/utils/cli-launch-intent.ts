import type {Flags} from '../types/cli.types.ts';

/**
 * CLI intents that should replace persisted player media instead of restoring it.
 */
export function hasCliPlaybackLaunchIntent(flags?: Flags): boolean {
	return Boolean(flags?.radioSeed || flags?.playTrack || flags?.playPlaylist);
}
