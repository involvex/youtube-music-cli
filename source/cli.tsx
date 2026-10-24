#!/usr/bin/env node
import type {Flags} from './types/cli.types.ts';
import App from './app.tsx';
import {render} from 'ink';
import meow from 'meow';
import {getPluginInstallerService} from './services/plugin/plugin-installer.service.ts';
import {getAutoUpdateService} from './services/config/auto-update.service.ts';
import {getPluginUpdaterService} from './services/plugin/plugin-updater.service.ts';
import {getPluginRegistryService} from './services/plugin/plugin-registry.service.ts';
import {getImportService} from './services/import/import.service.ts';
import {getWebServerManager} from './services/web/web-server-manager.ts';
import {getWebStreamingService} from './services/web/web-streaming.service.ts';
import {getVersionCheckService} from './services/version-check/version-check.service.ts';
import {
	generateCompletion,
	type ShellType,
} from './services/completions/completions.service.ts';
import {getConfigService} from './services/config/config.service.ts';
import {getPlayerService} from './services/player/player.service.ts';
import {
	showLogs,
	openLogs,
	showLogPath,
	setLogPath,
} from './services/logs/logs-handler.ts';
import {runConfigDoctor} from './services/config/config-doctor.ts';
import {APP_VERSION} from './utils/constants.ts';
import {formatBytes} from './utils/format.ts';
import {ensurePlaybackDependencies} from './services/player/dependency-check.service.ts';
import {getMusicService} from './services/youtube-music/api.ts';
import type {Track} from './types/youtube-music.types.ts';
import {logger} from './services/logger/logger.service.ts';
import {resolveTrackPlayUrl} from './utils/local-track.ts';

// Global error handlers to prevent crashes from unhandled rejections/exceptions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason: any, _promise: any) => {
	logger.error('UnhandledRejection', 'Unhandled promise rejection', {
		reason: reason instanceof Error ? reason.message : String(reason),
		stack: reason instanceof Error ? reason.stack : undefined,
	});
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('uncaughtException', (err: any) => {
	logger.error('UncaughtException', 'Uncaught exception', {
		error: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
	});
	// Don't exit; just log to keep CLI alive
});

const isStandalone =
	(process as unknown as {isStandaloneExecutable?: boolean})
		.isStandaloneExecutable ||
	(globalThis as unknown as {Bun?: {isStandalone: boolean}}).Bun?.isStandalone;
const argv = isStandalone ? process.argv.slice(1) : process.argv.slice(2);

