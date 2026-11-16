import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';
import {refreshAll} from './smart-playlist.service.ts';

export function maybeRefreshSmartPlaylistsOnLaunch(): void {
	const enabled =
		getConfigService().get('smartPlaylistsRefreshOnLaunch') ?? false;
	if (!enabled) {
		return;
	}

	void refreshAll()
		.then(results => {
			logger.info('SmartPlaylistBoot', 'Refreshed smart playlists on launch', {
				count: results.length,
			});
		})
		.catch((error: unknown) => {
			logger.warn('SmartPlaylistBoot', 'Smart playlist launch refresh failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
}
