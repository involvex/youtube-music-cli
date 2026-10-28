// Web streaming service - broadcasts player state to WebSocket clients
import type {PlayerState} from '../../types/player.types.ts';
import type {ServerMessage, ClientMessage} from '../../types/web.types.ts';
import type {ImportProgress, ImportResult} from '../../types/import.types.ts';
import type {WebSocketClient} from '../../types/web.types.ts';
import {logger} from '../logger/logger.service.ts';
import type {WebSocket as WebSocketServer} from 'ws';

// Generic WebSocket type that works with both browser and Node.js
type WebSocketLike = WebSocketServer | WebSocket;

type MessageHandler = (message: ClientMessage) => void;

/** Fields that must reach remotes immediately (skip progress throttle). */
export const WEB_CONTROL_STATE_FIELDS = [
	'isPlaying',
	'currentTrack',
	'playbackMode',
	'error',
	'currentStation',
	'queuePosition',
] as const satisfies ReadonlyArray<keyof PlayerState>;

export function shouldFlushWebStateImmediately(
	delta: Partial<PlayerState>,
): boolean {
	return WEB_CONTROL_STATE_FIELDS.some(field =>
		Object.prototype.hasOwnProperty.call(delta, field),
	);
}

class WebStreamingService {
	private clients = new Map<string, WebSocketLike>();
	private clientInfo = new Map<string, WebSocketClient>();
	private messageHandlers = new Set<MessageHandler>();
	private prevState: PlayerState | null = null;
	private readonly UPDATE_THROTTLE_MS = 250; // Throttle updates to 4/sec
	private lastUpdateTime = 0;
	private pendingUpdate: Partial<PlayerState> | null = null;
	private updateTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Add a client connection
	 */
	addClient(clientId: string, ws: WebSocket, authenticated = true): void {
		this.clients.set(clientId, ws);
		this.clientInfo.set(clientId, {
			id: clientId,
			authenticated,
			connectedAt: Date.now(),
			lastHeartbeat: Date.now(),
		});

		logger.info('WebStreamingService', 'Client connected', {
			clientId,
			authenticated,
		});

		// Send initial state if available
		if (this.prevState) {
			this.sendToClient(clientId, {
				type: 'state-update',
				state: this.prevState,
			});
		}

		// Send connection event
		this.broadcast({
			type: 'event',
			event: 'client-connected',
			data: {clientId, clientCount: this.clients.size},
		});
	}

	/**
	 * Remove a client connection
	 */
	removeClient(clientId: string): void {
		const hadClient = this.clients.has(clientId);
		this.clients.delete(clientId);
		this.clientInfo.delete(clientId);

		if (hadClient) {
			logger.info('WebStreamingService', 'Client disconnected', {
				clientId,
				remainingClients: this.clients.size,
			});

			this.broadcast({
				type: 'event',
				event: 'client-disconnected',
				data: {clientId, clientCount: this.clients.size},
			});
		}
	}

	/**
	 * Check if a client exists
	 */
	hasClient(clientId: string): boolean {
		return this.clients.has(clientId);
	}

	/**
	 * Get client count
	 */
	getClientCount(): number {
		return this.clients.size;
	}

	/**
	 * Get all connected clients
	 */
	getClients(): string[] {
		return Array.from(this.clients.keys());
	}

