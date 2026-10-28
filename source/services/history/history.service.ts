import {mkdir, readFile, writeFile, unlink, rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {formatError} from '../../utils/error.ts';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';
import type {
	HistoryEntry,
	PersistedHistory,
} from '../../types/history.types.ts';
import type {Track} from '../../types/youtube-music.types.ts';

const HISTORY_FILE = join(CONFIG_DIR, 'history.json');
const SCHEMA_VERSION = 1;
/** 0 = unlimited (no trim). Positive values keep only the newest N plays. */
export const DEFAULT_MAX_HISTORY_ENTRIES = 0;

const defaultHistory: PersistedHistory = {
	schemaVersion: SCHEMA_VERSION,
	entries: [],
	lastUpdated: new Date().toISOString(),
};

let saveLock = Promise.resolve();

export function getMaxHistoryEntries(): number {
	const configured = getConfigService().get('maxHistoryEntries');
	if (
		typeof configured === 'number' &&
		Number.isFinite(configured) &&
		configured >= 0
	) {
		return Math.floor(configured);
	}
	return DEFAULT_MAX_HISTORY_ENTRIES;
}

export function trimHistoryEntries(
	entries: HistoryEntry[],
	maxEntries: number = getMaxHistoryEntries(),
): HistoryEntry[] {
	if (maxEntries <= 0 || entries.length <= maxEntries) {
		return entries;
	}
	return entries.slice(0, maxEntries);
}

export async function saveHistory(
	entries: HistoryEntry[],
	options?: {allowEmptyOverwrite?: boolean},
): Promise<void> {
	const currentLock = saveLock;
	let releaseLock: () => void = () => {};
	const newLock = new Promise<void>(resolve => {
		releaseLock = resolve;
	});
	saveLock = newLock;

	await currentLock.catch(() => {});

	try {
		const trimmed = trimHistoryEntries(entries);
		if (
			trimmed.length === 0 &&
			!options?.allowEmptyOverwrite &&
			existsSync(HISTORY_FILE)
		) {
			logger.debug(
				'HistoryService',
				'Refusing empty history overwrite before hydration',
			);
			return;
		}

		if (!existsSync(CONFIG_DIR)) {
			await mkdir(CONFIG_DIR, {recursive: true});
		}

		const stateToSave: PersistedHistory = {
			...defaultHistory,
			entries: trimmed,
			lastUpdated: new Date().toISOString(),
		};

		const tempFile = `${HISTORY_FILE}.tmp.${Date.now()}`;
		await writeFile(tempFile, JSON.stringify(stateToSave, null, 2), 'utf8');

		if (process.platform === 'win32' && existsSync(HISTORY_FILE)) {
			await unlink(HISTORY_FILE);
		}

		await rename(tempFile, HISTORY_FILE);

		logger.debug('HistoryService', 'Saved listening history', {
			count: trimmed.length,
		});
	} catch (error) {
		logger.error('HistoryService', 'Failed to save listening history', {
			error: formatError(error),
		});
	} finally {
		releaseLock();
	}
}

export async function loadHistory(): Promise<HistoryEntry[]> {
	try {
		if (!existsSync(HISTORY_FILE)) {
			logger.debug('HistoryService', 'No history file found');
			return [];
		}

		const data = await readFile(HISTORY_FILE, 'utf8');
		const persisted = JSON.parse(data) as PersistedHistory;

		if (persisted.schemaVersion !== SCHEMA_VERSION) {
			logger.warn('HistoryService', 'Schema version mismatch', {
				expected: SCHEMA_VERSION,
				found: persisted.schemaVersion,
			});
			return [];
		}

		if (!Array.isArray(persisted.entries)) {
			logger.warn('HistoryService', 'Invalid history format, resetting');
			return [];
		}

		const trimmed = trimHistoryEntries(persisted.entries);
		if (trimmed.length !== persisted.entries.length) {
			await saveHistory(trimmed, {allowEmptyOverwrite: true});
		}

		logger.info('HistoryService', 'Loaded listening history', {
			count: trimmed.length,
			lastUpdated: persisted.lastUpdated,
		});

		return trimmed;
	} catch (error) {
		logger.error('HistoryService', 'Failed to load listening history', {
			error: formatError(error),
		});
		return [];
	}
}

/** Append a play for immersive (and other non-React) callers. */
export async function recordListeningHistoryPlay(track: Track): Promise<void> {
	const entry: HistoryEntry = {
		track,
		playedAt: new Date().toISOString(),
	};
	const existing = await loadHistory();
	await saveHistory([entry, ...existing], {allowEmptyOverwrite: true});
}

export async function clearHistory(): Promise<void> {
	try {
		if (existsSync(HISTORY_FILE)) {
			await unlink(HISTORY_FILE);
			logger.info('HistoryService', 'Cleared listening history');
		}
	} catch (error) {
		logger.error('HistoryService', 'Failed to clear listening history', {
			error: formatError(error),
		});
	}
}