const cli = meow(
	`
	youtube-music-cli@${APP_VERSION}

	🎵 Usage
	  $ youtube-music-cli
	  $ youtube-music-cli play <track-id|youtube-url>
	  $ youtube-music-cli search <query>
	  $ youtube-music-cli playlist <playlist-id>
	  $ youtube-music-cli sync <playlist-id|ytm-url>
	  $ youtube-music-cli suggestions
	  $ youtube-music-cli radio <track-id>
	  $ youtube-music-cli pause
	  $ youtube-music-cli resume
	  $ youtube-music-cli skip
	  $ youtube-music-cli back

	🔌 Plugin Commands
	  $ youtube-music-cli plugins list
	  $ youtube-music-cli plugins install <name|url>
	  $ youtube-music-cli plugins remove <name>
	  $ youtube-music-cli plugins update <name>
	  $ youtube-music-cli plugins enable <name>
	  $ youtube-music-cli plugins disable <name>

	📥 Import Commands
	  $ youtube-music-cli import spotify <url-or-id>
	  $ youtube-music-cli import youtube <url-or-id>

	📥 Sync Commands
	  $ youtube-music-cli sync <playlist-id|ytm-url>    Sync a YTM playlist to local config
	  $ youtube-music-cli sync search <query>         Search YTM playlists to sync
	  $ youtube-music-cli sync list                   List locally synced playlists

	📋 Logs Commands
	  $ youtube-music-cli logs                    Show recent debug logs
	  $ youtube-music-cli logs --open             Open log file in default editor
	  $ youtube-music-cli logs --get-path         Print log file path
	  $ youtube-music-cli logs --set-path <path>  Set custom log file path

	🚀 Update Commands
	  $ youtube-music-cli update                  Check for updates and auto-update
	  $ youtube-music-cli update <version>        Update to a specific version
	  $ youtube-music-cli update --check          Check for updates without installing
	  $ youtube-music-cli update --dry-run        Simulate update installation

	📊 Stats Commands
	  $ youtube-music-cli stats                   Print listening statistics
	  $ youtube-music-cli stats --share           Print + copy share card
	  $ youtube-music-cli stats --export [path]   Write share card to file

	🔧 Config Commands
	  $ youtube-music-cli config doctor           Check config for issues
	  $ youtube-music-cli config doctor --fix     Auto-fix config issues
	  $ youtube-music-cli config backup           Create backup of config and data
	  $ youtube-music-cli config backup --backup-list    List available backups
	  $ youtube-music-cli config backup --backup-restore <name>  Restore from backup
	  $ youtube-music-cli config backup --backup-clean [--backup-keep=N]  Remove old backups
	  $ youtube-music-cli config backup --backup-compress  Create compressed archive

	🔐 Auth Commands
	  $ youtube-music-cli login                Sign in to YouTube Music (OAuth2 device flow)
	  $ youtube-music-cli login --cookies-file <file>  Sign in using cookies from a Netscape cookies.txt file
	  $ youtube-music-cli login --cookies-from-browser <browser>  Sign in using cookies from a browser (chrome, firefox, edge, brave)
	  $ youtube-music-cli logout               Sign out and remove credentials
	  $ youtube-music-cli whoami               Show current account status

	⚙️  Options
	  --theme, -t          Theme to use (dark, light, midnight, matrix, etc.)
	  --volume, -v         Initial volume (0-100)
	  --shuffle, -s        Enable shuffle mode
	  --repeat, -r         Repeat mode (off, all, one)
	  --continue, -c       Resume last played track/playlist
	  --headless           Run without TUI (just play)
	  --win32              Windows immersive TUI mode with visualizer
	  --web                Enable web UI server
	  --web-host           Web server host (default: localhost)
	  --web-port           Web server port (default: 8080)
	  --web-only           Run web server without CLI UI
	  --web-auth           Authentication token for web server
	--name               Custom name for imported playlist
	  --verbose, -V        Enable verbose logging output
	  --help, -h           Show this help

	🐚 Shell Completions
	  $ youtube-music-cli completions bash
	  $ youtube-music-cli completions zsh
	  $ youtube-music-cli completions powershell
	  $ youtube-music-cli completions fish

	💡 Examples
	  $ youtube-music-cli
	  $ youtube-music-cli play dQw4w9WgXcQ
	  $ youtube-music-cli search "Rick Astley"
	  $ youtube-music-cli play dQw4w9WgXcQ --headless
	  $ youtube-music-cli plugins install adblock
	  $ youtube-music-cli import spotify "https://open.spotify.com/playlist/..."
	  $ youtube-music-cli --web --web-port 3000
	  $ youtube-music-cli completions powershell | Out-String | Invoke-Expression
`,
	{
		importMeta: import.meta,
		argv,
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
			continue: {
				type: 'boolean',
				shortFlag: 'c',
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
			win32: {
				type: 'boolean',
				default: false,
			},
			help: {
				type: 'boolean',
				shortFlag: 'h',
				default: false,
			},
			// Logs command flags
			open: {
				type: 'boolean',
				default: false,
			},
			getPath: {
				type: 'boolean',
				default: false,
			},
			setPath: {
				type: 'string',
			},
			// Config doctor flags
			fix: {
				type: 'boolean',
				default: false,
			},
			// Verbose logging flag
			dryRun: {
				type: 'boolean',
			},
			check: {
				type: 'boolean',
			},
			// Stats command flags
			share: {
				type: 'boolean',
				default: false,
			},
			export: {
				type: 'string',
			},
			// Config backup flags
			backupCompress: {
				type: 'boolean',
				default: false,
			},
			backupList: {
				type: 'boolean',
				default: false,
			},
			backupRestore: {
				type: 'string',
			},
			backupClean: {
				type: 'boolean',
				default: false,
			},
			backupKeep: {
				type: 'number',
			},
			backupDryRun: {
				type: 'boolean',
				default: false,
			},
			backupIncludeLogs: {
				type: 'boolean',
				default: false,
			},
			backupForce: {
				type: 'boolean',
				default: false,
			},
			// Auth command flags
			cookiesFile: {
				type: 'string',
			},
			cookiesFromBrowser: {
				type: 'string',
			},
		},
		autoVersion: true,
		autoHelp: false,
	},
);

