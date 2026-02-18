// Plugin audio API integration - hooks for audio stream modification
import {getPluginHooksService} from './plugin-hooks.service.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {logger} from '../logger/logger.service.ts';

/**
 * Transform audio URL through all enabled plugins
 */
export async function transformAudioUrl(
	url: string,
	track: Track,
): Promise<string> {
	const hooksService = getPluginHooksService();

	// Emit stream-request event
	await hooksService.emit(
		hooksService.createAudioStreamEvent('stream-request', {url, track}),
	);

	// For now, return original URL
	// Plugins will register handlers that can modify this
	return url;
}

/**
 * Notify plugins of stream start
 */
export function notifyStreamStart(url: string, track: Track): void {
	const hooksService = getPluginHooksService();
	hooksService.emitSync(
		hooksService.createAudioStreamEvent('stream-start', {url, track}),
	);
}

/**
 * Notify plugins of stream end
 */
export function notifyStreamEnd(track: Track): void {
	const hooksService = getPluginHooksService();
	hooksService.emitSync(
		hooksService.createAudioStreamEvent('stream-end', {track}),
	);
}

/**
 * Notify plugins of stream error
 */
export function notifyStreamError(error: Error, track?: Track): void {
	const hooksService = getPluginHooksService();
	hooksService.emitSync(
		hooksService.createAudioStreamEvent('stream-error', {error, track}),
	);
	logger.error('AudioAPI', 'Stream error:', error);
}
