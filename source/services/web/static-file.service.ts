// Static file serving service for web UI
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {
	dirname,
	extname,
	isAbsolute,
	join,
	normalize,
	relative,
	resolve,
	sep,
} from 'node:path';
import {fileURLToPath} from 'node:url';
import {logger} from '../logger/logger.service.ts';

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.eot': 'application/vnd.ms-fontobject',
};

/**
 * Resolve the web UI dist directory by probing known layouts.
 * Prefers the first candidate that contains index.html.
 */
export function resolveWebDistDir(
	moduleUrl: string,
	cwd: string,
	execPath: string = process.execPath,
): string {
	const currentFile = fileURLToPath(moduleUrl);
	const currentDir = dirname(currentFile);
	const candidates = [
		// Bundled CLI: dist/source/cli.js → dist/web
		join(currentDir, '..', 'web'),
		// Unbundled: source/services/web/*.ts → projectRoot/dist/web
		join(currentDir, '..', '..', '..', 'dist', 'web'),
		// Compiled binary sibling: <exeDir>/web
		join(dirname(execPath), 'web'),
		// CWD fallback (dev / monorepo)
		join(cwd, 'dist', 'web'),
	];

	for (const dir of candidates) {
		if (existsSync(join(dir, 'index.html'))) {
			return dir;
		}
	}

	return candidates[0]!;
}

class StaticFileService {
	private webDistDir: string;
	private indexHtml: string | null = null;
	private indexHtmlLoaded = false;

	constructor() {
		this.webDistDir = resolveWebDistDir(import.meta.url, process.cwd());

		logger.debug('StaticFileService', 'Path resolved', {
			webDistDir: this.webDistDir,
			exists: existsSync(this.webDistDir),
		});
	}

	/**
	 * Get MIME type for a file extension
	 */
	private getMimeType(filePath: string): string {
		const ext = extname(filePath).toLowerCase();
		return MIME_TYPES[ext] || 'application/octet-stream';
	}

	private resolveSafeFilePath(urlPath: string): string | null {
		let decodedPath: string;
		try {
			decodedPath = decodeURIComponent(urlPath);
		} catch {
			return null;
		}

		const relativePath = normalize(decodedPath).replace(/^[\\/]+/, '');
		const rootPath = resolve(this.webDistDir);
		const resolvedPath = resolve(rootPath, relativePath);

		// A bare startsWith() would also accept siblings like `<root>-old/...`
		const relativeToRoot = relative(rootPath, resolvedPath);
		if (
			relativeToRoot === '..' ||
			relativeToRoot.startsWith(`..${sep}`) ||
			isAbsolute(relativeToRoot)
		) {
			return null;
		}

		return resolvedPath;
	}

	/**
	 * Load index.html into memory
	 */
	private async loadIndexHtml(): Promise<void> {
		if (this.indexHtmlLoaded) return;

		const indexPath = join(this.webDistDir, 'index.html');

		try {
			const buffer = await readFile(indexPath);
			this.indexHtml = buffer.toString('utf-8');
			this.indexHtmlLoaded = true;
			logger.info('StaticFileService', 'index.html loaded');
		} catch (error) {
			logger.error('StaticFileService', 'Failed to load index.html', {
				indexPath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Serve a static file
	 */
	async serve(
		url: string,
		_req: unknown,
		res: {
			writeHead: (statusCode: number, headers?: Record<string, string>) => void;
			end: (data?: string | Buffer) => void;
		},
	): Promise<void> {
		// Remove query string
		const urlPath = url.split('?')[0] ?? '/';

		// Serve index.html for SPA routes
		if (urlPath === '/' || !urlPath.includes('.')) {
			// Ensure index.html is loaded
			if (!this.indexHtmlLoaded) {
				await this.loadIndexHtml();
			}

			if (this.indexHtml) {
				res.writeHead(200, {
					'Content-Type': 'text/html',
					'Cache-Control': 'public, max-age=3600',
				});
				res.end(this.indexHtml);
			} else {
				res.writeHead(503, {'Content-Type': 'text/html'});
				res.end(`
					<!DOCTYPE html>
					<html>
					<head><title>Web UI Missing</title></head>
					<body>
						<h1>Web UI Missing</h1>
						<p>Web UI missing from this install. Rebuild with <code>bun run build</code>.</p>
					</body>
					</html>
				`);
			}
			return;
		}

		// Serve static files
		const filePath = this.resolveSafeFilePath(urlPath);
		if (!filePath) {
			res.writeHead(400, {'Content-Type': 'text/plain'});
			res.end('Bad Request');
			return;
		}

		try {
			if (!existsSync(filePath)) {
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.end('Not Found');
				return;
			}

			const content = await readFile(filePath);
			const mimeType = this.getMimeType(filePath);

			res.writeHead(200, {
				'Content-Type': mimeType,
				'Cache-Control': 'public, max-age=86400',
			});
			res.end(content);
		} catch (error) {
			logger.error('StaticFileService', 'Failed to serve file', {
				filePath,
				error: error instanceof Error ? error.message : String(error),
			});
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Internal Server Error');
		}
	}

	/**
	 * Check if web UI is built
	 */
	isWebUiBuilt(): boolean {
		const indexPath = join(this.webDistDir, 'index.html');
		return existsSync(indexPath);
	}

	/**
	 * Clear cached index.html (useful for development)
	 */
	clearCache(): void {
		this.indexHtml = null;
		this.indexHtmlLoaded = false;
		logger.debug('StaticFileService', 'Cache cleared');
	}
}

// Singleton instance
let staticFileServiceInstance: StaticFileService | null = null;

export function getStaticFileService(): StaticFileService {
	if (!staticFileServiceInstance) {
		staticFileServiceInstance = new StaticFileService();
	}
	return staticFileServiceInstance;
}

/** Test-only: reset singleton so path resolution can be re-evaluated. */
export function resetStaticFileServiceForTests(): void {
	staticFileServiceInstance = null;
}
