// Plugin updater service - handles plugin updates with smart merge
import type {PluginUpdateResult} from '../../types/plugin.types.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {logger} from '../logger/logger.service.ts';
import {join} from 'node:path';
import {existsSync, mkdirSync, rmSync, cpSync, readdirSync} from 'node:fs';
import {execSync} from 'node:child_process';

const PLUGINS_DIR = join(CONFIG_DIR, 'plugins');

/**
 * Plugin updater service
 */
class PluginUpdaterService {
	/**
	 * Check if updates are available for a plugin
	 */
	async checkForUpdates(pluginId: string): Promise<{
		hasUpdate: boolean;
		currentVersion?: string;
		latestVersion?: string;
	}> {
		const pluginDir = join(PLUGINS_DIR, pluginId);

		if (!existsSync(pluginDir)) {
			return {hasUpdate: false};
		}

		// Check if plugin is a git repository
		const gitDir = join(pluginDir, '.git');
		if (!existsSync(gitDir)) {
			logger.warn(
				'PluginUpdaterService',
				`Plugin ${pluginId} is not a git repository, cannot check for updates`,
			);
			return {hasUpdate: false};
		}

		try {
			// Fetch latest from remote
			execSync('git fetch origin', {
				cwd: pluginDir,
				stdio: 'pipe',
				windowsHide: true,
			});

			// Check if local is behind remote
			const status = execSync('git status -uno', {
				cwd: pluginDir,
				stdio: 'pipe',
				windowsHide: true,
			}).toString();

			const hasUpdate = status.includes('Your branch is behind');

			// Get current version from manifest
			const manifestPath = join(pluginDir, 'plugin.json');
			let currentVersion = 'unknown';
			if (existsSync(manifestPath)) {
				const {readFileSync: fsReadFileSync} = await import('node:fs');
				const manifest = fsReadFileSync(manifestPath, 'utf-8') as unknown as {
					version: string;
				};
				const parsedManifest =
					typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
				currentVersion = parsedManifest.version;
			}

			return {
				hasUpdate,
				currentVersion,
				latestVersion: hasUpdate ? 'available' : currentVersion,
			};
		} catch (error) {
			logger.error(
				'PluginUpdaterService',
				`Failed to check updates for ${pluginId}:`,
				error,
			);
			return {hasUpdate: false};
		}
	}

	/**
	 * Update a plugin with smart merge (preserve user data)
	 */
	async updatePlugin(pluginId: string): Promise<PluginUpdateResult> {
		const pluginDir = join(PLUGINS_DIR, pluginId);

		if (!existsSync(pluginDir)) {
			return {
				success: false,
				error: `Plugin ${pluginId} is not installed`,
			};
		}

		try {
			// Get current version
			const manifestPath = join(pluginDir, 'plugin.json');
			let oldVersion = 'unknown';
			if (existsSync(manifestPath)) {
				const {readFileSync: fsReadFileSync} = await import('node:fs');
				const manifest = fsReadFileSync(manifestPath, 'utf-8') as unknown as {
					version: string;
				};
				const parsedManifest =
					typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
				oldVersion = parsedManifest.version;
			}

			// Backup current version
			const backupDir = join(pluginDir, '.backup');
			if (existsSync(backupDir)) {
				rmSync(backupDir, {recursive: true, force: true});
			}
			mkdirSync(backupDir, {recursive: true});

			// Backup everything except data/ and config.json
			const entries = readdirSync(pluginDir, {withFileTypes: true});
			for (const entry of entries) {
				if (
					entry.name === 'data' ||
					entry.name === 'config.json' ||
					entry.name === '.backup'
				) {
					continue;
				}

				const sourcePath = join(pluginDir, entry.name);
				const targetPath = join(backupDir, entry.name);

				if (entry.isDirectory()) {
					cpSync(sourcePath, targetPath, {recursive: true});
				} else {
					cpSync(sourcePath, targetPath);
				}
			}

			// Check if it's a git repository
			const gitDir = join(pluginDir, '.git');
			if (existsSync(gitDir)) {
				// Git pull
				try {
					execSync('git pull origin main', {
						cwd: pluginDir,
						stdio: 'pipe',
						windowsHide: true,
					});
				} catch {
					// Try master branch
					execSync('git pull origin master', {
						cwd: pluginDir,
						stdio: 'pipe',
						windowsHide: true,
					});
				}
			} else {
				logger.warn(
					'PluginUpdaterService',
					`Plugin ${pluginId} is not a git repository, cannot update`,
				);
				return {
					success: false,
					error: 'Plugin is not a git repository',
				};
			}

			// Get new version
			let newVersion = 'unknown';
			if (existsSync(manifestPath)) {
				const {readFileSync: fsReadFileSync} = await import('node:fs');
				const manifest = fsReadFileSync(manifestPath, 'utf-8') as unknown as {
					version: string;
				};
				const parsedManifest =
					typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
				newVersion = parsedManifest.version;
			}

			// Install/update dependencies
			const packageJsonPath = join(pluginDir, 'package.json');
			if (existsSync(packageJsonPath)) {
				try {
					execSync('bun install', {
						cwd: pluginDir,
						stdio: 'pipe',
						windowsHide: true,
					});
				} catch (error) {
					logger.warn(
						'PluginUpdaterService',
						'Failed to install dependencies:',
						error,
					);
				}
			}

			logger.info(
				'PluginUpdaterService',
				`Successfully updated ${pluginId} from ${oldVersion} to ${newVersion}`,
			);

			return {
				success: true,
				pluginId,
				oldVersion,
				newVersion,
				message: `Updated from ${oldVersion} to ${newVersion}`,
			};
		} catch (error) {
			logger.error(
				'PluginUpdaterService',
				`Failed to update ${pluginId}:`,
				error,
			);

			// Try to restore from backup
			const backupDir = join(pluginDir, '.backup');
			if (existsSync(backupDir)) {
				logger.info('PluginUpdaterService', 'Restoring from backup...');
				try {
					const entries = readdirSync(backupDir, {withFileTypes: true});
					for (const entry of entries) {
						const sourcePath = join(backupDir, entry.name);
						const targetPath = join(pluginDir, entry.name);

						// Remove target first
						if (existsSync(targetPath)) {
							rmSync(targetPath, {recursive: true, force: true});
						}

						if (entry.isDirectory()) {
							cpSync(sourcePath, targetPath, {recursive: true});
						} else {
							cpSync(sourcePath, targetPath);
						}
					}
					logger.info('PluginUpdaterService', 'Restored from backup');
				} catch (restoreError) {
					logger.error(
						'PluginUpdaterService',
						'Failed to restore from backup:',
						restoreError,
					);
				}
			}

			return {
				success: false,
				error: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
}

// Singleton instance
let instance: PluginUpdaterService | null = null;

/**
 * Get the plugin updater service singleton
 */
export function getPluginUpdaterService(): PluginUpdaterService {
	if (!instance) {
		instance = new PluginUpdaterService();
	}
	return instance;
}
