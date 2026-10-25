// Plugin installer service - handles plugin installation from various sources
import type {PluginInstallResult} from '../../types/plugin.types.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {formatErrorData} from '../../utils/error.ts';
import {logger} from '../logger/logger.service.ts';
import {join} from 'node:path';
import {existsSync, mkdirSync, rmSync, cpSync} from 'node:fs';
import {execFileSync, execSync} from 'node:child_process';

const PLUGINS_DIR = join(CONFIG_DIR, 'plugins');
const DEFAULT_PLUGIN_REPO =
	'https://github.com/involvex/youtube-music-cli-plugins';

/**
 * Detect available package manager (bun preferred, npm fallback)
 */
function getPackageManager(): string {
	if (process.env.BUN_INSTALL || process.argv[0]?.includes('bun')) {
		return 'bun';
	}

	return 'npm';
}

/**
 * Plugin ids become directory names under PLUGINS_DIR. Reject anything that
 * could resolve outside it (e.g. "..", "../x", absolute paths) or hide as a
 * dot-directory such as ".temp-install".
 */
export function isSafePluginId(id: string | undefined): id is string {
	return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id);
}

function invalidPluginIdResult(id: string | undefined): PluginInstallResult {
	return {
		success: false,
		error: `Invalid plugin id: ${JSON.stringify(id)}`,
	};
}

/**
 * Plugin installer service
 */
