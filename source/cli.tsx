#!/usr/bin/env node
import type {Flags} from './types/cli.types.ts';
import App from './app.tsx';
import {render} from 'ink';
import meow from 'meow';
import {getPluginInstallerService} from './services/plugin/plugin-installer.service.ts';
import {getPluginUpdaterService} from './services/plugin/plugin-updater.service.ts';
import {getPluginRegistryService} from './services/plugin/plugin-registry.service.ts';
import {getImportService} from './services/import/import.service.ts';
import {getWebServerManager} from './services/web/web-server-manager.ts';
import {getWebStreamingService} from './services/web/web-streaming.service.ts';
import {getVersionCheckService} from './services/version-check/version-check.service.ts';
import {getConfigService} from './services/config/config.service.ts';
import {getPlayerService} from './services/player/player.service.ts';
import {APP_VERSION} from './utils/constants.ts';
import {ensurePlaybackDependencies} from './services/player/dependency-check.service.ts';
import {getMusicService} from './services/youtube-music/api.ts';
import type {Track} from './types/youtube-music.types.ts';

const cli = meow(
	`
	Usage
	  $ youtube-music-cli
	  $ youtube-music-cli play <track-id|youtube-url>
	  $ youtube-music-cli search <query>
	  $ youtube-music-cli playlist <playlist-id>
	  $ youtube-music-cli suggestions
	  $ youtube-music-cli pause
	  $ youtube-music-cli resume
	  $ youtube-music-cli skip
	  $ youtube-music-cli back

	Plugin Commands
	  $ youtube-music-cli plugins list
	  $ youtube-music-cli plugins install <name|url>
	  $ youtube-music-cli plugins remove <name>
	  $ youtube-music-cli plugins update <name>
	  $ youtube-music-cli plugins enable <name>
	  $ youtube-music-cli plugins disable <name>

	Import Commands
	  $ youtube-music-cli import spotify <url-or-id>
	  $ youtube-music-cli import youtube <url-or-id>

	Options
	  --theme, -t          Theme to use (dark, light, midnight, matrix)
	  --volume, -v         Initial volume (0-100)
	  --shuffle, -s        Enable shuffle mode
	  --repeat, -r         Repeat mode (off, all, one)
	  --headless           Run without TUI (just play)
	  --web                Enable web UI server
	  --web-host           Web server host (default: localhost)
	  --web-port           Web server port (default: 8080)
	  --web-only           Run web server without CLI UI
	  --web-auth           Authentication token for web server
	  --name               Custom name for imported playlist
	  --help, -h           Show this help

	Examples
	  $ youtube-music-cli
	  $ youtube-music-cli play dQw4w9WgXcQ
	  $ youtube-music-cli search "Rick Astley"
	  $ youtube-music-cli play dQw4w9WgXcQ --headless
	  $ youtube-music-cli plugins install adblock
	  $ youtube-music-cli import spotify "https://open.spotify.com/playlist/..."
	  $ youtube-music-cli --web --web-port 3000
`,
	{
		importMeta: import.meta,
		flags: {
			theme: {
				type: 'string',
				shortFlag: 't',
			},
			volume: {
				type: 'number',
				shortFlag: 'v',
			},
			shuffle: {
				type: 'boolean',
				shortFlag: 's',
				default: false,
			},
			repeat: {
				type: 'string',
				shortFlag: 'r',
			},
			headless: {
				type: 'boolean',
				default: false,
			},
			web: {
				type: 'boolean',
				default: false,
			},
			webHost: {
				type: 'string',
			},
			webPort: {
				type: 'number',
			},
			webOnly: {
				type: 'boolean',
				default: false,
			},
			webAuth: {
				type: 'string',
			},
			name: {
				type: 'string',
			},
			help: {
				type: 'boolean',
				shortFlag: 'h',
				default: false,
			},
		},
		autoVersion: true,
		autoHelp: false,
	},
);

if (cli.flags.help) {
	cli.showHelp(0);
}

// Handle plugin commands
const command = cli.input[0];
const args = cli.input.slice(1);

const isInteractiveTerminal = Boolean(
	process.stdin.isTTY && process.stdout.isTTY,
);

function requiresImmediatePlayback(flags: Flags): boolean {
	return Boolean(flags.playTrack || flags.searchQuery || flags.playPlaylist);
}

function shouldCheckPlaybackDependencies(
	commandName: string | undefined,
	flags: Flags,
): boolean {
	if (flags.webOnly) {
		return false;
	}

	if (requiresImmediatePlayback(flags)) {
		return true;
	}

	return (
		commandName === undefined ||
		commandName === 'suggestions' ||
		Boolean(flags.web)
	);
}

