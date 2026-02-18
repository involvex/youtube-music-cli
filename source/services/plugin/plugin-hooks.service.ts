// Plugin event hooks service - centralized event bus for plugin system
import type {
	PluginEvent,
	EventHandler,
	PlayerEvent,
	NavigationEvent,
	AudioStreamEvent,
} from '../../types/plugin.types.ts';
import {logger} from '../logger/logger.service.ts';

type EventType = PluginEvent['type'];

/**
 * Plugin hooks service - manages event subscriptions and emissions
 */
class PluginHooksService {
	private handlers: Map<EventType, Set<EventHandler>>;

	constructor() {
		this.handlers = new Map();
	}

	/**
	 * Register an event handler
	 */
	on<T extends PluginEvent = PluginEvent>(
		eventType: T['type'],
		handler: EventHandler<T>,
	): void {
		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, new Set());
		}

		this.handlers.get(eventType)!.add(handler as EventHandler);
		logger.debug('PluginHooksService', `Registered handler for ${eventType}`);
	}

	/**
	 * Unregister an event handler
	 */
	off<T extends PluginEvent = PluginEvent>(
		eventType: T['type'],
		handler: EventHandler<T>,
	): void {
		const handlers = this.handlers.get(eventType);
		if (handlers) {
			handlers.delete(handler as EventHandler);
			if (handlers.size === 0) {
				this.handlers.delete(eventType);
			}
			logger.debug(
				'PluginHooksService',
				`Unregistered handler for ${eventType}`,
			);
		}
	}

	/**
	 * Emit an event to all registered handlers
	 */
	async emit<T extends PluginEvent = PluginEvent>(event: T): Promise<void> {
		const handlers = this.handlers.get(event.type);
		if (!handlers || handlers.size === 0) {
			return;
		}

		logger.debug(
			'PluginHooksService',
			`Emitting ${event.type} to ${handlers.size} handler(s)`,
		);

		// Execute all handlers, catching errors to prevent one plugin from breaking others
		const promises: Array<Promise<void>> = [];

		for (const handler of handlers) {
			promises.push(
				Promise.resolve()
					.then(() => handler(event))
					.catch((error: unknown) => {
						logger.error(
							'PluginHooksService',
							`Error in handler for ${event.type}:`,
							error,
						);
					}),
			);
		}

		await Promise.all(promises);
	}

	/**
	 * Emit event synchronously (fire and forget)
	 */
	emitSync<T extends PluginEvent = PluginEvent>(event: T): void {
		void this.emit(event);
	}

	/**
	 * Remove all handlers for a specific event type
	 */
	clearHandlers(eventType: EventType): void {
		this.handlers.delete(eventType);
		logger.debug('PluginHooksService', `Cleared all handlers for ${eventType}`);
	}

	/**
	 * Remove all event handlers (used for cleanup)
	 */
	clearAllHandlers(): void {
		this.handlers.clear();
		logger.debug('PluginHooksService', 'Cleared all event handlers');
	}

	/**
	 * Get count of handlers for an event type
	 */
	getHandlerCount(eventType: EventType): number {
		return this.handlers.get(eventType)?.size ?? 0;
	}

	/**
	 * Get all registered event types
	 */
	getRegisteredEvents(): EventType[] {
		return [...this.handlers.keys()];
	}

	/**
	 * Helper: Create a player event
	 */
	createPlayerEvent(
		type: PlayerEvent['type'],
		data?: Partial<Omit<PlayerEvent, 'type' | 'timestamp'>>,
	): PlayerEvent {
		return {
			type,
			...data,
			timestamp: Date.now(),
		} as PlayerEvent;
	}

	/**
	 * Helper: Create a navigation event
	 */
	createNavigationEvent(
		type: NavigationEvent['type'],
		data?: Partial<Omit<NavigationEvent, 'type' | 'timestamp'>>,
	): NavigationEvent {
		return {
			type,
			...data,
			timestamp: Date.now(),
		} as NavigationEvent;
	}

	/**
	 * Helper: Create an audio stream event
	 */
	createAudioStreamEvent(
		type: AudioStreamEvent['type'],
		data?: Partial<Omit<AudioStreamEvent, 'type' | 'timestamp'>>,
	): AudioStreamEvent {
		return {
			type,
			...data,
			timestamp: Date.now(),
		} as AudioStreamEvent;
	}
}

// Singleton instance
let instance: PluginHooksService | null = null;

/**
 * Get the plugin hooks service singleton
 */
export function getPluginHooksService(): PluginHooksService {
	if (!instance) {
		instance = new PluginHooksService();
	}
	return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPluginHooksService(): void {
	if (instance) {
		instance.clearAllHandlers();
	}
	instance = null;
}
