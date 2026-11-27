import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  BACKUP_DIR_NAME,
  BACKUP_PREFIX,
  BACKUP_SCHEMA_VERSION,
  type BackupFileEntry,
  type BackupManifest,
  type BackupMetadata,
  type BackupOptions,
  type CleanOptions,
  MANIFEST_FILE,
  type RestoreOptions,
} from "../../types/backup.types.ts";
import { APP_VERSION, CONFIG_DIR } from "../../utils/constants.ts";
import { formatError } from "../../utils/error.ts";
import { formatBytes } from "../../utils/format.ts";
import { createMutex } from "../../utils/lock.ts";
import { logger } from "../logger/logger.service.ts";

const FILES_TO_BACKUP = [
  "config.json",
  "favorites.json",
  "history.json",
  "player-state.json",
  "downloads-index.json",
  "invidious-health.json",
  "musixmatch-token.json",
];

const mutex = createMutex();

function getBackupDir(): string {
  return path.join(CONFIG_DIR, BACKUP_DIR_NAME);
}

function getTimestampedBackupName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `${BACKUP_PREFIX}${timestamp}`;
}

async function ensureBackupDir(): Promise<void> {
  const backupDir = getBackupDir();
  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true });
  }
}

async function collectBackupFiles(
  includeLogs: boolean,
): Promise<BackupFileEntry[]> {
  const files: BackupFileEntry[] = [];

  for (const fileName of FILES_TO_BACKUP) {
    const filePath = path.join(CONFIG_DIR, fileName);
    if (existsSync(filePath)) {
      const stats = await stat(filePath);
      files.push({
        relativePath: fileName,
        size: stats.size,
        isDirectory: false,
      });
    }
  }

  if (includeLogs) {
    const logsDir = path.join(CONFIG_DIR, "logs");
    if (existsSync(logsDir)) {
      const logFiles = await readdir(logsDir);
      for (const logFile of logFiles) {
        const filePath = path.join(logsDir, logFile);
        const stats = await stat(filePath);
        files.push({
          relativePath: path.join("logs", logFile),
          size: stats.size,
          isDirectory: false,
        });
      }
    }
  }

  return files;
}

async function createManifest(
  backupPath: string,
  files: BackupFileEntry[],
): Promise<void> {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const manifest: BackupManifest = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    files,
    totalSize,
    fileCount: files.length,
  };
  const manifestPath = path.join(backupPath, MANIFEST_FILE);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

async function copyFilesToBackup(
  sourceFiles: BackupFileEntry[],
  backupPath: string,
): Promise<void> {
  await Promise.all(
    sourceFiles.map(async file => {
      const srcPath = path.join(CONFIG_DIR, file.relativePath);
      const destPath = path.join(backupPath, file.relativePath);
      const destDir = path.dirname(destPath);

      if (!existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
      }

      await copyFile(srcPath, destPath);
    }),
  );
}

function escapePowerShellString(input: string): string {
  return input.replace(/'/g, "''");
}

async function createCompressedArchive(
  backupPath: string,
  backupName: string,
): Promise<string | null> {
  const isWindows = process.platform === "win32";
  const archiveName = isWindows ? `${backupName}.zip` : `${backupName}.tar.gz`;
  const archivePath = path.join(getBackupDir(), archiveName);

  try {
    const { spawn } = await import("node:child_process");

    if (isWindows) {
      const escapedBackupPath = escapePowerShellString(backupPath);
      const escapedArchivePath = escapePowerShellString(archivePath);
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            `Compress-Archive -Path '${escapedBackupPath}/*' -DestinationPath '${escapedArchivePath}' -Force`,
          ],
          { windowsHide: true },
        );
        proc.on("exit", code => {
          if (code === 0) resolve();
          else reject(new Error(`zip exited with code ${code}`));
        });
        proc.on("error", reject);
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          "tar",
          ["-czf", archivePath, "-C", backupPath, "."],
          { windowsHide: true },
        );
        proc.on("exit", code => {
          if (code === 0) resolve();
          else reject(new Error(`tar exited with code ${code}`));
        });
        proc.on("error", reject);
      });
    }
    return archivePath;
  } catch (error) {
    logger.warn("BackupService", "Failed to create compressed archive", {
      error: formatError(error),
    });
    return null;
  }
}

