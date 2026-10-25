import * as fs from 'node:fs';
import * as path from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';

export const LOG_RETENTION_DAYS = 14;
export const MAX_LOG_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function getDefaultLogsDirectory(): string {
	// Same base as the rest of the app (honours HOME; os.homedir() may not)
	return path.join(CONFIG_DIR, 'logs');
}

export function formatLogDate(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function dailyLogFileName(date: Date = new Date()): string {
	return `debug-${formatLogDate(date)}.log`;
}

export function resolveDailyLogPath(
	logsDir: string,
	date: Date = new Date(),
): string {
	return path.join(logsDir, dailyLogFileName(date));
}

/** Keep newest `retentionDays` daily logs; delete older debug-YYYY-MM-DD.log files. */
export function pruneOldLogFiles(
	logsDir: string,
	retentionDays: number = LOG_RETENTION_DAYS,
	now: Date = new Date(),
): string[] {
	if (!fs.existsSync(logsDir)) {
		return [];
	}

	const cutoff = new Date(now);
	cutoff.setHours(0, 0, 0, 0);
	cutoff.setDate(cutoff.getDate() - (retentionDays - 1));

	const deleted: string[] = [];
	const entries = fs.readdirSync(logsDir);
	for (const name of entries) {
		const match = /^debug-(\d{4}-\d{2}-\d{2})\.log(?:\.\d+)?$/.exec(name);
		if (!match?.[1]) {
			continue;
		}

		const fileDate = new Date(`${match[1]}T00:00:00`);
		if (Number.isNaN(fileDate.getTime()) || fileDate >= cutoff) {
			continue;
		}

		const fullPath = path.join(logsDir, name);
		try {
			fs.unlinkSync(fullPath);
			deleted.push(fullPath);
		} catch {
			// ignore unlink failures
		}
	}

	return deleted;
}

/**
 * If the active log exceeds maxBytes, rename to debug-YYYY-MM-DD.log.N
 * and return a fresh path for the same day.
 */
export function rotateLogIfTooLarge(
	logPath: string,
	maxBytes: number = MAX_LOG_FILE_SIZE,
): string {
	if (!fs.existsSync(logPath)) {
		return logPath;
	}

	const stats = fs.statSync(logPath);
	if (stats.size <= maxBytes) {
		return logPath;
	}

	let suffix = 1;
	let backupPath = `${logPath}.${suffix}`;
	while (fs.existsSync(backupPath)) {
		suffix += 1;
		backupPath = `${logPath}.${suffix}`;
	}

	fs.renameSync(logPath, backupPath);
	return logPath;
}
