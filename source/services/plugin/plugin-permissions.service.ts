// Plugin permissions service - manages plugin permission requests and storage
import type {
	PluginPermission,
	PluginPermissions,
	PermissionStatus,
} from '../../types/plugin.types.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {logger} from '../logger/logger.service.ts';
import {join} from 'node:path';

const PERMISSIONS_FILE = join(CONFIG_DIR, 'plugin-permissions.json');

interface PluginPermissionsStore {
	[pluginId: string]: PluginPermissions;
}

/**
 * Plugin permissions service - manages permission grants and denials
 */
class PluginPermissionsService {
	private permissions: PluginPermissionsStore;
	private permissionsPath: string;
	private configDir: string;

	// Permission request callback (can be overridden for testing or custom UI)
	public onPermissionRequest?: (
		pluginId: string,
		permission: PluginPermission,
	) => Promise<boolean>;

	constructor() {
		this.configDir = CONFIG_DIR;
		this.permissionsPath = PERMISSIONS_FILE;
		this.permissions = this.load();
	}

	/**
	 * Load permissions from disk
	 */
	private load(): PluginPermissionsStore {
		try {
			if (!existsSync(this.permissionsPath)) {
				return {};
			}

			const data = readFileSync(this.permissionsPath, 'utf-8');
			return JSON.parse(data) as PluginPermissionsStore;
		} catch (error) {
			logger.error(
				'PluginPermissionsService',
				'Failed to load permissions:',
				error,
			);
			return {};
		}
	}

	/**
	 * Save permissions to disk
	 */
	private save(): void {
		try {
			// Ensure config directory exists
			if (!existsSync(this.configDir)) {
				mkdirSync(this.configDir, {recursive: true});
			}

			writeFileSync(
				this.permissionsPath,
				JSON.stringify(this.permissions, null, 2),
			);
			logger.debug('PluginPermissionsService', 'Saved permissions to disk');
		} catch (error) {
			logger.error(
				'PluginPermissionsService',
				'Failed to save permissions:',
				error,
			);
		}
	}

	/**
	 * Check if a plugin has a specific permission
	 */
	hasPermission(pluginId: string, permission: PluginPermission): boolean {
		const pluginPerms = this.permissions[pluginId];
		if (!pluginPerms) {
			return false;
		}

		return pluginPerms[permission] === 'granted';
	}

	/**
	 * Get permission status
	 */
	getPermissionStatus(
		pluginId: string,
		permission: PluginPermission,
	): PermissionStatus {
		const pluginPerms = this.permissions[pluginId];
		if (!pluginPerms || !pluginPerms[permission]) {
			return 'prompt';
		}

		return pluginPerms[permission];
	}

	/**
	 * Get all permissions for a plugin
	 */
	getPermissions(pluginId: string): PluginPermissions {
		return this.permissions[pluginId] || {};
	}

	/**
	 * Grant a permission to a plugin
	 */
	grantPermission(pluginId: string, permission: PluginPermission): void {
		if (!this.permissions[pluginId]) {
			this.permissions[pluginId] = {};
		}

		this.permissions[pluginId]![permission] = 'granted';
		this.save();
		logger.info(
			'PluginPermissionsService',
			`Granted ${permission} to ${pluginId}`,
		);
	}

	/**
	 * Deny a permission to a plugin
	 */
	denyPermission(pluginId: string, permission: PluginPermission): void {
		if (!this.permissions[pluginId]) {
			this.permissions[pluginId] = {};
		}

		this.permissions[pluginId]![permission] = 'denied';
		this.save();
		logger.info(
			'PluginPermissionsService',
			`Denied ${permission} to ${pluginId}`,
		);
	}

	/**
	 * Request permission from user
	 */
	async requestPermission(
		pluginId: string,
		permission: PluginPermission,
	): Promise<boolean> {
		const currentStatus = this.getPermissionStatus(pluginId, permission);

		// If already granted or denied, return cached result
		if (currentStatus === 'granted') {
			return true;
		}

		if (currentStatus === 'denied') {
			return false;
		}

		// Prompt user
		if (this.onPermissionRequest) {
			try {
				const granted = await this.onPermissionRequest(pluginId, permission);

				if (granted) {
					this.grantPermission(pluginId, permission);
				} else {
					this.denyPermission(pluginId, permission);
				}

				return granted;
			} catch (error) {
				logger.error(
					'PluginPermissionsService',
					'Error requesting permission:',
					error,
				);
				// Default to deny on error
				this.denyPermission(pluginId, permission);
				return false;
			}
		}

		// No callback registered - default to deny for security
		logger.warn(
			'PluginPermissionsService',
			`No permission request handler, denying ${permission} for ${pluginId}`,
		);
		this.denyPermission(pluginId, permission);
		return false;
	}

	/**
	 * Grant multiple permissions at once
	 */
	grantPermissions(pluginId: string, permissions: PluginPermission[]): void {
		for (const permission of permissions) {
			this.grantPermission(pluginId, permission);
		}
	}

	/**
	 * Revoke a permission
	 */
	revokePermission(pluginId: string, permission: PluginPermission): void {
		if (!this.permissions[pluginId]) {
			return;
		}

		delete this.permissions[pluginId]![permission];
		this.save();
		logger.info(
			'PluginPermissionsService',
			`Revoked ${permission} from ${pluginId}`,
		);
	}

	/**
	 * Revoke all permissions for a plugin
	 */
	revokeAllPermissions(pluginId: string): void {
		delete this.permissions[pluginId];
		this.save();
		logger.info(
			'PluginPermissionsService',
			`Revoked all permissions from ${pluginId}`,
		);
	}

	/**
	 * Get all plugin IDs with permissions
	 */
	getAllPluginIds(): string[] {
		return Object.keys(this.permissions);
	}

	/**
	 * Reset all permissions (for testing or user request)
	 */
	resetAll(): void {
		this.permissions = {};
		this.save();
		logger.info('PluginPermissionsService', 'Reset all permissions');
	}
}

// Singleton instance
let instance: PluginPermissionsService | null = null;

/**
 * Get the plugin permissions service singleton
 */
export function getPluginPermissionsService(): PluginPermissionsService {
	if (!instance) {
		instance = new PluginPermissionsService();
	}
	return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPluginPermissionsService(): void {
	instance = null;
}
