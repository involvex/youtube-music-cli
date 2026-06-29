import meow from 'meow';
import type {Flags} from './types/cli.types.ts';
import {APP_VERSION} from './utils/constants.ts';

function getCliArgv(): string[] {
	const isStandalone =
		(process as unknown as {isStandaloneExecutable?: boolean})
			.isStandaloneExecutable ||
		(globalThis as unknown as {Bun?: {isStandalone: boolean}}).Bun
			?.isStandalone;
	return isStandalone ? process.argv.slice(1) : process.argv.slice(2);
}

/**
 * Parse CLI argv into {@link Flags}, including play/search/playlist subcommands.
 * Shared by cli.tsx and immersive-entry.tsx.
 */
export function parseCliFlags(argv: string[] = getCliArgv()): Flags {
	const cli = meow(
		`
	youtube-music-cli@${APP_VERSION}
`,
		{
			importMeta: import.meta,
			argv,
			flags: {
				theme: {type: 'string', shortFlag: 't'},
				volume: {type: 'number', shortFlag: 'v'},
				shuffle: {type: 'boolean', shortFlag: 's', default: false},
				continue: {type: 'boolean', shortFlag: 'c', default: false},
				repeat: {type: 'string', shortFlag: 'r'},
				headless: {type: 'boolean', default: false},
				web: {type: 'boolean', default: false},
				webHost: {type: 'string'},
				webPort: {type: 'number'},
				webOnly: {type: 'boolean', default: false},
				webAuth: {type: 'string'},
				name: {type: 'string'},
				win32: {type: 'boolean', default: false},
				help: {type: 'boolean', shortFlag: 'h', default: false},
			},
			autoVersion: true,
			autoHelp: false,
		},
	);

	const flags = cli.flags as Flags;
	const command = cli.input[0];
	const args = cli.input.slice(1);

	if (command === 'play' && args[0]) {
		flags.playTrack = args[0];
	} else if (command === 'search' && args[0]) {
		flags.searchQuery = args.join(' ');
	} else if (command === 'playlist' && args[0]) {
		flags.playPlaylist = args[0];
	} else if (command === 'suggestions') {
		flags.showSuggestions = true;
	} else if (command === 'radio' && args[0]) {
		flags.radioSeed = {type: 'track', id: args[0], name: args[0]};
	} else if (command === 'pause') {
		flags.action = 'pause';
	} else if (command === 'resume') {
		flags.action = 'resume';
	} else if (command === 'skip') {
		flags.action = 'next';
	} else if (command === 'back') {
		flags.action = 'previous';
	}

	return flags;
}
