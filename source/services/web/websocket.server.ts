// WebSocket server for web UI
import {
	createServer as createHttpServer,
	type IncomingMessage,
	type ServerResponse,
} from 'node:http';
import {WebSocketServer, WebSocket} from 'ws';
import type {WebServerConfig} from '../../types/web.types.ts';
import type {ServerMessage, ClientMessage} from '../../types/web.types.ts';
import type {PlayerAction} from '../../types/player.types.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {getWebStreamingService} from './web-streaming.service.ts';
import {getStaticFileService} from './static-file.service.ts';
import {logger} from '../logger/logger.service.ts';
import {
	DEFAULT_WEB_HOST,
	DEFAULT_WEB_PORT,
	displayWebHost,
	isWebSocketOriginAllowed,
} from './web-config-policy.ts';

interface WebSocketServerOptions {
	config: WebServerConfig;
	onCommand?: (action: PlayerAction) => void;
	onImportRequest?: (
		source: 'spotify' | 'youtube',
		url: string,
		name?: string,
	) => void;
	onSearchRequest?: (
		query: string,
		searchType: 'all' | 'songs' | 'artists' | 'albums' | 'playlists',
	) => void;
	onConfigUpdate?: (config: Record<string, unknown>) => void;
	onLiveStreamsRequest?: () => void;
	onRadioSearchRequest?: (query: string, countrycode?: string) => void;
	onFavoritesRequest?: () => void;
	onFavoritesToggle?: (track: Track) => void;
}

class WebSocketServerClass {
	private httpServer: ReturnType<typeof createHttpServer> | null = null;
	private wsServer: WebSocketServer | null = null;
	private config: WebServerConfig;
	private streamingService = getWebStreamingService();
	private staticFileService = getStaticFileService();
	private onCommand?: (action: PlayerAction) => void;
	private onImportRequest?: (
		source: 'spotify' | 'youtube',
		url: string,
		name?: string,
	) => void;
	private onSearchRequest?: (
		query: string,
		searchType: 'all' | 'songs' | 'artists' | 'albums' | 'playlists',
	) => void;
	private onConfigUpdate?: (config: Record<string, unknown>) => void;
	private onLiveStreamsRequest?: () => void;
	private onRadioSearchRequest?: (query: string, countrycode?: string) => void;
	private onFavoritesRequest?: () => void;
	private onFavoritesToggle?: (track: Track) => void;

	constructor() {
		this.config = {
			enabled: false,
			host: DEFAULT_WEB_HOST,
			port: DEFAULT_WEB_PORT,
			enableCors: true,
			allowedOrigins: ['*'],
			auth: {enabled: false},
		};
	}

	/**
	 * Start the WebSocket server
	 */
	async start(options: WebSocketServerOptions): Promise<void> {
		this.config = options.config;
		this.onCommand = options.onCommand;
		this.onImportRequest = options.onImportRequest;
		this.onSearchRequest = options.onSearchRequest;
		this.onConfigUpdate = options.onConfigUpdate;
		this.onLiveStreamsRequest = options.onLiveStreamsRequest;
		this.onRadioSearchRequest = options.onRadioSearchRequest;
		this.onFavoritesRequest = options.onFavoritesRequest;
		this.onFavoritesToggle = options.onFavoritesToggle;

		logger.info('WebSocketServer', 'Starting server', {
			host: this.config.host,
			port: this.config.port,
			auth: this.config.auth.enabled,
		});

		// Create HTTP server
		this.httpServer = createHttpServer((req, res) => {
			this.handleHttpRequest(req, res);
		});

		// Create WebSocket server
		this.wsServer = new WebSocketServer({
			server: this.httpServer,
			path: '/ws',
		});

		// Handle WebSocket connections
		this.wsServer.on('connection', (ws: WebSocket, req) => {
			this.handleWebSocketConnection(ws, req);
		});

		// Handle HTTP server errors
		this.httpServer.on('error', error => {
			logger.error('WebSocketServer', 'HTTP server error', {
				error: error instanceof Error ? error.message : String(error),
			});
		});

		// Handle WebSocket server errors
		this.wsServer.on('error', error => {
			logger.error('WebSocketServer', 'WebSocket server error', {
				error: error instanceof Error ? error.message : String(error),
			});
		});

		// Start listening
		return new Promise((resolve, reject) => {
			this.httpServer!.listen(
				{
					host: this.config.host,
					port: this.config.port,
				},
				() => {
					logger.info('WebSocketServer', 'Server started', {
						url: `http://${displayWebHost(this.config.host)}:${this.config.port}`,
						bind: `${this.config.host}:${this.config.port}`,
					});
					resolve();
				},
			);

			this.httpServer!.on('error', reject);
		});
	}

	/**
	 * Handle HTTP requests (for static file serving)
	 */
	private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
		// Set CORS headers if enabled
		if (this.config.enableCors) {
			const origin = req.headers.origin;
			if (
				origin &&
				(this.config.allowedOrigins.includes('*') ||
					this.config.allowedOrigins.includes(origin))
			) {
				res.setHeader('Access-Control-Allow-Origin', origin);
				res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
				res.setHeader(
					'Access-Control-Allow-Headers',
					'Content-Type, Authorization',
				);
			}
		}