if (cli.flags.help) {
	cli.showHelp(0);
}

// Enable verbose mode if --verbose flag is passed
if (cli.flags.verbose) {
	logger.setVerbose(true);
}

// Handle plugin commands
const command = cli.input[0];
const args = cli.input.slice(1);

// Handle logs command
if (command === 'logs') {
	if (cli.flags.open) {
		openLogs();
	} else if (cli.flags.getPath) {
		showLogPath();
	} else if (cli.flags.setPath) {
		setLogPath(cli.flags.setPath);
	} else {
		showLogs();
	}
}

// Handle stats command
if (command === 'stats') {
	const {loadHistory} = await import('./services/history/history.service.ts');
	const {computeStats} = await import('./services/stats/stats.service.ts');
	const {
		STATS_SHARE_DEFAULT_PATH,
		copyTextToClipboard,
		formatStatsShareCard,
		writeStatsShareFile,
	} = await import('./services/stats/stats-share.ts');

	const entries = await loadHistory();
	const stats = computeStats(entries);
	const card = formatStatsShareCard(stats);
	console.log(card);

	if (cli.flags.share) {
		const copied = await copyTextToClipboard(card);
		console.log(
			copied
				? '\n(Copied share card to clipboard)'
				: '\n(Clipboard unavailable — use --export to write a file)',
		);
	}

	const exportFlag = cli.flags.export as string | undefined;
	const wantsExport =
		exportFlag !== undefined || process.argv.includes('--export');
	if (wantsExport) {
		const outPath =
			typeof exportFlag === 'string' && exportFlag.length > 0
				? exportFlag
				: STATS_SHARE_DEFAULT_PATH;
		const written = await writeStatsShareFile(card, outPath);
		console.log(`\nExported share card to ${written}`);
	}

	process.exit(0);
}

// Handle config doctor command
if (command === 'config' && args[0] === 'doctor') {
	runConfigDoctor(cli.flags.fix);
}

// Handle config backup command
if (command === 'config' && args[0] === 'backup') {
	const {getBackupService} =
		await import('./services/config/backup.service.ts');
	const backupService = getBackupService();

	const flags = cli.flags as Flags;

	if (flags.backupList) {
		const backups = await backupService.listBackups();
		if (backups.length === 0) {
			console.log('No backups found.');
		} else {
			console.log('Available backups:\n');
			for (const backup of backups) {
				const date = new Date(backup.createdAt).toLocaleString();
				const size = formatBytes(backup.size);
				const type = backup.compressed ? ' (compressed)' : '';
				console.log(`  ${backup.name}  ${date}  ${size}${type}`);
			}
		}
		process.exit(0);
	}

	if (flags.backupRestore) {
		await backupService.restoreBackup(flags.backupRestore, {
			dryRun: flags.backupDryRun,
			force: flags.backupForce,
		});
		process.exit(0);
	}

	if (flags.backupClean) {
		const removed = await backupService.cleanBackups({
			keepCount: flags.backupKeep ?? 10,
			dryRun: flags.backupDryRun,
		});
		if (flags.backupDryRun) {
			console.log(`Would remove ${removed} backup(s).`);
		} else {
			console.log(`Removed ${removed} backup(s).`);
		}
		process.exit(0);
	}

	// Default: create backup
	const result = await backupService.createBackup({
		compress: flags.backupCompress,
		dryRun: flags.backupDryRun,
		includeLogs: flags.backupIncludeLogs,
	});
	if (flags.backupDryRun) {
		console.log(`Would create backup: ${result.name}`);
		console.log(`  Files: ${result.fileCount}`);
		console.log(`  Size: ${formatBytes(result.size)}`);
	} else {
		console.log(`✓ Created backup: ${result.name}`);
		console.log(`  Files: ${result.fileCount}`);
		console.log(`  Size: ${formatBytes(result.size)}`);
		if (result.compressed) {
			console.log(`  Compressed: ${result.compressedPath}`);
		}
	}
	process.exit(0);
}

