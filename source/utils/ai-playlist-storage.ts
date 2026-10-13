import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {CONFIG_DIR} from '../utils/constants.ts';
import type {AIPlaylist} from '../types/ai-playlist.types.ts';

const STORAGE_FILE = `${CONFIG_DIR}/ai-playlists.json`;

function ensureDir(): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, {recursive: true});
	}
}

export function loadAIPlaylists(): AIPlaylist[] {
	ensureDir();
	if (!existsSync(STORAGE_FILE)) {
		return [];
	}
	try {
		const content = readFileSync(STORAGE_FILE, 'utf8');
		const parsed = JSON.parse(content) as AIPlaylist[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveAIPlaylist(playlist: AIPlaylist): void {
	ensureDir();
	const playlists = loadAIPlaylists();
	const idx = playlists.findIndex(p => p.id === playlist.id);
	if (idx >= 0) {
		playlists[idx] = playlist;
	} else {
		playlists.push(playlist);
	}
	writeFileSync(STORAGE_FILE, JSON.stringify(playlists, null, 2));
}

export function deleteAIPlaylist(id: string): void {
	const playlists = loadAIPlaylists().filter(p => p.id !== id);
	writeFileSync(STORAGE_FILE, JSON.stringify(playlists, null, 2));
}