		// Handle preflight requests
		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		// Serve static files
		const url = req.url ?? '/';
		this.staticFileService.serve(url, req, res);
	}

	/**
	 * Handle WebSocket connection
	 */
	private handleWebSocketConnection(ws: WebSocket, req: IncomingMessage): void {
		const clientId = this.generateClientId();

		if (!isWebSocketOriginAllowed(req, this.config.allowedOrigins)) {
			logger.warn(
				'WebSocketServer',
				'Rejected connection (origin not allowed)',
				{
					clientId,
					origin: req.headers.origin,
				},
			);
			ws.close(1008, 'Origin not allowed');
			return;
		}

		logger.info('WebSocketServer', 'New connection', {
			clientId,
			ip: req.socket.remoteAddress,
		});

		// Handle authentication if enabled
		if (this.config.auth.enabled) {
			const token = this.extractAuthToken(req);
			if (!token || token !== this.config.auth.token) {
				logger.warn('WebSocketServer', 'Authentication failed', {clientId});
				ws.close(1008, 'Authentication failed');
				return;
			}
		}

		// Add client to streaming service
		this.streamingService.addClient(clientId, ws as never, true);

		// Send welcome message
		this.sendToClient(ws, {
			type: 'auth',
			success: true,
			message: 'Connected to YouTube Music CLI',
		});

		// Handle incoming messages
		ws.on('message', (data: Buffer) => {
			try {
				const message = JSON.parse(data.toString()) as ClientMessage;
				this.streamingService.handleClientMessage(clientId, message);
				this.handleClientCommand(clientId, message);
			} catch (error) {
				logger.error('WebSocketServer', 'Failed to parse message', {
					clientId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});

		// Handle close
		ws.on('close', () => {
			this.streamingService.removeClient(clientId);
		});

		// Handle errors
		ws.on('error', error => {
			logger.error('WebSocketServer', 'WebSocket error', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/**
	 * Handle commands from clients
	 */
	private handleClientCommand(_clientId: string, message: ClientMessage): void {
		switch (message.type) {
			case 'command':
				// Ink TUI handles commands via WebStreamingService.onMessage.
				if (this.onCommand) {
					this.onCommand(message.action);
				}
				break;

			case 'import-request':
				if (this.onImportRequest) {
					this.onImportRequest(message.source, message.url, message.name);
				}
				break;

			case 'search-request':
				if (this.onSearchRequest) {
					this.onSearchRequest(message.query, message.searchType);
				}
				break;

			case 'config-update':
				if (this.onConfigUpdate) {
					this.onConfigUpdate(message.config as Record<string, unknown>);
				}
				break;

			case 'live-streams-request':
				if (this.onLiveStreamsRequest) {
					this.onLiveStreamsRequest();
				}
				break;

			case 'radio-search-request':
				if (this.onRadioSearchRequest) {
					this.onRadioSearchRequest(message.query, message.countrycode);
				}
				break;

			case 'favorites-request':
				if (this.onFavoritesRequest) {
					this.onFavoritesRequest();
				}
				break;

			case 'favorites-toggle':
				if (this.onFavoritesToggle) {
					this.onFavoritesToggle(message.track);
				}
				break;

			case 'auth-request':
				// Already handled in connection phase
				break;
		}
	}

	/**
	 * Send message to a specific WebSocket client
	 */
	private sendToClient(ws: WebSocket, message: ServerMessage): void {
		if (ws.readyState === WebSocket.OPEN) {
			try {
				ws.send(JSON.stringify(message));
			} catch (error) {
				logger.error('WebSocketServer', 'Failed to send message', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	/**
	 * Generate a unique client ID
	 */
	private generateClientId(): string {
		return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Extract auth token from request
	 */
	private extractAuthToken(req: IncomingMessage): string | null {
		// Check Authorization header
		const authHeader = req.headers.authorization;
		if (authHeader?.startsWith('Bearer ')) {
			return authHeader.substring(7);
		}

		// Check query parameter
		const url = req.url ?? '';
		const urlObj = new URL(url, `http://${req.headers.host}`);
		return urlObj.searchParams.get('token');
	}

	/**
	 * Stop the server
	 */
	async stop(): Promise<void> {
		logger.info('WebSocketServer', 'Stopping server');

		// Disconnect all clients
		this.streamingService.disconnectAll();

		// Close WebSocket server
		if (this.wsServer) {
			this.wsServer.close();
			this.wsServer = null;
		}

		// Close HTTP server
		if (this.httpServer) {
			return new Promise(resolve => {
				this.httpServer!.close(() => {
					this.httpServer = null;
					logger.info('WebSocketServer', 'Server stopped');
					resolve();
				});
			});
		}
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.httpServer !== null;
	}

	/**
	 * Get server URL
	 */
	getServerUrl(): string {
		if (!this.isRunning()) {
			throw new Error('Server is not running');
		}
		return `http://${displayWebHost(this.config.host)}:${this.config.port}`;
	}
}

// Singleton instance
let webSocketServerInstance: WebSocketServerClass | null = null;

export function getWebSocketServer(): WebSocketServerClass {
	if (!webSocketServerInstance) {
		webSocketServerInstance = new WebSocketServerClass();
	}
	return webSocketServerInstance;
}
