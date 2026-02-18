// Plugin UI API integration - allows plugins to register views and shortcuts
import type {ReactElement} from 'react';
import {logger} from '../logger/logger.service.ts';

// Registry for plugin views
const pluginViews: Map<string, ReactElement> = new Map();

/**
 * Register a plugin view
 */
export function registerPluginView(
	viewId: string,
	component: ReactElement,
): void {
	if (pluginViews.has(viewId)) {
		logger.warn('PluginUIAPI', `View ${viewId} is already registered`);
		return;
	}

	pluginViews.set(viewId, component);
	logger.info('PluginUIAPI', `Registered view: ${viewId}`);
}

/**
 * Unregister a plugin view
 */
export function unregisterPluginView(viewId: string): void {
	pluginViews.delete(viewId);
	logger.info('PluginUIAPI', `Unregistered view: ${viewId}`);
}

/**
 * Get a plugin view by ID
 */
export function getPluginView(viewId: string): ReactElement | undefined {
	return pluginViews.get(viewId);
}

/**
 * Check if a plugin view exists
 */
export function hasPluginView(viewId: string): boolean {
	return pluginViews.has(viewId);
}

/**
 * Get all registered plugin views
 */
export function getAllPluginViews(): Map<string, ReactElement> {
	return new Map(pluginViews);
}

/**
 * Clear all plugin views (for cleanup)
 */
export function clearAllPluginViews(): void {
	pluginViews.clear();
	logger.info('PluginUIAPI', 'Cleared all plugin views');
}
