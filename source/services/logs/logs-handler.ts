// Logs command handler
import * as fs from 'node:fs';
import * as path from 'node:path';
import {execSync} from 'node:child_process';
import {getConfigService} from '../config/config.service.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';

const DEFAULT_LOG_LINES = 100;

export function getLogFilePath(): string {
	const config = getConfigService();
	const customPath = config.get('logFilePath') as string | undefined;
	if (customPath) {
		return customPath;
	}
	return path.join(CONFIG_DIR, 'debug.log');
}

export function showLogs(): void {
	const logPath = getLogFilePath();

	if (!fs.existsSync(logPath)) {
		console.log('No log file found at:', logPath);
		process.exit(0);
	}

	const content = fs.readFileSync(logPath, 'utf-8');
	if (!content.trim()) {
		console.log('Log file is empty.');
		process.exit(0);
	}

	const lines = content.split('\n');
	const recentLines = lines.slice(-DEFAULT_LOG_LINES).join('\n');
	console.log(recentLines);
	process.exit(0);
}

export function openLogs(): void {
	const logPath = getLogFilePath();

	if (!fs.existsSync(logPath)) {
		console.log('No log file found at:', logPath);
		process.exit(1);
	}

	const platform = process.platform;
	let command: string;

	if (platform === 'win32') {
		command = `start "" "${logPath}"`;
	} else if (platform === 'darwin') {
		command = `open "${logPath}"`;
	} else {
		command = `xdg-open "${logPath}"`;
	}

	try {
		execSync(command, {stdio: 'inherit'});
		process.exit(0);
	} catch (error) {
		console.error(
			`Failed to open log file: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

export function showLogPath(): void {
	console.log(getLogFilePath());
	process.exit(0);
}

export function setLogPath(newPath: string): void {
	const resolvedPath = path.resolve(newPath);
	const config = getConfigService();
	config.set('logFilePath', resolvedPath);
	console.log(`Log file path set to: ${resolvedPath}`);
	process.exit(0);
}
