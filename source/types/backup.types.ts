export interface BackupMetadata {
  name: string;
  path: string;
  createdAt: string;
  size: number;
  fileCount: number;
  compressed: boolean;
  compressedPath?: string;
}

export interface BackupOptions {
  compress?: boolean;
  dryRun?: boolean;
  includeLogs?: boolean;
}

export interface RestoreOptions {
  dryRun?: boolean;
  force?: boolean;
}

export interface CleanOptions {
  keepCount?: number;
  dryRun?: boolean;
}

export interface BackupFileEntry {
  relativePath: string;
  size: number;
  isDirectory: boolean;
}

export interface BackupManifest {
  schemaVersion: number;
  createdAt: string;
  appVersion: string;
  files: BackupFileEntry[];
  totalSize: number;
  fileCount: number;
}

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_DIR_NAME = "backups";
export const BACKUP_PREFIX = "backup-";
export const MANIFEST_FILE = "manifest.json";