// Handle auth commands
if (command === 'login') {
	const {COOKIE_LOGIN_HINT, getAuthService} =
		await import('./services/auth/auth.service.ts');
	const authService = getAuthService();
	const status = authService.getStatus();

	const cookiesFile = cli.flags.cookiesFile as string | undefined;
	const cookiesFromBrowser = cli.flags.cookiesFromBrowser as
		'chrome' | 'firefox' | 'edge' | 'brave' | undefined;

	if (cookiesFile) {
		console.log('Starting YouTube Music login (cookie import from file)...');
		const result = await authService.signInFromCookieFile(cookiesFile);
		if (result.success) {
			console.log('');
			console.log('✓ Successfully signed in to YouTube Music (cookies)');
			process.exit(0);
		} else {
			console.error(`\n✗ Login failed: ${result.error ?? 'Unknown error'}`);
			process.exit(1);
		}
	}

	if (cookiesFromBrowser) {
		console.log(
			`Starting YouTube Music login (cookie import from ${cookiesFromBrowser})...`,
		);
		const result = await authService.signInFromBrowser(cookiesFromBrowser);
		if (result.success) {
			console.log('');
			console.log('✓ Successfully signed in to YouTube Music (cookies)');
			process.exit(0);
		} else {
			console.error(`\n✗ Login failed: ${result.error ?? 'Unknown error'}`);
			if (process.platform === 'win32') {
				console.error(
					'\nOn Windows, browser cookie extraction may fail if the browser is running.\n' +
						'Try closing your browser completely, then retry.\n' +
						'Or export cookies manually and use:\n' +
						'  ymc login --cookies-file <path-to-cookies.txt>\n' +
						'\nTip: Export cookies from Edge via:\n' +
						'  Settings → Cookies → Manage → Export\n' +
						'Then use: ymc login --cookies-file exported-cookies.txt',
				);
			} else {
				console.error(
					'\nTip: You can also sign in using a cookie file:\n' +
						'  ymc login --cookies-file <path-to-cookies.txt>',
				);
			}

			process.exit(1);
		}
	}

	if (status.loggedIn) {
		const accountLabel = status.accountName ?? 'YouTube account';
		console.log(`Already signed in as: ${accountLabel}`);
		if (status.method === 'cookie') {
			console.log('(Using cookie-based authentication)');
		} else if (!status.tokenValid) {
			console.log('(Token expired — will refresh on next API call)');
		}
		process.exit(0);
	}

	console.log('Starting YouTube Music login...');
	console.log('');

	const result = await authService.signIn({
		onProgress: message => {
			console.log(message);
		},
		onDeviceCode: ({verificationUrl, userCode}) => {
			console.log('');
			console.log(`Open ${verificationUrl} in your browser`);
			console.log(`Enter this code: ${userCode}`);
			console.log('');
			console.log('Waiting for authorization...');
		},
	});

	if (result.success) {
		console.log('');
		console.log('✓ Successfully signed in to YouTube Music!');
		process.exit(0);
	} else {
		console.error(`\n✗ Login failed: ${result.error ?? 'Unknown error'}`);
		console.error(`\n${COOKIE_LOGIN_HINT}`);
		process.exit(1);
	}
}

