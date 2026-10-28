import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {BOOT_TAGLINE, resolveBootArt} from '../utils/boot-art.ts';
import {APP_NAME, APP_VERSION, GITHUB_REPO_URL} from '../utils/constants.ts';

const BOOT_TIMEOUT_MS = 1800;
const ANSI_RESET = '\x1B[0m';
const ANSI_GREEN = '\x1B[32m';
const ANSI_GREEN_BRIGHT = '\x1B[92m';
const ANSI_BOLD = '\x1B[1m';
const ANSI_DIM = '\x1B[2m';
const ANSI_HIDE_CURSOR = '\x1B[?25l';
const ANSI_SHOW_CURSOR = '\x1B[?25h';
const ANSI_CLEAR = '\x1B[2J\x1B[H';
const ANSI_ALT_BUFFER_IN = '\x1B[?1049h';
const ANSI_ALT_BUFFER_OUT = '\x1B[?1049l';

function getSponsorLine(): string {
	const root = process.cwd();
	const fundingPath = join(root, '.github', 'FUNDING.yml');
	const githubUrl = 'https://github.com/sponsors/involvex';

	try {
		const content = readFileSync(fundingPath, 'utf8');
		const doc = parse(content) as Record<string, unknown>;

		const github = doc.github;
		if (Array.isArray(github) && github.length > 0) {
			return `Sponsor: https://github.com/sponsors/${github[0]}`;
		}
	} catch {
		// fall through
	}

	return `Sponsor: ${githubUrl}`;
}

function padEnd(str: string, len: number): string {
	while (str.length < len) {
		str += ' ';
	}
	return str;
}

function centerLine(str: string, width: number): string {
	if (str.length >= width) {
		return str.slice(0, width);
	}

	const left = Math.floor((width - str.length) / 2);
	return padEnd(' '.repeat(left) + str, width);
}

function drawBootScreen(
	artLines: string[],
	sponsor: string,
	columns: number,
	rows: number,
): void {
	const frameWidth = Math.max(columns, 20);
	const frameHeight = Math.max(rows, 10);
	const innerWidth = Math.max(frameWidth - 2, 1);
	const innerHeight = Math.max(frameHeight - 2, 1);

	const contentLines = [
		...artLines,
		'',
		BOOT_TAGLINE,
		'',
		`${APP_NAME} v${APP_VERSION}`,
		GITHUB_REPO_URL,
		sponsor,
		'',
		'press any key',
	];

	const topPad = Math.max(
		0,
		Math.floor((innerHeight - contentLines.length) / 2),
	);
	const bottomPad = Math.max(0, innerHeight - contentLines.length - topPad);

	const bright = (text: string) =>
		`${ANSI_BOLD}${ANSI_GREEN_BRIGHT}${text}${ANSI_RESET}`;
	const green = (text: string) =>
		`${ANSI_BOLD}${ANSI_GREEN}${text}${ANSI_RESET}`;
	const dim = (text: string) => `${ANSI_DIM}${text}${ANSI_RESET}`;

	process.stdout.write(bright(`+${'-'.repeat(innerWidth)}+`) + '\n');

	for (let i = 0; i < topPad; i++) {
		process.stdout.write(green(`|${' '.repeat(innerWidth)}|`) + '\n');
	}

	for (let i = 0; i < contentLines.length; i++) {
		const line = contentLines[i] ?? '';
		const centered = centerLine(line, innerWidth);
		const isArt = i < artLines.length;
		const isTagline = line === BOOT_TAGLINE;
		const isPrompt = line === 'press any key';

		let painted: string;
		if (isArt || isPrompt) {
			painted = bright(centered);
		} else if (isTagline) {
			painted = green(centered);
		} else if (line.length === 0) {
			painted = centered;
		} else {
			painted = dim(centered);
		}

		process.stdout.write(green('|') + painted + green('|') + '\n');
	}

	for (let i = 0; i < bottomPad; i++) {
		process.stdout.write(green(`|${' '.repeat(innerWidth)}|`) + '\n');
	}

	process.stdout.write(bright(`+${'-'.repeat(innerWidth)}+`) + '\n');
}

export async function showImmersiveBootScreen(): Promise<void> {
	if (process.platform !== 'win32') {
		return;
	}

	if (!process.stdin.isTTY) {
		return;
	}

	const width = process.stdout.columns || 120;
	const height = process.stdout.rows || 30;
	const artLines = resolveBootArt(Math.max(width - 4, 10));
	const sponsor = getSponsorLine();

	let stdinRawMode = false;
	let stdinListener: ((data: string) => void) | null = null;
	let resolved = false;

	const resolve = () => {
		if (resolved) return;
		resolved = true;

		process.stdout.write(ANSI_SHOW_CURSOR);
		if (stdinRawMode) {
			process.stdin.setRawMode(false);
		}
		if (stdinListener) {
			process.stdin.off('data', stdinListener);
		}
		process.stdout.write(ANSI_ALT_BUFFER_OUT);
	};

	try {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		stdinRawMode = true;

		process.stdout.write(ANSI_ALT_BUFFER_IN);
		process.stdout.write(ANSI_HIDE_CURSOR);
		process.stdout.write(ANSI_CLEAR);

		drawBootScreen(artLines, sponsor, width, height);

		await new Promise<void>(res => {
			resolved = false;
			const timeout = setTimeout(() => {
				resolve();
				res();
			}, BOOT_TIMEOUT_MS);

			stdinListener = () => {
				clearTimeout(timeout);
				resolve();
				res();
			};

			process.stdin.on('data', stdinListener);
		});
	} catch {
		resolve();
	}
}