	/**
	 * Handle incoming message from a client
	 */
	handleClientMessage(clientId: string, message: unknown): void {
		try {
			const msg = message as ClientMessage;

			// Update client heartbeat
			const info = this.clientInfo.get(clientId);
			if (info) {
				info.lastHeartbeat = Date.now();
				this.clientInfo.set(clientId, info);
			}

			// Emit to all handlers
			for (const handler of this.messageHandlers) {
				handler(msg);
			}
		} catch (error) {
			logger.error('WebStreamingService', 'Failed to handle client message', {
				clientId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Register a handler for incoming client messages
	 */
	onMessage(handler: MessageHandler): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	/**
	 * Send a message to a specific client
	 */
	private sendToClient(clientId: string, message: ServerMessage): void {
		const ws = this.clients.get(clientId);
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			return;
		}

		try {
			ws.send(JSON.stringify(message));
		} catch (error) {
			logger.error('WebStreamingService', 'Failed to send to client', {
				clientId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Broadcast a message to all connected clients
	 */
	broadcast(message: ServerMessage): void {
		const data = JSON.stringify(message);

		for (const [clientId, ws] of this.clients) {
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(data);
				} catch (error) {
					logger.error('WebStreamingService', 'Failed to broadcast to client', {
						clientId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
	}

	/**
	 * Compute partial state delta (only changed fields)
	 */
	private computeDelta(newState: PlayerState): Partial<PlayerState> {
		if (!this.prevState) {
			return newState;
		}

		const delta: Partial<PlayerState> = {};

		// Check each field for changes
		const fields: Array<keyof PlayerState> = [
			'currentTrack',
			'isPlaying',
			'volume',
			'speed',
			'progress',
			'duration',
			'queue',
			'queuePosition',
			'repeat',
			'shuffle',
			'autoplay',
			'isLoading',
			'error',
			'playbackMode',
			'currentStation',
			'streamNowPlaying',
			'mediaSource',
			'radioIsActive',
			'radioSeed',
			'explicitQueueLength',
		];

		for (const field of fields) {
			const prevValue = this.prevState[field];
			const newValue = newState[field];

			// Deep comparison for objects/arrays
			if (typeof prevValue === 'object' && prevValue !== null) {
				if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
					(delta as Record<string, unknown>)[field] = newValue;
				}
			} else if (prevValue !== newValue) {
				(delta as Record<string, unknown>)[field] = newValue;
			}
		}

		return delta;
	}

	/**
	 * Update and broadcast player state (throttled)
	 */
	onStateChange(state: PlayerState): void {
		const now = Date.now();
		// Compute delta against OLD prevState BEFORE updating it
		const delta = this.computeDelta(state);
		this.prevState = {...state};

		// Skip if no changes
		if (Object.keys(delta).length === 0) {
			return;
		}

		// Merge with pending update
		this.pendingUpdate = {...(this.pendingUpdate || {}), ...delta};

		// Clear existing timer
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
			this.updateTimer = null;
		}

		// Control fields (play/pause, track change) skip the progress throttle
		if (
			shouldFlushWebStateImmediately(delta) ||
			now - this.lastUpdateTime >= this.UPDATE_THROTTLE_MS
		) {
			this.sendPendingUpdate();
			return;
		}

		this.updateTimer = setTimeout(
			() => {
				this.sendPendingUpdate();
			},
			this.UPDATE_THROTTLE_MS - (now - this.lastUpdateTime),
		);
	}

	/**
	 * Send pending state update to all clients
	 */
	private sendPendingUpdate(): void {
		if (!this.pendingUpdate) return;

		this.broadcast({
			type: 'state-update',
			state: this.pendingUpdate,
		});

		this.pendingUpdate = null;
		this.lastUpdateTime = Date.now();
	}

	/**
	 * Broadcast import progress
	 */
	onImportProgress(progress: ImportProgress): void {
		this.broadcast({
			type: 'import-progress',
			data: progress,
		});
	}

	/**
	 * Broadcast import result
	 */
	onImportResult(result: ImportResult): void {
		this.broadcast({
			type: 'import-result',
			data: result,
		});
	}

	/**
	 * Broadcast error message
	 */
	sendError(error: string, code?: string): void {
		this.broadcast({
			type: 'error',
			error,
			code,
		});
	}

	/**
	 * Disconnect all clients
	 */
	disconnectAll(): void {
		for (const [, ws] of this.clients) {
			try {
				ws.close();
			} catch {
				// Ignore
			}
		}

		this.clients.clear();
		this.clientInfo.clear();

		logger.info('WebStreamingService', 'All clients disconnected');
	}

	/**
	 * Get server statistics
	 */
	getStats(): {
		clients: number;
		totalConnections: number;
		uptime: number;
	} {
		const now = Date.now();
		const oldestClient = Array.from(this.clientInfo.values()).sort(
			(a, b) => a.connectedAt - b.connectedAt,
		)[0];

		return {
			clients: this.clients.size,
			totalConnections: this.clientInfo.size,
			uptime: oldestClient ? now - oldestClient.connectedAt : 0,
		};
	}
}

// Singleton instance
let webStreamingServiceInstance: WebStreamingService | null = null;

export function getWebStreamingService(): WebStreamingService {
	if (!webStreamingServiceInstance) {
		webStreamingServiceInstance = new WebStreamingService();
	}
	return webStreamingServiceInstance;
}
