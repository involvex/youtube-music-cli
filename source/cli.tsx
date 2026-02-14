#!/usr/bin/env node
import type {Flags} from './types/cli.types.ts';
import App from './app.tsx';
import React from 'react';
import {render} from 'ink';
import meow from 'meow';

const cli = meow(
	`
	Usage
	  $ youtube-music-cli
	  $ youtube-music-cli play <track-id>
	  $ youtube-music-cli search <query>
	  $ youtube-music-cli playlist <playlist-id>

	Options
	  --theme, -t    Theme to use (dark, light, midnight, matrix)
	  --volume, -v   Initial volume (0-100)
	  --shuffle, -s   Enable shuffle mode
	  --repeat, -r   Repeat mode (off, all, one)
	  --help, -h     Show this help

	Examples
	  $ youtube-music-cli
	  $ youtube-music-cli play dQw4w9WgXcQ
	  $ youtube-music-cli search "Rick Astley"
	  $ youtube-music-cli --theme=matrix --shuffle
`,
	{
		importMeta: import.meta,
		flags: {
			theme: {
				type: 'string',
				alias: 't',
			},
			volume: {
				type: 'number',
				alias: 'v',
			},
			shuffle: {
				type: 'boolean',
				alias: 's',
				default: false,
			},
			repeat: {
				type: 'string',
				alias: 'r',
			},
			help: {
				type: 'boolean',
				alias: 'h',
				default: false,
			},
		},
		autoVersion: false,
		autoHelp: false,
	},
);

// Handle direct commands
const command = cli.input[0];
const args = cli.input.slice(1);

if (command === 'play' && args[0]) {
	// Play specific track
	(cli.flags as Flags).playTrack = args[0];
} else if (command === 'search' && args[0]) {
	// Search for query
	(cli.flags as Flags).searchQuery = args.join(' ');
} else if (command === 'playlist' && args[0]) {
	// Play specific playlist
	(cli.flags as Flags).playPlaylist = args[0];
}

// Render the app
render(<App flags={cli.flags as Flags} />);