async function runDirectPlaybackCommand(flags: Flags): Promise<void> {
	const musicService = getMusicService();
	const playerService = getPlayerService();
	const config = getConfigService();
	const playbackOptions = {
		volume: flags.volume ?? config.get('volume'),
		audioNormalization: config.get('audioNormalization'),
	};

	let track: Track | null | undefined;
	if (flags.playTrack) {
		track = await musicService.getTrack(flags.playTrack);
		if (!track) {
			throw new Error(`Track not found: ${flags.playTrack}`);
		}
	} else if (flags.searchQuery) {
		const response = await musicService.search(flags.searchQuery, {
			type: 'songs',
			limit: 1,
		});
		const firstSong = response.results.find(result => result.type === 'song');
		if (!firstSong) {
			throw new Error(`No playable tracks found for: "${flags.searchQuery}"`);
		}

		track = firstSong.data as Track;
	} else if (flags.playPlaylist) {
		const playlist = await musicService.getPlaylist(flags.playPlaylist);
		track = playlist.tracks[0];
		if (!track) {
			throw new Error(
				`No playable tracks found in playlist: ${flags.playPlaylist}`,
			);
		}
	}

	if (!track) {
		throw new Error('No track resolved for playback command.');
	}

	const artists =
		track.artists.length > 0
			? track.artists.map(artist => artist.name).join(', ')
			: 'Unknown Artist';
	console.log(`Playing: ${track.title} — ${artists}`);
	const youtubeUrl = `https://www.youtube.com/watch?v=${track.videoId}`;
	await playerService.play(youtubeUrl, playbackOptions);
}