async function extractCompressedArchive(
  archivePath: string,
  destPath: string,
): Promise<void> {
  const isWindows = process.platform === "win32";
  const { spawn } = await import("node:child_process");

  if (isWindows) {
    const escapedArchivePath = escapePowerShellString(archivePath);
    const escapedDestPath = escapePowerShellString(destPath);
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -Path '${escapedArchivePath}' -DestinationPath '${escapedDestPath}' -Force`,
        ],
        { windowsHide: true },
      );
      proc.on("exit", code => {
        if (code === 0) resolve();
        else reject(new Error(`unzip exited with code ${code}`));
      });
      proc.on("error", reject);
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("tar", ["-xzf", archivePath, "-C", destPath], {
        windowsHide: true,
      });
      proc.on("exit", code => {
        if (code === 0) resolve();
        else reject(new Error(`tar extract exited with code ${code}`));
      });
      proc.on("error", reject);
    });
  }
}

async function readManifest(
  backupPath: string,
): Promise<BackupManifest | null> {
  const manifestPath = path.join(backupPath, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    const data = await readFile(manifestPath, "utf8");
    return JSON.parse(data) as BackupManifest;
  } catch {
    return null;
  }
}

function validatePathTraversal(
  baseDir: string,
  targetPath: string,
  context: string,
): void {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  if (
    !resolvedTarget.startsWith(resolvedBase + path.sep) &&
    resolvedTarget !== resolvedBase
  ) {
    throw new Error(
      `Path traversal attempt detected in ${context}: ${targetPath}`,
    );
  }
}

class BackupService {
  async createBackup(options: BackupOptions = {}): Promise<BackupMetadata> {
    const releaseLock = await mutex();
    const { compress = false, dryRun = false, includeLogs = false } = options;

    try {
      await ensureBackupDir();

      const backupName = getTimestampedBackupName();
      const backupPath = path.join(getBackupDir(), backupName);

      const files = await collectBackupFiles(includeLogs);

      if (dryRun) {
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        logger.info("BackupService", "Dry run - would create backup", {
          name: backupName,
          fileCount: files.length,
          totalSize: formatBytes(totalSize),
          files: files.map(f => f.relativePath),
        });
        return {
          name: backupName,
          path: backupPath,
          createdAt: new Date().toISOString(),
          size: totalSize,
          fileCount: files.length,
          compressed: false,
        };
      }

      if (!existsSync(backupPath)) {
        await mkdir(backupPath, { recursive: true });
      }

      await copyFilesToBackup(files, backupPath);
      await createManifest(backupPath, files);

      let compressedPath: string | undefined;
      if (compress) {
        const result = await createCompressedArchive(backupPath, backupName);
        compressedPath = result ?? undefined;
      }

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const metadata: BackupMetadata = {
        name: backupName,
        path: backupPath,
        createdAt: new Date().toISOString(),
        size: totalSize,
        fileCount: files.length,
        compressed: !!compressedPath,
        compressedPath,
      };

      logger.info("BackupService", "Backup created successfully", {
        name: backupName,
        fileCount: files.length,
        totalSize: formatBytes(totalSize),
        compressed: !!compressedPath,
      });

      return metadata;
    } finally {
      releaseLock();
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      await ensureBackupDir();
      const backupDir = getBackupDir();
      const entries = await readdir(backupDir, { withFileTypes: true });

      const backups: BackupMetadata[] = [];

      for (const entry of entries) {
        if (
          !entry.isDirectory() &&
          !entry.name.endsWith(".zip") &&
          !entry.name.endsWith(".tar.gz")
        ) {
          continue;
        }

        if (entry.isDirectory() && entry.name.startsWith(BACKUP_PREFIX)) {
          const backupPath = path.join(backupDir, entry.name);
          const manifest = await readManifest(backupPath);
          if (manifest) {
            backups.push({
              name: entry.name,
              path: backupPath,
              createdAt: manifest.createdAt,
              size: manifest.totalSize,
              fileCount: manifest.fileCount,
              compressed: false,
            });
          }
        } else if (
          (entry.name.endsWith(".zip") || entry.name.endsWith(".tar.gz")) &&
          entry.name.startsWith(BACKUP_PREFIX)
        ) {
          const stats = await stat(path.join(backupDir, entry.name));
          const name = entry.name.replace(/\.(zip|tar\.gz)$/, "");
          backups.push({
            name,
            path: path.join(backupDir, entry.name),
            createdAt: stats.birthtime.toISOString(),
            size: stats.size,
            fileCount: 0,
            compressed: true,
            compressedPath: path.join(backupDir, entry.name),
          });
        }
      }

      backups.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return backups;
    } catch (error) {
      logger.error("BackupService", "Failed to list backups", {
        error: formatError(error),
      });
      return [];
    }
  }

  async restoreBackup(
    backupName: string,
    options: RestoreOptions = {},
  ): Promise<void> {
    const releaseLock = await mutex();
    const { dryRun = false, force = false } = options;

    try {
      const backupDir = getBackupDir();
      let backupPath = path.join(backupDir, backupName);

      if (!existsSync(backupPath)) {
        if (existsSync(`${backupPath}.zip`)) {
          backupPath = `${backupPath}.zip`;
        } else if (existsSync(`${backupPath}.tar.gz`)) {
          backupPath = `${backupPath}.tar.gz`;
        } else {
          throw new Error(`Backup not found: ${backupName}`);
        }
      }

      const isCompressed =
        backupPath.endsWith(".zip") || backupPath.endsWith(".tar.gz");

      if (isCompressed) {
        const tempDir = path.join(backupDir, `.restore-${Date.now()}`);
        await mkdir(tempDir, { recursive: true });
        try {
          await extractCompressedArchive(backupPath, tempDir);
          backupPath = tempDir;
        } catch (error) {
          await rm(tempDir, { recursive: true, force: true }).catch(() => {});
          throw error;
        }
      }

      const manifest = await readManifest(backupPath);
      if (!manifest) {
        throw new Error("Invalid backup: missing or corrupted manifest");
      }

      if (dryRun) {
        logger.info("BackupService", "Dry run - would restore backup", {
          name: backupName,
          fileCount: manifest.fileCount,
          totalSize: formatBytes(manifest.totalSize),
          files: manifest.files.map(f => f.relativePath),
        });
        if (isCompressed) {
          await rm(backupPath, { recursive: true, force: true }).catch(
            () => {},
          );
        }
        return;
      }

      if (!force) {
        const readline = await import("node:readline/promises");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const answer = await rl.question(
          `This will overwrite current config with backup "${backupName}". Continue? (y/N): `,
        );
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Restore cancelled.");
          if (isCompressed) {
            await rm(backupPath, { recursive: true, force: true }).catch(
              () => {},
            );
          }
          return;
        }
      }

      for (const file of manifest.files) {
        const srcPath = path.join(backupPath, file.relativePath);
        const destPath = path.join(CONFIG_DIR, file.relativePath);

        validatePathTraversal(
          CONFIG_DIR,
          destPath,
          `restore of ${file.relativePath}`,
        );

        const destDir = path.dirname(destPath);
        if (!existsSync(destDir)) {
          await mkdir(destDir, { recursive: true });
        }

        await copyFile(srcPath, destPath);
      }

      if (isCompressed) {
        await rm(backupPath, { recursive: true, force: true }).catch(() => {});
      }

      logger.info("BackupService", "Backup restored successfully", {
        name: backupName,
        fileCount: manifest.fileCount,
      });
    } finally {
      releaseLock();
    }
  }

  async cleanBackups(options: CleanOptions = {}): Promise<number> {
    const { keepCount = 10, dryRun = false } = options;

    if (keepCount < 0) {
      throw new Error("keepCount must be non-negative");
    }

    try {
      const backups = await this.listBackups();
      const directoryBackups = backups.filter(b => !b.compressed);
      const compressedBackups = backups.filter(b => b.compressed);

      const toRemove = directoryBackups.slice(keepCount);
      const compressedToRemove = compressedBackups.slice(keepCount);

      if (dryRun) {
        logger.info("BackupService", "Dry run - would remove backups", {
          directories: toRemove.map(b => b.name),
          compressed: compressedToRemove.map(b => b.name),
        });
        return toRemove.length + compressedToRemove.length;
      }

      let removedCount = 0;

      for (const backup of toRemove) {
        try {
          await rm(backup.path, { recursive: true, force: true });
          removedCount++;
        } catch (error) {
          logger.warn("BackupService", "Failed to remove backup", {
            name: backup.name,
            error: formatError(error),
          });
        }
      }

      for (const backup of compressedToRemove) {
        try {
          if (backup.compressedPath && existsSync(backup.compressedPath)) {
            await rm(backup.compressedPath, { force: true });
            removedCount++;
          }
        } catch (error) {
          logger.warn("BackupService", "Failed to remove compressed backup", {
            name: backup.name,
            error: formatError(error),
          });
        }
      }

      logger.info("BackupService", "Cleaned old backups", {
        removedCount,
        keptCount: keepCount,
      });

      return removedCount;
    } catch (error) {
      logger.error("BackupService", "Failed to clean backups", {
        error: formatError(error),
      });
      return 0;
    }
  }
}

let backupServiceInstance: BackupService | null = null;

export function getBackupService(): BackupService {
  if (!backupServiceInstance) {
    backupServiceInstance = new BackupService();
  }
  return backupServiceInstance;
}

export function resetBackupServiceForTests(): void {
  backupServiceInstance = null;
}
