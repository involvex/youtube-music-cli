// Static file serving service for web UI
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {extname, join, dirname, normalize, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {logger} from '../logger/logger.service.ts';

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.json': 'application/json',
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

class StaticFileService {
	private webDistDir: string;
	private indexHtml: string | null = null;
	private indexHtmlLoaded = false;

	constructor() {
		// Web UI is built to dist/web/ relative to the project root
		// Get the directory of the current file
		const currentFile = fileURLToPath(import.meta.url);
		const currentDir = dirname(currentFile);

		// Detect if running from dist/ or source/
		// dist/source/services/web -> need to go up 4 levels to reach project root
		// source/services/web -> need to go up 3 levels to reach project root
		const isDist =
			currentFile.includes('/dist/') || currentFile.includes('\\dist\\');

		let projectRoot: string;
		if (isDist) {
			// dist/source/services/web -> services/web -> services -> source -> dist -> project root
			projectRoot = join(currentDir, '..', '..', '..', '..');
		} else {
			// source/services/web -> services/web -> services -> source -> project root
			projectRoot = join(currentDir, '..', '..', '..');
		}

		this.webDistDir = join(projectRoot, 'dist', 'web');

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

		// Normalize path separators for cross-platform comparison
		const normalizedRoot = rootPath.replace(/[\\/]+/g, sep);
		const normalizedResolved = resolvedPath.replace(/[\\/]+/g, sep);

		if (
			resolvedPath !== rootPath &&
			!normalizedResolved.startsWith(normalizedRoot)
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
				// Web UI not built, serve a simple message
				res.writeHead(503, {'Content-Type': 'text/html'});
				res.end(`
					<!DOCTYPE html>
					<html>
					<head><title>Web UI Not Built</title></head>
					<body>
						<h1>Web UI Not Built</h1>
						<p>Run <code>bun run build:web</code> to build the web UI.</p>
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
			// Check if file exists
			if (!existsSync(filePath)) {
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.end('Not Found');
				return;
			}

			// Read and serve file
			const content = await readFile(filePath);
			const mimeType = this.getMimeType(filePath);

			res.writeHead(200, {
				'Content-Type': mimeType,
				'Cache-Control': 'public, max-age=86400', // 1 day
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
