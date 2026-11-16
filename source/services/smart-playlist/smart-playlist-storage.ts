import {mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {formatError} from '../../utils/error.ts';
import type {
	SmartPlaylistDefinition,
	SmartPlaylistsFile,
} from '../../types/smart-playlist.types.ts';
import {logger} from '../logger/logger.service.ts';

const SCHEMA_VERSION = 1;

let smartPlaylistsFilePathOverride: string | null = null;
let hydrated = false;
let saveLock = Promise.resolve();

function getSmartPlaylistsFilePath(): string {
	return (
		smartPlaylistsFilePathOverride ?? join(CONFIG_DIR, 'smart-playlists.json')
	);
}

export const BUILTIN_SMART_PLAYLISTS: readonly SmartPlaylistDefinition[] = [
	{
		id: 'top_tracks_7d',
		name: 'Smart: Top This Week',
		rule: 'top_tracks_7d',
		params: {limit: 25, days: 7},
		autoRefresh: 'manual',
	},
	{
		id: 'top_tracks_all',
		name: 'Smart: Top Tracks',
		rule: 'top_tracks_all',
		params: {limit: 40},
		autoRefresh: 'manual',
	},
	{
		id: 'rediscover',
		name: 'Smart: Rediscover',
		rule: 'rediscover',
		params: {limit: 25, days: 14, minPlays: 2},
		autoRefresh: 'manual',
	},
	{
		id: 'top_artist_deep_dive',
		name: 'Smart: Top Artist Deep Dive',
		rule: 'top_artist_deep_dive',
		params: {limit: 30},
		autoRefresh: 'manual',
	},
] as const;

function emptyFile(): SmartPlaylistsFile {
	return {
		schemaVersion: SCHEMA_VERSION,
		definitions: [],
		lastUpdated: new Date().toISOString(),
	};
}

function isDefinition(value: unknown): value is SmartPlaylistDefinition {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const def = value as SmartPlaylistDefinition;
	return (
		typeof def.id === 'string' &&
		def.id.length > 0 &&
		typeof def.name === 'string' &&
		def.name.length > 0 &&
		typeof def.rule === 'string'
	);
}

export function parseSmartPlaylistsFileContent(
	data: unknown,
): SmartPlaylistsFile {
	if (!data || typeof data !== 'object') {
		return emptyFile();
	}

	const persisted = data as Partial<SmartPlaylistsFile>;
	const definitions = Array.isArray(persisted.definitions)
		? persisted.definitions.filter(isDefinition)
		: [];

	return {
		schemaVersion:
			typeof persisted.schemaVersion === 'number'
				? persisted.schemaVersion
				: SCHEMA_VERSION,
		definitions,
		lastUpdated:
			typeof persisted.lastUpdated === 'string'
				? persisted.lastUpdated
				: new Date().toISOString(),
	};
}

export function ensureBuiltinDefinitions(
	file: SmartPlaylistsFile,
): SmartPlaylistsFile {
	const byId = new Map(file.definitions.map(d => [d.id, d]));
	let changed = false;

	for (const builtin of BUILTIN_SMART_PLAYLISTS) {
		if (!byId.has(builtin.id)) {
			byId.set(builtin.id, {...builtin});
			changed = true;
		}
	}

	if (!changed) {
		return file;
	}

	return {
		...file,
		definitions: [...byId.values()],
		lastUpdated: new Date().toISOString(),
	};
}

export async function loadSmartPlaylistsFile(): Promise<SmartPlaylistsFile> {
	const filePath = getSmartPlaylistsFilePath();
	if (!existsSync(filePath)) {
		hydrated = true;
		return ensureBuiltinDefinitions(emptyFile());
	}

	try {
		const raw = await readFile(filePath, 'utf8');
		const parsed = parseSmartPlaylistsFileContent(JSON.parse(raw) as unknown);
		hydrated = true;
		return ensureBuiltinDefinitions(parsed);
	} catch (error) {
		logger.warn('SmartPlaylistStorage', 'Failed to load smart-playlists.json', {
			error: formatError(error),
		});
		hydrated = true;
		return ensureBuiltinDefinitions(emptyFile());
	}
}

export async function saveSmartPlaylistsFile(
	file: SmartPlaylistsFile,
	options?: {allowEmptyOverwrite?: boolean},
): Promise<void> {
	const filePath = getSmartPlaylistsFilePath();
	const currentLock = saveLock;
	let releaseLock: () => void = () => {};
	const newLock = new Promise<void>(resolve => {
		releaseLock = resolve;
	});
	saveLock = newLock;

	await currentLock.catch(() => {});

	try {
		if (
			file.definitions.length === 0 &&
			!options?.allowEmptyOverwrite &&
			(!hydrated || existsSync(filePath))
		) {
			if (existsSync(filePath)) {
				try {
					const existingRaw = await readFile(filePath, 'utf8');
					const existing = parseSmartPlaylistsFileContent(
						JSON.parse(existingRaw) as unknown,
					);
					if (existing.definitions.length > 0) {
						logger.warn(
							'SmartPlaylistStorage',
							'Refusing to overwrite non-empty smart-playlists with empty list',
						);
						return;
					}
				} catch {
					// Fall through and write
				}
			} else if (!hydrated) {
				logger.debug(
					'SmartPlaylistStorage',
					'Refusing empty overwrite before hydration',
				);
				return;
			}
		}

		const dir = join(filePath, '..');
		if (!existsSync(dir)) {
			await mkdir(dir, {recursive: true});
		}

		const payload: SmartPlaylistsFile = {
			schemaVersion: SCHEMA_VERSION,
			definitions: file.definitions,
			lastUpdated: new Date().toISOString(),
		};

		const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
		await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
		try {
			await rename(tempPath, filePath);
		} catch {
			await writeFile(
				filePath,
				`${JSON.stringify(payload, null, 2)}\n`,
				'utf8',
			);
			await unlink(tempPath).catch(() => {});
		}
		hydrated = true;
	} finally {
		releaseLock();
	}
}

export function setSmartPlaylistsFilePathForTests(path: string | null): void {
	smartPlaylistsFilePathOverride = path;
	hydrated = false;
}

export function resetSmartPlaylistsStorageForTests(): void {
	smartPlaylistsFilePathOverride = null;
	hydrated = false;
	saveLock = Promise.resolve();
}
