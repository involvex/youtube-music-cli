// Player state persistence service
import {writeFile, readFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {logger} from '../logger/logger.service.ts';
import type {Track} from '../../types/youtube-music.types.ts';

const STATE_FILE = join(CONFIG_DIR, 'player-state.json');
const SCHEMA_VERSION = 1;

export interface PersistedPlayerState {
	schemaVersion: number;
	currentTrack: Track | null;
	queue: Track[];
	queuePosition: number;
	progress: number; // Time position in seconds
	volume: number;
	shuffle: boolean;
	repeat: 'off' | 'all' | 'one';
	autoplay?: boolean;
	lastUpdated: string; // ISO timestamp
}

const defaultState: PersistedPlayerState = {
	schemaVersion: SCHEMA_VERSION,
	currentTrack: null,
	queue: [],
	queuePosition: 0,
	progress: 0,
	volume: 70,
	shuffle: false,
	repeat: 'off',
	autoplay: true,
	lastUpdated: new Date().toISOString(),
};

let saveLock = Promise.resolve();

/**
 * Saves player state to disk
 */
export async function savePlayerState(
	state: Partial<PersistedPlayerState>,
): Promise<void> {
	// Mutex: Wait for previous save to finish
	const currentLock = saveLock;
	let releaseLock: () => void = () => {};
	const newLock = new Promise<void>(resolve => {
		releaseLock = resolve;
	});
	saveLock = newLock;

	// Wait for the previous operation to complete
	await currentLock.catch(() => {});

	try {
		// Ensure config directory exists
		if (!existsSync(CONFIG_DIR)) {
			await mkdir(CONFIG_DIR, {recursive: true});
			logger.debug('PlayerStateService', 'Created config directory', {
				path: CONFIG_DIR,
			});
		}

		// Merge with default state
		const stateToSave: PersistedPlayerState = {
			...defaultState,
			...state,
			schemaVersion: SCHEMA_VERSION,
			lastUpdated: new Date().toISOString(),
		};

		// Write to temporary file first, then rename for atomic write
		const tempFile = `${STATE_FILE}.tmp`;
		await writeFile(tempFile, JSON.stringify(stateToSave, null, 2), 'utf8');

		// On Windows, we need to handle the rename differently
		if (process.platform === 'win32' && existsSync(STATE_FILE)) {
			// Delete existing file first on Windows
			await import('node:fs/promises').then(async fs => {
				await fs.unlink(STATE_FILE);
			});
		}

		await import('node:fs/promises').then(async fs => {
			await fs.rename(tempFile, STATE_FILE);
		});

		logger.debug('PlayerStateService', 'Saved player state', {
			hasTrack: !!stateToSave.currentTrack,
			queueLength: stateToSave.queue.length,
			progress: stateToSave.progress,
		});
	} catch (error) {
		logger.error('PlayerStateService', 'Failed to save player state', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	} finally {
		releaseLock();
	}
}

/**
 * Loads player state from disk
 */
export async function loadPlayerState(): Promise<PersistedPlayerState | null> {
	try {
		if (!existsSync(STATE_FILE)) {
			logger.debug('PlayerStateService', 'No saved state file found');
			return null;
		}

		const data = await readFile(STATE_FILE, 'utf8');
		const state = JSON.parse(data) as PersistedPlayerState;

		// Validate schema version
		if (state.schemaVersion !== SCHEMA_VERSION) {
			logger.warn('PlayerStateService', 'Schema version mismatch', {
				expected: SCHEMA_VERSION,
				found: state.schemaVersion,
			});
			return null;
		}

		// Validate state structure
		if (!state || typeof state !== 'object') {
			logger.warn('PlayerStateService', 'Invalid state structure');
			return null;
		}

		// Merge with default state to ensure no missing properties (e.g. volume or autoplay)
		const mergedState = {
			...defaultState,
			...state,
		};

		logger.info('PlayerStateService', 'Loaded player state', {
			hasTrack: !!mergedState.currentTrack,
			queueLength: mergedState.queue?.length ?? 0,
			progress: mergedState.progress,
			lastUpdated: mergedState.lastUpdated,
		});

		return mergedState;
	} catch (error) {
		logger.error('PlayerStateService', 'Failed to load player state', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return null;
	}
}

/**
 * Clears saved player state
 */
export async function clearPlayerState(): Promise<void> {
	try {
		if (existsSync(STATE_FILE)) {
			await import('node:fs/promises').then(async fs => {
				await fs.unlink(STATE_FILE);
			});
			logger.info('PlayerStateService', 'Cleared player state');
		}
	} catch (error) {
		logger.error('PlayerStateService', 'Failed to clear player state', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
