import {spawn} from 'node:child_process';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';
import {appendYtDlpCookieArgs} from '../player/ytdl-cookies.ts';

/**
 * Resolve a direct audio URL via yt-dlp (`-g`). Used when youtubei.js cannot
 * decipher formats (SABR / empty cipher — "No valid URL to decipher").
 */
export async function getYtDlpStreamUrl(videoId: string): Promise<string> {
	const config = getConfigService();
	const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
	const args = [
		'-f',
		'ba/bestaudio/best',
		'-g',
		'--no-playlist',
		'--no-warnings',
	];
	appendYtDlpCookieArgs(args, {
		cookiesFile: config.get('cookiesFile'),
		cookiesFromBrowser: config.get('cookiesFromBrowser'),
	});
	args.push(watchUrl);

	logger.debug('YtDlpStreamUrl', 'Resolving stream URL', {videoId});

	return new Promise((resolve, reject) => {
		const child = spawn('yt-dlp', args, {
			windowsHide: true,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', error => {
			reject(
				new Error(
					`yt-dlp failed to start: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		});

		child.on('close', code => {
			const url = stdout
				.split(/\r?\n/)
				.map(line => line.trim())
				.find(
					line => line.startsWith('http://') || line.startsWith('https://'),
				);

			if (code === 0 && url) {
				logger.info('YtDlpStreamUrl', 'Resolved stream URL via yt-dlp', {
					videoId,
					urlLength: url.length,
				});
				resolve(url);
				return;
			}

			reject(
				new Error(
					`yt-dlp -g failed (code ${code ?? 'null'}): ${stderr.trim() || 'no url'}`,
				),
			);
		});
	});
}
