import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';

export type PlaybackDependency = 'mpv' | 'yt-dlp';

export type InstallPlan = {
	command: string;
	args: string[];
};

const REQUIRED_DEPENDENCIES: PlaybackDependency[] = ['mpv', 'yt-dlp'];

function getDependencyExecutable(dependency: PlaybackDependency): string {
	return dependency;
}

function renderInstallCommand(plan: InstallPlan): string {
	return [plan.command, ...plan.args].join(' ');
}

function runCommand(
	command: string,
	args: string[],
	options: {stdio: 'ignore' | 'inherit'},
): Promise<boolean> {
	return new Promise(resolve => {
		const child = spawn(command, args, {
			stdio: options.stdio,
		});

		child.once('error', () => {
			resolve(false);
		});

		child.once('close', code => {
			resolve(code === 0);
		});
	});
}

async function commandExists(command: string): Promise<boolean> {
	return runCommand(command, ['--version'], {stdio: 'ignore'});
}

/** Warn when yt-dlp is older than this: YouTube breaks old versions often. */
export const YTDLP_STALE_AFTER_DAYS = 45;

/** Parse `yt-dlp --version` output (YYYY.MM.DD) into a Date, or null. */
export function parseYtDlpVersionDate(output: string): Date | null {
	const match = output.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})/);
	if (!match?.[1] || !match?.[2] || !match?.[3]) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
}

export function isYtDlpVersionStale(
	versionOutput: string,
	now: Date = new Date(),
	staleAfterDays: number = YTDLP_STALE_AFTER_DAYS,
): boolean {
	const released = parseYtDlpVersionDate(versionOutput);
	if (!released) {
		return false;
	}

	const ageMs = now.getTime() - released.getTime();
	return ageMs > staleAfterDays * 24 * 60 * 60 * 1000;
}

function captureStdout(
	command: string,
	args: string[],
	timeoutMs = 10_000,
): Promise<string | null> {
	return new Promise(resolve => {
		const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'ignore']});
		let output = '';
		let settled = false;
		const settle = (value: string | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(value);
		};

		// Never let a hung executable stall startup: kill and give up.
		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			settle(null);
		}, timeoutMs);
		timer.unref?.();

		child.once('error', () => {
			settle(null);
		});

		child.stdout?.on('data', (chunk: Buffer) => {
			output += chunk.toString();
		});

		child.once('close', code => {
			settle(code === 0 ? output : null);
		});
	});
}

/** Non-fatal freshness nudge: stale yt-dlp is the #1 cause of sudden 403s. */
async function warnIfYtDlpStale(): Promise<void> {
	try {
		const output = await captureStdout('yt-dlp', ['--version']);
		if (!output || !isYtDlpVersionStale(output)) {
			return;
		}

		console.error(
			`Warning: yt-dlp ${output.trim()} is over ${YTDLP_STALE_AFTER_DAYS} days old. ` +
				'YouTube frequently breaks older versions — update with: yt-dlp -U (or brew upgrade yt-dlp).\n',
		);
	} catch {
		// Freshness is best-effort; never block playback on it.
	}
}

async function getMissingDependencies(): Promise<PlaybackDependency[]> {
	const missing: PlaybackDependency[] = [];
	for (const dependency of REQUIRED_DEPENDENCIES) {
		const executable = getDependencyExecutable(dependency);
		const exists = await commandExists(executable);
		if (!exists) {
			missing.push(dependency);
		}
	}

	return missing;
}

export function buildInstallPlan(
	platform: NodeJS.Platform,
	availableManagers: readonly string[],
	missingDependencies: readonly PlaybackDependency[],
): InstallPlan | null {
	if (missingDependencies.length === 0) {
		return null;
	}

	const deps = [...missingDependencies];
	const hasManager = (manager: string) => availableManagers.includes(manager);

	if ((platform === 'darwin' || platform === 'linux') && hasManager('brew')) {
		return {command: 'brew', args: ['install', ...deps]};
	}

	if (platform === 'win32') {
		if (hasManager('scoop')) {
			return {command: 'scoop', args: ['install', ...deps]};
		}

		if (hasManager('choco')) {
			return {command: 'choco', args: ['install', ...deps, '-y']};
		}

		return null;
	}

	if (platform === 'linux') {
		if (hasManager('apt-get')) {
			return {
				command: 'sudo',
				args: ['apt-get', 'install', '-y', ...deps],
			};
		}

		if (hasManager('pacman')) {
			return {
				command: 'sudo',
				args: ['pacman', '-S', '--needed', ...deps],
			};
		}

		if (hasManager('dnf')) {
			return {
				command: 'sudo',
				args: ['dnf', 'install', '-y', ...deps],
			};
		}
	}

	return null;
}

async function getAvailablePackageManagers(
	platform: NodeJS.Platform,
): Promise<string[]> {
	const candidates =
		platform === 'win32'
			? ['scoop', 'choco']
			: platform === 'darwin'
				? ['brew']
				: ['brew', 'apt-get', 'pacman', 'dnf'];

	const available: string[] = [];
	for (const manager of candidates) {
		if (await commandExists(manager)) {
			available.push(manager);
		}
	}

	return available;
}

function printManualInstallHelp(
	missing: readonly PlaybackDependency[],
	plan: InstallPlan | null,
): void {
	console.error(
		`\nMissing playback dependencies: ${missing.join(', ')}. Install them and re-run the command.`,
	);

	if (plan) {
		console.error(`Suggested install command: ${renderInstallCommand(plan)}\n`);
		return;
	}

	console.error(
		'Suggested install commands:\n  macOS: brew install mpv yt-dlp\n  Windows: scoop install mpv yt-dlp\n  Linux (apt): sudo apt-get install -y mpv yt-dlp\n',
	);
}

export async function ensurePlaybackDependencies(options: {
	interactive: boolean;
}): Promise<{ready: boolean; missing: PlaybackDependency[]}> {
	const missing = await getMissingDependencies();
	if (missing.length === 0) {
		await warnIfYtDlpStale();
		return {ready: true, missing: []};
	}

	const availableManagers = await getAvailablePackageManagers(process.platform);
	const installPlan = buildInstallPlan(
		process.platform,
		availableManagers,
		missing,
	);

	if (!options.interactive || !installPlan) {
		printManualInstallHelp(missing, installPlan);
		return {ready: false, missing};
	}

	const prompt = `Missing ${missing.join(', ')}. Install now with "${renderInstallCommand(
		installPlan,
	)}"? [Y/n] `;
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	const response = (await readline.question(prompt)).trim().toLowerCase();
	readline.close();

	if (response === 'n' || response === 'no') {
		printManualInstallHelp(missing, installPlan);
		return {ready: false, missing};
	}

	console.log(`\nInstalling dependencies: ${missing.join(', ')}`);
	const installSuccess = await runCommand(
		installPlan.command,
		installPlan.args,
		{
			stdio: 'inherit',
		},
	);

	if (!installSuccess) {
		console.error('\nAutomatic installation failed.');
		printManualInstallHelp(missing, installPlan);
		return {ready: false, missing};
	}

	const missingAfterInstall = await getMissingDependencies();
	if (missingAfterInstall.length > 0) {
		printManualInstallHelp(missingAfterInstall, installPlan);
		return {ready: false, missing: missingAfterInstall};
	}

	console.log('Playback dependencies installed successfully.\n');
	return {ready: true, missing: []};
}
