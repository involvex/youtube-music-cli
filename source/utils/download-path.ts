import {mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Expand ~ / $HOME and resolve to an absolute download directory path.
 * Throws if the input is empty after trim.
 */
export function normalizeDownloadDirectory(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error('Download folder cannot be empty');
	}

	let expanded = trimmed;
	if (expanded === '~') {
		expanded = os.homedir();
	} else if (expanded.startsWith('~/') || expanded.startsWith('~\\')) {
		expanded = path.join(os.homedir(), expanded.slice(2));
	} else if (expanded.startsWith('$HOME/') || expanded.startsWith('$HOME\\')) {
		expanded = path.join(os.homedir(), expanded.slice('$HOME/'.length));
	} else if (expanded === '$HOME') {
		expanded = os.homedir();
	}

	return path.resolve(expanded);
}

/**
 * Normalize a download directory and create it if missing.
 */
export function ensureDownloadDirectory(input: string): string {
	const normalized = normalizeDownloadDirectory(input);
	mkdirSync(normalized, {recursive: true});
	return normalized;
}
