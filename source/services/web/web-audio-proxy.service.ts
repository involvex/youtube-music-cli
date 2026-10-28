import {createReadStream, existsSync, statSync} from 'node:fs';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {extname} from 'node:path';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';
import {getMusicService} from '../youtube-music/api.ts';
import {resolveLocalTrackPath} from '../../utils/local-track.ts';
import type {Track} from '../../types/youtube-music.types.ts';

const AUDIO_MIME: Record<string, string> = {
	'.mp3': 'audio/mpeg',
	'.m4a': 'audio/mp4',
	'.aac': 'audio/aac',
	'.ogg': 'audio/ogg',
	'.opus': 'audio/ogg',
	'.flac': 'audio/flac',
	'.wav': 'audio/wav',
	'.webm': 'audio/webm',
};

const VIDEO_ID_PATTERN = /^[\w-]{6,64}$/;

export function isWebAudioRequest(urlPath: string): boolean {
	return urlPath === '/audio' || urlPath.startsWith('/audio?');
}

function sendJsonError(
	res: ServerResponse,
	status: number,
	message: string,
): void {
	res.writeHead(status, {'Content-Type': 'application/json'});
	res.end(JSON.stringify({error: message}));
}

function mimeForPath(filePath: string): string {
	return AUDIO_MIME[extname(filePath).toLowerCase()] ?? 'audio/mpeg';
}

function streamLocalFile(
	filePath: string,
	req: IncomingMessage,
	res: ServerResponse,
): void {
	const stats = statSync(filePath);
	const total = stats.size;
	const mime = mimeForPath(filePath);
	const range = req.headers.range;

	if (range) {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range);
		if (!match) {
			res.writeHead(416, {'Content-Range': `bytes */${total}`});
			res.end();
			return;
		}

		const start = match[1] ? Number(match[1]) : 0;
		const end = match[2] ? Number(match[2]) : total - 1;
		if (
			Number.isNaN(start) ||
			Number.isNaN(end) ||
			start > end ||
			start >= total
		) {
			res.writeHead(416, {'Content-Range': `bytes */${total}`});
			res.end();
			return;
		}

		const chunkEnd = Math.min(end, total - 1);
		res.writeHead(206, {
			'Content-Range': `bytes ${start}-${chunkEnd}/${total}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunkEnd - start + 1,
			'Content-Type': mime,
			'Cache-Control': 'no-store',
		});
		createReadStream(filePath, {start, end: chunkEnd}).pipe(res);
		return;
	}

	res.writeHead(200, {
		'Content-Type': mime,
		'Content-Length': total,
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'no-store',
	});
	createReadStream(filePath).pipe(res);
}

async function proxyRemoteUrl(
	remoteUrl: string,
	req: IncomingMessage,
	res: ServerResponse,
): Promise<void> {
	const headers: Record<string, string> = {
		'User-Agent':
			req.headers['user-agent'] ??
			'Mozilla/5.0 (compatible; youtube-music-cli)',
		Accept: '*/*',
	};
	if (req.headers.range) {
		headers.Range = req.headers.range;
	}

	const upstream = await fetch(remoteUrl, {headers, redirect: 'follow'});
	if (!upstream.ok && upstream.status !== 206) {
		sendJsonError(
			res,
			upstream.status >= 400 ? upstream.status : 502,
			`Upstream audio failed (${upstream.status})`,
		);
		return;
	}

	const responseHeaders: Record<string, string | number> = {
		'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
		'Cache-Control': 'no-store',
		'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
	};
	const contentLength = upstream.headers.get('content-length');
	if (contentLength) {
		responseHeaders['Content-Length'] = contentLength;
	}
	const contentRange = upstream.headers.get('content-range');
	if (contentRange) {
		responseHeaders['Content-Range'] = contentRange;
	}

	res.writeHead(upstream.status, responseHeaders);

	if (!upstream.body) {
		res.end();
		return;
	}

	const reader = upstream.body.getReader();
	try {
		while (true) {
			const {done, value} = await reader.read();
			if (done) {
				break;
			}
			if (value) {
				const canContinue = res.write(Buffer.from(value));
				if (!canContinue) {
					await new Promise<void>(resolve => {
						res.once('drain', resolve);
					});
				}
			}
		}
		res.end();
	} catch (error) {
		logger.warn('WebAudioProxy', 'Proxy stream aborted', {
			error: error instanceof Error ? error.message : String(error),
		});
		res.destroy();
	}
}

/**
 * Handle GET /audio?videoId=… or GET /audio?url=… (http(s) radio/stream).
 * Returns true when the request was handled.
 */
export async function handleWebAudioRequest(
	req: IncomingMessage,
	res: ServerResponse,
): Promise<boolean> {
	const rawUrl = req.url ?? '/';
	const urlObj = new URL(rawUrl, 'http://localhost');
	if (urlObj.pathname !== '/audio') {
		return false;
	}

	if (req.method !== 'GET' && req.method !== 'HEAD') {
		sendJsonError(res, 405, 'Method not allowed');
		return true;
	}

	const videoId = urlObj.searchParams.get('videoId');
	const streamUrlParam = urlObj.searchParams.get('url');

	try {
		if (videoId) {
			if (!VIDEO_ID_PATTERN.test(videoId)) {
				sendJsonError(res, 400, 'Invalid videoId');
				return true;
			}

			const config = getConfigService();
			const stubTrack = {videoId, title: '', artists: []} as Track;
			const localPath = resolveLocalTrackPath(stubTrack, {
				downloadDirectory: config.get('downloadDirectory'),
				downloadFormat: config.get('downloadFormat') ?? 'mp3',
			});

			if (localPath && existsSync(localPath)) {
				if (req.method === 'HEAD') {
					const stats = statSync(localPath);
					res.writeHead(200, {
						'Content-Type': mimeForPath(localPath),
						'Content-Length': stats.size,
						'Accept-Ranges': 'bytes',
						'Cache-Control': 'no-store',
					});
					res.end();
					return true;
				}
				streamLocalFile(localPath, req, res);
				return true;
			}

			const remoteUrl = await getMusicService().getStreamUrl(videoId);
			if (req.method === 'HEAD') {
				res.writeHead(200, {
					'Content-Type': 'audio/mpeg',
					'Cache-Control': 'no-store',
				});
				res.end();
				return true;
			}
			await proxyRemoteUrl(remoteUrl, req, res);
			return true;
		}

		if (streamUrlParam) {
			let parsed: URL;
			try {
				parsed = new URL(streamUrlParam);
			} catch {
				sendJsonError(res, 400, 'Invalid stream url');
				return true;
			}
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				sendJsonError(res, 400, 'Only http(s) stream urls allowed');
				return true;
			}
			if (req.method === 'HEAD') {
				res.writeHead(200, {
					'Content-Type': 'audio/mpeg',
					'Cache-Control': 'no-store',
				});
				res.end();
				return true;
			}
			await proxyRemoteUrl(parsed.toString(), req, res);
			return true;
		}

		sendJsonError(res, 400, 'Missing videoId or url');
		return true;
	} catch (error) {
		logger.error('WebAudioProxy', 'Failed to serve audio', {
			error: error instanceof Error ? error.message : String(error),
			videoId,
		});
		if (!res.headersSent) {
			sendJsonError(res, 502, 'Failed to resolve audio');
		} else {
			res.destroy();
		}
		return true;
	}
}
