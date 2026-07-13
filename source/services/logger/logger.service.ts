// Debug logging service
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const DEBUG_DIR = path.join(os.homedir(), '.youtube-music-cli');
const DEBUG_FILE = path.join(DEBUG_DIR, 'debug.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure debug directory exists
if (!fs.existsSync(DEBUG_DIR)) {
	fs.mkdirSync(DEBUG_DIR, {recursive: true});
}

// Rotate log if too large
if (fs.existsSync(DEBUG_FILE)) {
	const stats = fs.statSync(DEBUG_FILE);
	if (stats.size > MAX_LOG_SIZE) {
		const backupFile = path.join(DEBUG_DIR, 'debug.log.old');
		if (fs.existsSync(backupFile)) {
			fs.unlinkSync(backupFile);
		}
		fs.renameSync(DEBUG_FILE, backupFile);
	}
}

let verboseMode = false;

class Logger {
	setVerbose(enabled: boolean): void {
		verboseMode = enabled;
	}

	isVerbose(): boolean {
		return verboseMode;
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

		fs.appendFileSync(DEBUG_FILE, logLine);
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
		return DEBUG_FILE;
	}
}

export const logger = new Logger();
