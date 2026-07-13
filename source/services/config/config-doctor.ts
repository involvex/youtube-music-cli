// Config doctor - validates and fixes user configuration
import * as fs from 'node:fs';
import {getConfigService} from './config.service.ts';
import {CONFIG_FILE} from '../../utils/constants.ts';

interface ConfigIssue {
	field: string;
	severity: 'error' | 'warning';
	message: string;
	fix?: () => Promise<void> | void;
}

function validateVolume(volume: number): ConfigIssue | null {
	if (typeof volume !== 'number' || volume < 0 || volume > 100) {
		return {
			field: 'volume',
			severity: 'error',
			message: `Volume must be between 0 and 100, got: ${volume}`,
			fix: () => {
				const config = getConfigService();
				config.setSync('volume', 70);
			},
		};
	}
	return null;
}

function validateTheme(theme: string): ConfigIssue | null {
	const validThemes = [
		'dark',
		'light',
		'midnight',
		'matrix',
		'dracula',
		'nord',
		'solarized',
		'catppuccin',
		'custom',
	];
	if (!validThemes.includes(theme)) {
		return {
			field: 'theme',
			severity: 'error',
			message: `Invalid theme: "${theme}". Valid themes: ${validThemes.join(', ')}`,
			fix: () => {
				const config = getConfigService();
				config.setSync('theme', 'dark');
			},
		};
	}
	return null;
}

function validateRepeat(repeat: string): ConfigIssue | null {
	const validRepeat = ['off', 'all', 'one'];
	if (!validRepeat.includes(repeat)) {
		return {
			field: 'repeat',
			severity: 'error',
			message: `Invalid repeat mode: "${repeat}". Valid modes: ${validRepeat.join(', ')}`,
			fix: () => {
				const config = getConfigService();
				config.setSync('repeat', 'off');
			},
		};
	}
	return null;
}

function validateDownloadDirectory(
	downloadDir: string | undefined,
): ConfigIssue | null {
	if (downloadDir && !fs.existsSync(downloadDir)) {
		return {
			field: 'downloadDirectory',
			severity: 'warning',
			message: `Download directory does not exist: ${downloadDir}`,
			fix: () => {
				fs.mkdirSync(downloadDir, {recursive: true});
			},
		};
	}
	return null;
}

function validateConfigFile(): ConfigIssue | null {
	if (!fs.existsSync(CONFIG_FILE)) {
		return {
			field: 'configFile',
			severity: 'warning',
			message: 'Config file does not exist (using defaults)',
			fix: () => {
				const config = getConfigService();
				config.setSync('theme', config.get('theme'));
			},
		};
	}

	try {
		const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
		JSON.parse(content);
		return null;
	} catch {
		return {
			field: 'configFile',
			severity: 'error',
			message: 'Config file contains invalid JSON',
			fix: () => {
				const backupPath = `${CONFIG_FILE}.corrupted.${Date.now()}`;
				fs.copyFileSync(CONFIG_FILE, backupPath);
				fs.unlinkSync(CONFIG_FILE);
				console.log(`Backed up corrupted config to: ${backupPath}`);
			},
		};
	}
}

export function runConfigDoctor(fix: boolean = false): void {
	console.log('Checking configuration...\n');

	const config = getConfigService();
	const issues: ConfigIssue[] = [];

	const fileIssue = validateConfigFile();
	if (fileIssue) issues.push(fileIssue);

	const volume = config.get('volume');
	const volumeIssue = validateVolume(volume);
	if (volumeIssue) issues.push(volumeIssue);

	const theme = config.get('theme');
	const themeIssue = validateTheme(theme);
	if (themeIssue) issues.push(themeIssue);

	const repeat = config.get('repeat');
	const repeatIssue = validateRepeat(repeat);
	if (repeatIssue) issues.push(repeatIssue);

	const downloadDir = config.get('downloadDirectory');
	const downloadIssue = validateDownloadDirectory(downloadDir);
	if (downloadIssue) issues.push(downloadIssue);

	if (issues.length === 0) {
		console.log('Configuration is valid!');
		process.exit(0);
	}

	const errors = issues.filter(i => i.severity === 'error');
	const warnings = issues.filter(i => i.severity === 'warning');

	if (errors.length > 0) {
		console.log(`Found ${errors.length} error(s):`);
		for (const issue of errors) {
			console.log(`  - ${issue.field}: ${issue.message}`);
		}
		console.log('');
	}

	if (warnings.length > 0) {
		console.log(`Found ${warnings.length} warning(s):`);
		for (const issue of warnings) {
			console.log(`  - ${issue.field}: ${issue.message}`);
		}
		console.log('');
	}

	if (fix) {
		console.log('Applying fixes...\n');
		let fixedCount = 0;
		for (const issue of issues) {
			if (issue.fix) {
				try {
					issue.fix();
					console.log(`  Fixed: ${issue.field}`);
					fixedCount++;
				} catch (error) {
					console.log(
						`  Failed to fix ${issue.field}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		}
		console.log(`\nApplied ${fixedCount}/${issues.length} fixes.`);
	} else {
		console.log('Run with --fix to apply recommended fixes.');
	}

	process.exit(errors.length > 0 ? 1 : 0);
}