if (command === 'logout') {
	const {getAuthService} = await import('./services/auth/auth.service.ts');
	const authService = getAuthService();
	const status = authService.getStatus();

	if (!status.loggedIn) {
		console.log('Not signed in.');
		process.exit(0);
	}

	const success = await authService.signOut();
	if (success) {
		console.log('✓ Signed out successfully.');
	} else {
		console.error('✗ Failed to sign out.');
		process.exit(1);
	}
}

if (command === 'whoami') {
	const {getAuthService} = await import('./services/auth/auth.service.ts');
	const authService = getAuthService();
	const status = authService.getStatus();

	if (!status.loggedIn) {
		console.log('Not signed in. Run `ymc login` to authenticate.');
		process.exit(0);
	}

	console.log(`Account: ${status.accountName ?? 'YouTube account'}`);
	console.log(`Signed in: ${status.signedInAt ?? 'Unknown'}`);
	console.log(
		`Token valid: ${status.tokenValid ? 'Yes' : 'Expired (will refresh)'}`,
	);
	process.exit(0);
}

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
		volumeFadeDuration: config.get('volumeFadeDuration'),
		proxy: config.get('proxy'),
		cookiesFile: config.get('cookiesFile'),
		cookiesFromBrowser: config.get('cookiesFromBrowser'),
	};

	const isDirectAudioUrl = (url: string): boolean => {
		return url.startsWith('http') && /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(url);
	};

	let track: Track | null | undefined;
	let directUrl: string | undefined;
	if (flags.playTrack) {
		if (isDirectAudioUrl(flags.playTrack)) {
			directUrl = flags.playTrack;
		} else {
			track = await musicService.getTrack(flags.playTrack);
			if (!track) {
				throw new Error(`Track not found: ${flags.playTrack}`);
			}
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

	if (!track && !directUrl) {
		throw new Error('No track resolved for playback command.');
	}

	if (directUrl) {
		console.log(`Playing: ${directUrl}`);
		await playerService.play(directUrl, playbackOptions);
	} else if (track) {
		const artists =
			track.artists.length > 0
				? track.artists.map(artist => artist.name).join(', ')
				: 'Unknown Artist';
		console.log(`Playing: ${track.title} — ${artists}`);
		const resolved = resolveTrackPlayUrl(track, {
			preferLocal: getConfigService().get('preferLocalPlayback') ?? true,
			downloadDirectory: getConfigService().get('downloadDirectory'),
			downloadFormat: getConfigService().get('downloadFormat') ?? 'mp3',
		});
		if (resolved.source === 'local') {
			console.log(`Source: local file (${resolved.url})`);
		}
		await playerService.play(resolved.url, playbackOptions);
	}
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let result: any;
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

	if (command === 'completions') {
		const shell = args[0] as ShellType | undefined;
		const validShells: ShellType[] = ['bash', 'zsh', 'powershell', 'fish'];
		if (!shell || !validShells.includes(shell)) {
			console.error(
				'Usage: youtube-music-cli completions <bash|zsh|powershell|fish>',
			);
			process.exit(1);
		}

		console.log(generateCompletion(shell));
		process.exit(0);
	} else if (command === 'update') {
		const targetVersion = args[0];
		const autoUpdate = getAutoUpdateService();
		const channel = autoUpdate.detectChannel();
		const dryRun = Boolean(cli.flags.dryRun);
		const checkOnly = Boolean(cli.flags.check);

		console.log(`Detected install channel: ${channel}`);
		console.log(
			checkOnly ? 'Checking for updates...' : 'Checking and updating...',
		);

		const result = await autoUpdate.update(targetVersion, {
			dryRun,
			checkOnly,
		});

		if (result.success) {
			console.log(`\n✓ ${result.message}`);
			process.exit(0);
		} else {
			console.error(`\n✗ ${result.message}`);
			process.exit(1);
		}
	} else if (command === 'play' && args[0]) {
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
	} else if (command === 'radio' && args[0]) {
		// Start radio from track ID
		(cli.flags as Flags).radioSeed = {
			type: 'track',
			id: args[0],
			name: args[0],
		};
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

	// Check for immersive Windows mode
	if (flags.win32 && process.platform === 'win32') {
		void (async () => {
			try {
				const {startImmersiveApp} =
					await import('./immersive/immersive-app.ts');
				await startImmersiveApp({
					flags,
					discoMode: process.env.DISCO_MODE === 'true',
				});
			} catch (error) {
				console.error(
					`Failed to start immersive mode: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
		})();
	} else {
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
		} else if (command === 'sync') {
			// Handle sync command
			void (async () => {
				const {getSyncService} =
					await import('./services/sync/sync.service.ts');
				const syncService = getSyncService();

				// Check authentication
				if (!syncService.isAuthenticated()) {
					console.error(
						'You must be signed in to sync playlists.\n' +
							'Run: ymc login\n' +
							'Or sign in with cookies: ymc login --cookies-file <path>',
					);
					process.exit(1);
				}

				const subcommand = args[0];

				if (!subcommand || subcommand === 'help') {
					console.log(`youtube-music-cli sync

Usage:
  ymc sync <playlist-id|ytm-url>   Sync a YTM playlist to local config
  ymc sync search <query>          Search YTM playlists to sync
  ymc sync list                    List locally synced playlists

Examples:
  ymc sync "https://music.youtube.com/playlist?list=VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP"
  ymc sync VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP --name "My Chill Mix"
  ymc sync search "lofi hip hop"
  ymc sync list
`);
					process.exit(0);
				}

				if (subcommand === 'list') {
					const playlists = syncService.listPlaylists();
					if (playlists.length === 0) {
						console.log('No synced playlists found. Sync one with:');
						console.log(
							'  ymc sync "https://music.youtube.com/playlist?list=..."',
						);
						process.exit(0);
					}
					console.log('Synced playlists:\n');
					for (let i = 0; i < playlists.length; i++) {
						const p = playlists[i]!;
						console.log(
							`${i + 1}. ${p.name} (${p.tracks.length} tracks) [${p.playlistId}]`,
						);
					}
					process.exit(0);
				}

				if (subcommand === 'search') {
					const query = args.slice(1).join(' ');
					if (!query) {
						console.error('Usage: ymc sync search <query>');
						process.exit(1);
					}

					console.log(`Searching YouTube Music playlists for "${query}"...`);
					const results = await syncService.searchPlaylists(query, 10);

					if (results.length === 0) {
						console.log('No playlists found.');
						process.exit(0);
					}

					console.log(`\nFound ${results.length} playlists:\n`);
					for (let i = 0; i < results.length; i++) {
						const p = results[i]!;
						console.log(
							`${i + 1}. ${p.name} (${p.tracks.length ?? 0} tracks) [${p.playlistId}]`,
						);
					}

					console.log('\nTo sync one of these, run: ymc sync <playlist-id>');
					process.exit(0);
				}

				// Default: sync by ID/URL
				const playlistId = subcommand;
				const customName = cli.flags.name;

				const result = await syncService.syncPlaylist(
					playlistId,
					customName,
					progress => {
						console.log(`  ${progress.message}`);
					},
				);

				if (result.wasUpdated) {
					console.log(
						`\n✓ Updated playlist "${result.playlistName}" (${result.trackCount} tracks)`,
					);
				} else {
					console.log(
						`\n✓ Synced playlist "${result.playlistName}" (${result.trackCount} tracks)`,
					);
				}
				console.log('Saved to local config.');
				process.exit(0);
			})().catch(error => {
				console.error(
					`\n✗ Sync failed: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			});
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
		} else if (flags.web || flags.webOnly) {
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
						host: flags.webHost ?? 'localhost',
						port: flags.webPort ?? 8080,
						webOnly: flags.webOnly,
						auth: flags.webAuth,
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
					if (flags.webOnly) {
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
				if (!flags.webOnly) {
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
}