if (command === 'plugins') {
	const subCommand = args[0];
	const pluginArg = args[1];

	void (async () => {
		const installer = getPluginInstallerService();
		const updater = getPluginUpdaterService();
		const registry = getPluginRegistryService();

		// Load existing plugins
		await registry.loadAllPlugins();

		switch (subCommand) {
			case 'list': {
				const plugins = registry.getAllPlugins();
				if (plugins.length === 0) {
					console.log('No plugins installed.');
				} else {
					console.log('Installed plugins:');
					for (const plugin of plugins) {
						const status = plugin.enabled ? '●' : '○';
						console.log(
							`  ${status} ${plugin.manifest.name} v${plugin.manifest.version}`,
						);
					}
				}
				process.exit(0);
				break;
			}

			case 'install': {
				if (!pluginArg) {
					console.error('Usage: youtube-music-cli plugins install <name|url>');
					process.exit(1);
				}

				console.log(`Installing ${pluginArg}...`);
				let result;
				if (pluginArg.startsWith('http')) {
					result = await installer.installFromGitHub(pluginArg);
				} else {
					result = await installer.installFromDefaultRepo(pluginArg);
				}

				if (result.success) {
					console.log(`✓ Successfully installed ${result.pluginId}`);
				} else {
					console.error(`✗ Failed: ${result.error}`);
					process.exit(1);
				}
				process.exit(0);
				break;
			}

			case 'remove':
			case 'uninstall': {
				if (!pluginArg) {
					console.error('Usage: youtube-music-cli plugins remove <name>');
					process.exit(1);
				}

				console.log(`Removing ${pluginArg}...`);
				try {
					await registry.unloadPlugin(pluginArg);
				} catch {
					// Plugin may not be loaded
				}
				const result = await installer.uninstall(pluginArg);

				if (result.success) {
					console.log(`✓ Successfully removed ${pluginArg}`);
				} else {
					console.error(`✗ Failed: ${result.error}`);
					process.exit(1);
				}
				process.exit(0);
				break;
			}

			case 'update': {
				if (!pluginArg) {
					console.error('Usage: youtube-music-cli plugins update <name>');
					process.exit(1);
				}

				console.log(`Updating ${pluginArg}...`);
				const result = await updater.updatePlugin(pluginArg);

				if (result.success) {
					console.log(
						`✓ Updated ${pluginArg} from ${result.oldVersion} to ${result.newVersion}`,
					);
				} else {
					console.error(`✗ Failed: ${result.error}`);
					process.exit(1);
				}
				process.exit(0);
				break;
			}

			case 'enable': {
				if (!pluginArg) {
					console.error('Usage: youtube-music-cli plugins enable <name>');
					process.exit(1);
				}

				try {
					await registry.enablePlugin(pluginArg);
					console.log(`✓ Enabled ${pluginArg}`);
				} catch (error) {
					console.error(
						`✗ Failed: ${error instanceof Error ? error.message : String(error)}`,
					);
					process.exit(1);
				}
				process.exit(0);
				break;
			}

			case 'disable': {
				if (!pluginArg) {
					console.error('Usage: youtube-music-cli plugins disable <name>');
					process.exit(1);
				}

				try {
					await registry.disablePlugin(pluginArg);
					console.log(`✓ Disabled ${pluginArg}`);
				} catch (error) {
					console.error(
						`✗ Failed: ${error instanceof Error ? error.message : String(error)}`,
					);
					process.exit(1);
				}
				process.exit(0);
				break;
			}

			default:
				console.error(
					'Usage: youtube-music-cli plugins <list|install|remove|update|enable|disable>',
				);
				process.exit(1);
		}
	})();
} else {
	// Handle other direct commands

	if (command === 'play' && args[0]) {
		// Play specific track
		(cli.flags as Flags).playTrack = args[0];
	} else if (command === 'search' && args[0]) {
		// Search for query
		(cli.flags as Flags).searchQuery = args.join(' ');
	} else if (command === 'playlist' && args[0]) {
		// Play specific playlist
		(cli.flags as Flags).playPlaylist = args[0];
	} else if (command === 'suggestions') {
		// Show suggestions
		(cli.flags as Flags).showSuggestions = true;
	} else if (command === 'pause') {
		(cli.flags as Flags).action = 'pause';
	} else if (command === 'resume') {
		(cli.flags as Flags).action = 'resume';
	} else if (command === 'skip') {
		(cli.flags as Flags).action = 'next';
	} else if (command === 'back') {
		(cli.flags as Flags).action = 'previous';
	}

	const flags = cli.flags as Flags;
	const shouldRunDirectPlayback =
		requiresImmediatePlayback(flags) &&
		(flags.headless || !isInteractiveTerminal);

	if (shouldRunDirectPlayback) {
		void (async () => {
			const dependencyCheck = await ensurePlaybackDependencies({
				interactive: isInteractiveTerminal,
			});
			if (!dependencyCheck.ready) {
				process.exit(1);
				return;
			}

			try {
				await runDirectPlaybackCommand(flags);
				process.exit(0);
			} catch (error) {
				console.error(
					`✗ Playback failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
		})();
	} else if (command === 'import') {
		// Handle import commands
		void (async () => {
			const source = args[0];
			const url = args[1];

			if (!source || !url) {
				console.error(
					'Usage: youtube-music-cli import <spotify|youtube> <url-or-id>',
				);
				process.exit(1);
			}

			if (source !== 'spotify' && source !== 'youtube') {
				console.error('Invalid source. Use "spotify" or "youtube".');
				process.exit(1);
			}

			const importService = getImportService();
			const customName = cli.flags.name;

			try {
				console.log(`Importing ${source} playlist...`);
				const result = await importService.importPlaylist(
					source,
					url,
					customName,
				);

				console.log(`\n✓ Import completed!`);
				console.log(`  Playlist: ${result.playlistName}`);
				console.log(`  Matched: ${result.matched}/${result.total} tracks`);

				if (result.errors.length > 0) {
					console.log(`\nErrors:`);
					for (const error of result.errors.slice(0, 10)) {
						console.log(`  - ${error}`);
					}
					if (result.errors.length > 10) {
						console.log(`  ... and ${result.errors.length - 10} more`);
					}
				}

				process.exit(0);
			} catch (error) {
				console.error(
					`✗ Import failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
		})();
	} else if (cli.flags.web || cli.flags.webOnly) {
		// Handle web server flags
		void (async () => {
			const webManager = getWebServerManager();

			try {
				if (shouldCheckPlaybackDependencies(command, flags)) {
					const dependencyCheck = await ensurePlaybackDependencies({
						interactive: isInteractiveTerminal,
					});
					if (!dependencyCheck.ready && requiresImmediatePlayback(flags)) {
						process.exit(1);
						return;
					}
				}

				await webManager.start({
					enabled: true,
					host: cli.flags.webHost ?? 'localhost',
					port: cli.flags.webPort ?? 8080,
					webOnly: cli.flags.webOnly,
					auth: cli.flags.webAuth,
				});

				const serverUrl = webManager.getServerUrl();
				console.log(`Web UI server running at: ${serverUrl}`);

				// Set up import progress streaming
				const streamingService = getWebStreamingService();
				const importService = getImportService();
				importService.onProgress(progress => {
					streamingService.onImportProgress(progress);
				});

				// If web-only mode, just keep the server running
				if (cli.flags.webOnly) {
					console.log('Running in web-only mode. Press Ctrl+C to exit.');
					// Keep process alive
					process.on('SIGINT', () => {
						console.log('\nShutting down web server...');
						void webManager.stop().then(() => process.exit(0));
					});
				} else {
					// Also render the CLI UI
					render(<App flags={flags} />);
				}
			} catch (error) {
				console.error(
					`Failed to start web server: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
		})();
	} else {
		void (async () => {
			if (shouldCheckPlaybackDependencies(command, flags)) {
				const dependencyCheck = await ensurePlaybackDependencies({
					interactive: isInteractiveTerminal,
				});
				if (!dependencyCheck.ready && requiresImmediatePlayback(flags)) {
					process.exit(1);
					return;
				}
			}

			// Check for updates before rendering the app (skip in web-only mode)
			if (!cli.flags.webOnly) {
				const versionCheck = getVersionCheckService();
				const config = getConfigService();
				const lastCheck = config.getLastVersionCheck();

				if (versionCheck.shouldCheck(lastCheck)) {
					const result = await versionCheck.checkForUpdates(APP_VERSION);
					config.setLastVersionCheck(versionCheck.markChecked());

					if (result.hasUpdate) {
						console.log('');
						console.log(
							` Update available: ${APP_VERSION} → ${result.latestVersion}`,
						);
						console.log('Run: npm install -g @involvex/youtube-music-cli');
						console.log('');
					}
				}
			}

			// Render the app
			render(<App flags={flags} />);
		})();
	}
}
