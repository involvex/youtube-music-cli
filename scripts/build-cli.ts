import path from 'node:path';
import pkg from '../package.json' with {type: 'json'};

declare const Bun: {
	build: (options: {
		entrypoints: string[];
		compile: {
			target: string;
			outfile: string;
			footer?: string;
			windowsTitle?: string;
			windowsPublisher?: string;
			windowsIcon?: string;
			windowsCopyright?: string;
			windowsDescription?: string;
		};
		footer?: string;
		minify?: boolean;
		sourcemap?: string | boolean;
		bytecode?: boolean;
		define?: Record<string, string>;
	}) => Promise<{
		success: boolean;
		logs?: unknown;
		outputs: Array<{path: string}>;
	}>;
};

const rootDir = process.cwd();
const isWindows = process.platform === 'win32';
const outputName = isWindows ? 'youtube-music-cli.exe' : 'youtube-music-cli';
const outfile = path.join(rootDir, 'dist', outputName);
const banner = '//Copyright (c) 2026 involvex';
const iconPath = path.join(rootDir, 'assets', 'icon.ico');

const platformTarget = isWindows
	? 'bun-windows-x64'
	: process.platform === 'darwin'
		? 'bun-darwin-x64'
		: 'bun-linux-x64';

const compileOptions = isWindows
	? {
			target: platformTarget,
			outfile,
			footer: banner,
			windowsTitle: 'YouTube Music CLI',
			windowsPublisher: 'involvex',
			windowsIcon: iconPath,
			windowsCopyright: 'Copyright (c) 2026 involvex',
			windowsDescription: 'A Commandline music player for youtube-music',
		}
	: {
			target: platformTarget,
			outfile,
		};

const buildOptions = {
	entrypoints: [path.join(rootDir, 'source', 'cli.tsx')],
	compile: compileOptions,
	footer: banner,
	minify: true,
	sourcemap: 'linked',
	bytecode: true,
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		VERSION: JSON.stringify(pkg.version ?? '0.0.0'),
	},
};

const result = await Bun.build(buildOptions);

if (!result.success) {
	console.error('Build failed', result.logs ?? result);
	process.exit(1);
}

console.log(
	'Build succeeded:',
	result.outputs.map(output => output.path),
);
