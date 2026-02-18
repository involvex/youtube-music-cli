#!/usr/bin/env node
import type {Flags} from './types/cli.types.ts';
import App from './app.tsx';
import {render} from 'ink';
import meow from 'meow';
import {getPluginInstallerService} from './services/plugin/plugin-installer.service.ts';
import {getPluginUpdaterService} from './services/plugin/plugin-updater.service.ts';
import {getPluginRegistryService} from './services/plugin/plugin-registry.service.ts';

const cli = meow(
	`
	Usage
	  $ youtube-music-cli
	  $ youtube-music-cli play <track-id>
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

	Options
	  --theme, -t    Theme to use (dark, light, midnight, matrix)
	  --volume, -v   Initial volume (0-100)
	  --shuffle, -s   Enable shuffle mode
	  --repeat, -r   Repeat mode (off, all, one)
	  --headless     Run without TUI (just play)
	  --help, -h     Show this help

	Examples
	  $ youtube-music-cli
	  $ youtube-music-cli play dQw4w9WgXcQ
	  $ youtube-music-cli search "Rick Astley"
	  $ youtube-music-cli play dQw4w9WgXcQ --headless
	  $ youtube-music-cli plugins install adblock
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

	// Render the app
	render(<App flags={cli.flags as Flags} />);
}
