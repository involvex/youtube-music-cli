// Debug logging service with daily rotation
import * as fs from 'node:fs';
import * as path from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {
	getDefaultLogsDirectory,
	MAX_LOG_FILE_SIZE,
	pruneOldLogFiles,
	resolveDailyLogPath,
	rotateLogIfTooLarge,
} from './log-rotation.ts';

const LOGS_DIR = getDefaultLogsDirectory();

function ensureDir(dir: string): void {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {recursive: true});
	}
}

ensureDir(CONFIG_DIR);
ensureDir(LOGS_DIR);
pruneOldLogFiles(LOGS_DIR);

let verboseMode = false;
let customLogPath: string | null = null;
let activeLogPath = resolveDailyLogPath(LOGS_DIR);
let activeLogDay = activeLogPath;
rotateLogIfTooLarge(activeLogPath);

function resolveConfiguredLogPath(): string | null {
	try {
		const configPath = path.join(CONFIG_DIR, 'config.json');
		if (!fs.existsSync(configPath)) {
			return null;
		}
		const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
			logFilePath?: string;
		};
		return parsed.logFilePath?.trim() || null;
	} catch {
		return null;
	}
}

customLogPath = resolveConfiguredLogPath();

function getActiveLogPath(): string {
	if (customLogPath) {
		const dir = path.dirname(customLogPath);
		ensureDir(dir);
		return rotateLogIfTooLarge(customLogPath);
	}

	const todayPath = resolveDailyLogPath(LOGS_DIR);
	if (todayPath !== activeLogDay) {
		activeLogDay = todayPath;
		activeLogPath = todayPath;
		pruneOldLogFiles(LOGS_DIR);
	}

	ensureDir(LOGS_DIR);
	activeLogPath = rotateLogIfTooLarge(todayPath);
	return activeLogPath;
}

class Logger {
	setVerbose(enabled: boolean): void {
		verboseMode = enabled;
	}

	isVerbose(): boolean {
		return verboseMode;
	}

	setLogFilePath(filePath: string | null | undefined): void {
		customLogPath = filePath?.trim() || null;
	}

	private writeToFile(
		level: string,
		category: string,
		message: string,
		data?: unknown,
	) {
		const timestamp = new Date().toISOString();
		let dataStr = '';
		if (data !== undefined) {
			dataStr =
				data instanceof Error
					? `\n${data.stack ?? data.message}`
					: `\n${JSON.stringify(data, null, 2)}`;
		}

		const logLine = `[${timestamp}] [${level}] [${category}] ${message}${dataStr}\n`;
		const logPath = getActiveLogPath();

		try {
			const stats = fs.existsSync(logPath) ? fs.statSync(logPath) : null;
			if (stats && stats.size > MAX_LOG_FILE_SIZE) {
				rotateLogIfTooLarge(logPath);
			}
			fs.appendFileSync(getActiveLogPath(), logLine);
		} catch {
			// ignore disk write failures
		}
	}

	debug(category: string, message: string, data?: unknown) {
		this.writeToFile('DEBUG', category, message, data);
	}

	info(category: string, message: string, data?: unknown) {
		this.writeToFile('INFO', category, message, data);
		if (verboseMode) {
			console.log(`[INFO] [${category}] ${message}`);
		}
	}

	warn(category: string, message: string, data?: unknown) {
		this.writeToFile('WARN', category, message, data);
		if (verboseMode) {
			console.warn(`[WARN] [${category}] ${message}`);
		}
	}

	error(category: string, message: string, data?: unknown) {
		this.writeToFile('ERROR', category, message, data);
		let extra = '';
		if (data !== undefined) {
			if (data instanceof Error) {
				extra = `: ${data.message}`;
			} else if (typeof data === 'object' && data !== null) {
				extra = `: ${JSON.stringify(data)}`;
			} else {
				extra = `: ${String(data)}`;
			}
		}
		console.error(`[${category}] ${message}${extra}`);
	}

	verbose(category: string, message: string, data?: unknown) {
		if (verboseMode) {
			this.writeToFile('VERBOSE', category, message, data);
			console.log(`[VERBOSE] [${category}] ${message}`);
		}
	}

	getLogPath(): string {
		return getActiveLogPath();
	}

	getLogsDirectory(): string {
		return customLogPath ? path.dirname(customLogPath) : LOGS_DIR;
	}
}

export const logger = new Logger();