class PluginInstallerService {
	/**
	 * Install a plugin from GitHub repository
	 */
	async installFromGitHub(
		repoUrl: string,
		pluginName?: string,
	): Promise<PluginInstallResult> {
		try {
			logger.info('PluginInstallerService', `Installing from ${repoUrl}`);

			// Ensure plugins directory exists
			if (!existsSync(PLUGINS_DIR)) {
				mkdirSync(PLUGINS_DIR, {recursive: true});
			}

			// Determine plugin name from URL if not provided
			if (!pluginName) {
				const match = repoUrl.match(/\/([^/]+?)(\.git)?$/);
				pluginName = match?.[1] || 'unknown-plugin';
			}

			if (!isSafePluginId(pluginName)) {
				return invalidPluginIdResult(pluginName);
			}

			const targetDir = join(PLUGINS_DIR, pluginName);

			// Check if plugin already exists
			if (existsSync(targetDir)) {
				return {
					success: false,
					error: `Plugin ${pluginName} is already installed`,
				};
			}

			// Clone repository
			try {
				// No shell (quotes in the URL can't inject commands) and "--" so a
				// URL like "--upload-pack=..." can't be parsed as a git option.
				execFileSync('git', ['clone', '--', repoUrl, targetDir], {
					stdio: 'pipe',
					windowsHide: true,
				});
			} catch (error) {
				logger.error(
					'PluginInstallerService',
					'Git clone failed:',
					formatErrorData(error),
				);
				return {
					success: false,
					error: `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`,
				};
			}

			// Validate plugin structure
			const manifestPath = join(targetDir, 'plugin.json');
			if (!existsSync(manifestPath)) {
				// Cleanup
				rmSync(targetDir, {recursive: true, force: true});
				return {
					success: false,
					error: 'Invalid plugin: plugin.json not found',
				};
			}

			// Check for npm dependencies
			const packageJsonPath = join(targetDir, 'package.json');
			if (existsSync(packageJsonPath)) {
				logger.info(
					'PluginInstallerService',
					'Installing plugin dependencies...',
				);
				try {
					const packageManager = getPackageManager();
					execSync(`${packageManager} install`, {
						cwd: targetDir,
						stdio: 'pipe',
						windowsHide: true,
					});
				} catch (error) {
					logger.error(
						'PluginInstallerService',
						'Failed to install dependencies:',
						formatErrorData(error),
					);
					// Continue anyway - plugin might still work
				}
			}

			logger.info(
				'PluginInstallerService',
				`Successfully installed plugin: ${pluginName}`,
			);

			return {
				success: true,
				pluginId: pluginName,
				message: `Plugin ${pluginName} installed successfully`,
			};
		} catch (error) {
			logger.error(
				'PluginInstallerService',
				'Install failed:',
				formatErrorData(error),
			);
			return {
				success: false,
				error: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Install a plugin from the default plugin repository
	 */
	async installFromDefaultRepo(
		pluginName: string,
	): Promise<PluginInstallResult> {
		logger.info(
			'PluginInstallerService',
			`Installing ${pluginName} from default repo`,
		);

		if (!isSafePluginId(pluginName)) {
			return invalidPluginIdResult(pluginName);
		}

		// For now, use sparse checkout or clone entire repo and copy plugin
		// Simplified: clone entire repo to temp, copy plugin, delete temp
		try {
			const tempDir = join(PLUGINS_DIR, '.temp-install');

			// Clone default repo
			if (!existsSync(tempDir)) {
				execFileSync('git', ['clone', '--', DEFAULT_PLUGIN_REPO, tempDir], {
					stdio: 'pipe',
					windowsHide: true,
				});
			} else {
				// Pull latest
				execSync('git pull', {
					cwd: tempDir,
					stdio: 'pipe',
					windowsHide: true,
				});
			}

			// Plugin is at root of repo (e.g., adblock/, lyrics/, etc.)
			const pluginSourceDir = join(tempDir, pluginName);
			if (!existsSync(pluginSourceDir)) {
				rmSync(tempDir, {recursive: true, force: true});
				return {
					success: false,
					error: `Plugin ${pluginName} not found in default repository`,
				};
			}

			const targetDir = join(PLUGINS_DIR, pluginName);
			if (existsSync(targetDir)) {
				rmSync(tempDir, {recursive: true, force: true});
				return {
					success: false,
					error: `Plugin ${pluginName} is already installed`,
				};
			}

			// Copy plugin to plugins directory
			cpSync(pluginSourceDir, targetDir, {recursive: true});

			// Cleanup temp directory
			rmSync(tempDir, {recursive: true, force: true});

			// Install dependencies if needed
			const packageJsonPath = join(targetDir, 'package.json');
			if (existsSync(packageJsonPath)) {
				try {
					const packageManager = getPackageManager();
					execSync(`${packageManager} install`, {
						cwd: targetDir,
						stdio: 'pipe',
						windowsHide: true,
					});
				} catch (error) {
					logger.warn(
						'PluginInstallerService',
						'Failed to install dependencies:',
						formatErrorData(error),
					);
				}
			}

			return {
				success: true,
				pluginId: pluginName,
				message: `Plugin ${pluginName} installed successfully`,
			};
		} catch (error) {
			logger.error(
				'PluginInstallerService',
				'Install failed:',
				formatErrorData(error),
			);
			return {
				success: false,
				error: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Install a plugin from local directory (for development)
	 */
	async installFromLocal(sourcePath: string): Promise<PluginInstallResult> {
		try {
			if (!existsSync(sourcePath)) {
				return {
					success: false,
					error: `Source path does not exist: ${sourcePath}`,
				};
			}

			const manifestPath = join(sourcePath, 'plugin.json');
			if (!existsSync(manifestPath)) {
				return {
					success: false,
					error: 'Invalid plugin: plugin.json not found',
				};
			}

			// Read manifest to get plugin ID
			const {readFileSync: fsReadFileSync} = await import('node:fs');
			const manifest = JSON.parse(fsReadFileSync(manifestPath, 'utf-8')) as {
				id: string;
				name: string;
			};

			if (!isSafePluginId(manifest.id)) {
				return invalidPluginIdResult(manifest.id);
			}

			const targetDir = join(PLUGINS_DIR, manifest.id);

			if (existsSync(targetDir)) {
				return {
					success: false,
					error: `Plugin ${manifest.id} is already installed`,
				};
			}

			// Copy to plugins directory
			if (!existsSync(PLUGINS_DIR)) {
				mkdirSync(PLUGINS_DIR, {recursive: true});
			}

			cpSync(sourcePath, targetDir, {recursive: true});

			return {
				success: true,
				pluginId: manifest.id,
				message: `Plugin ${manifest.name} installed from local path`,
			};
		} catch (error) {
			logger.error(
				'PluginInstallerService',
				'Install failed:',
				formatErrorData(error),
			);
			return {
				success: false,
				error: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Uninstall a plugin
	 */
	async uninstall(pluginId: string): Promise<PluginInstallResult> {
		// Without this, `uninstall ..` would recursively delete the config dir
		if (!isSafePluginId(pluginId)) {
			return invalidPluginIdResult(pluginId);
		}

		const pluginDir = join(PLUGINS_DIR, pluginId);

		if (!existsSync(pluginDir)) {
			return {
				success: false,
				error: `Plugin ${pluginId} is not installed`,
			};
		}

		try {
			rmSync(pluginDir, {recursive: true, force: true});
			return {
				success: true,
				pluginId,
				message: `Plugin ${pluginId} uninstalled successfully`,
			};
		} catch (error) {
			logger.error(
				'PluginInstallerService',
				'Uninstall failed:',
				formatErrorData(error),
			);
			return {
				success: false,
				error: `Uninstall failed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
}

// Singleton instance
let instance: PluginInstallerService | null = null;

/**
 * Get the plugin installer service singleton
 */
export function getPluginInstallerService(): PluginInstallerService {
	if (!instance) {
		instance = new PluginInstallerService();
	}
	return instance;
}
