// Offline mode service with periodic network health checks
import {logger} from '../logger/logger.service.ts';
import {
	loadDownloadsIndex,
	type DownloadsIndex,
} from '../../utils/local-track.ts';

// Configurable network check interval (default: 30 seconds for periodic checks)
export const NETWORK_CHECK_INTERVAL = 30_000;

export type OfflineTrack = {
	videoId: string;
	title: string;
	artists: Array<{name: string}>;
	duration?: number;
	localPath: string;
};

export type OfflineState = {
	isOffline: boolean;
	offlineTracks: OfflineTrack[];
	lastNetworkCheck: number;
};

let offlineState: OfflineState = {
	isOffline: false,
	offlineTracks: [],
	lastNetworkCheck: 0,
};

let offlineListeners: ((state: OfflineState) => void)[] = [];
let networkCheckInterval: NodeJS.Timeout | null = null;
let isPeriodicChecksRunning = false;

/**
 * Check if network is available by attempting a simple fetch
 */
export async function checkNetworkStatus(): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);

		const response = await fetch('https://www.youtube.com/', {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; youtube-music-cli)',
			},
		});

		clearTimeout(timeoutId);

		if (response.ok || response.status === 403 || response.status === 429) {
			return true;
		}

		logger.debug('OfflineMode', `Network check failed: ${response.status}`);
		return false;
	} catch (error) {
		logger.debug('OfflineMode', 'Network check error', {
			error: error instanceof Error ? error.message : String(error),
		});
		return false;
	}
}

/**
 * Get tracks that are available locally (downloaded)
 */
export function getLocalTracks(): OfflineTrack[] {
	const index: DownloadsIndex = loadDownloadsIndex();
	const localTracks: OfflineTrack[] = [];

	for (const [videoId, entry] of Object.entries(index.tracks)) {
		if (entry.path) {
			localTracks.push({
				videoId,
				title:
					entry.path
						.split('/')
						.pop()
						?.replace(/\.[^.]+$/, '') || videoId,
				artists: [],
				localPath: entry.path,
			});
		}
	}

	return localTracks;
}

/**
 * Set the offline state and notify listeners
 */
export function setOfflineState(state: Partial<OfflineState>): void {
	offlineState = {...offlineState, ...state};
	notifyListeners();
}

/**
 * Subscribe to offline state changes
 */
export function subscribeToOffline(
	fn: (state: OfflineState) => void,
): () => void {
	offlineListeners.push(fn);
	fn(offlineState);

	return () => {
		offlineListeners = offlineListeners.filter(listener => listener !== fn);
	};
}

/**
 * Notify all listeners
 */
function notifyListeners(): void {
	for (const listener of offlineListeners) {
		try {
			listener(offlineState);
		} catch {
			// Ignore listener errors
		}
	}
}

/**
 * Get the current offline state
 */
export function getOfflineState(): OfflineState {
	return {...offlineState};
}

/**
 * Check if a track is available locally
 */
export function isTrackAvailableLocally(videoId: string): boolean {
	const index = loadDownloadsIndex();
	return videoId in index.tracks && !!index.tracks[videoId]?.path;
}

/**
 * Start periodic network health checks
 */
export function startPeriodicNetworkChecks(): void {
	// Prevent multiple intervals from running
	if (isPeriodicChecksRunning) {
		logger.debug('OfflineMode', 'Periodic checks already running, skipping');
		return;
	}

	if (networkCheckInterval) {
		clearInterval(networkCheckInterval);
	}

	isPeriodicChecksRunning = true;
	networkCheckInterval = setInterval(async () => {
		const isOffline = !(await checkNetworkStatus());
		setOfflineState({
			isOffline,
			lastNetworkCheck: Date.now(),
			offlineTracks: isOffline ? getLocalTracks() : [],
		});

		logger.debug(
			'OfflineMode',
			`Periodic network check - offline: ${isOffline}`,
		);
	}, NETWORK_CHECK_INTERVAL);
}

/**
 * Stop periodic network health checks
 */
export function stopPeriodicNetworkChecks(): void {
	if (networkCheckInterval) {
		clearInterval(networkCheckInterval);
		networkCheckInterval = null;
	}
	isPeriodicChecksRunning = false;
}

/**
 * Initialize offline mode - check network status and start periodic checks
 */
export async function initOfflineMode(): Promise<OfflineState> {
	// Initial network check
	const isOffline = !(await checkNetworkStatus());
	const localTracks = isOffline ? getLocalTracks() : [];

	setOfflineState({
		isOffline,
		lastNetworkCheck: Date.now(),
		offlineTracks: localTracks,
	});

	logger.info(
		'OfflineMode',
		`Initial network check complete - offline: ${isOffline}, local tracks: ${localTracks.length}`,
	);

	// Start periodic checks
	startPeriodicNetworkChecks();

	return getOfflineState();
}

/**
 * Refresh offline state manually
 */
export async function refreshOfflineState(): Promise<OfflineState> {
	const isOffline = !(await checkNetworkStatus());
	const localTracks = isOffline ? getLocalTracks() : [];

	setOfflineState({
		isOffline,
		lastNetworkCheck: Date.now(),
		offlineTracks: localTracks,
	});

	return getOfflineState();
}

/**
 * Reset offline state for testing purposes
 */
export function resetOfflineStateForTests(): void {
	offlineState = {
		isOffline: false,
		offlineTracks: [],
		lastNetworkCheck: 0,
	};
	offlineListeners = [];
	isPeriodicChecksRunning = false;

	if (networkCheckInterval) {
		clearInterval(networkCheckInterval);
		networkCheckInterval = null;
	}
}
