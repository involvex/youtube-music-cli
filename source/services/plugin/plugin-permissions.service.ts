import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Plugin permissions service - manages plugin permission requests and storage
import type {
  PermissionStatus,
  PluginPermission,
  PluginPermissions,
} from "../../types/plugin.types.ts";
import { CONFIG_DIR } from "../../utils/constants.ts";
import { formatErrorData } from "../../utils/error.ts";
import { logger } from "../logger/logger.service.ts";

const PERMISSIONS_FILE = join(CONFIG_DIR, "plugin-permissions.json");

interface PluginPermissionsStore {
  [pluginId: string]: PluginPermissions;
}

class PluginPermissionsService {
  private permissions: PluginPermissionsStore;
  private permissionsPath: string;
  private configDir: string;
  private saveLock = Promise.resolve();

  public onPermissionRequest?: (
    pluginId: string,
    permission: PluginPermission,
  ) => Promise<boolean>;

  constructor() {
    this.configDir = CONFIG_DIR;
    this.permissionsPath = PERMISSIONS_FILE;
    this.permissions = this.load();
  }

  private load(): PluginPermissionsStore {
    try {
      if (!existsSync(this.permissionsPath)) {
        return {};
      }

      const data = readFileSync(this.permissionsPath, "utf-8");
      return JSON.parse(data) as PluginPermissionsStore;
    } catch (error) {
      logger.error(
        "PluginPermissionsService",
        "Failed to load permissions:",
        formatErrorData(error),
      );
      return {};
    }
  }

  private save(): void {
    void this.saveAsync();
  }

  private async saveAsync(): Promise<void> {
    const currentLock = this.saveLock;
    let releaseLock: () => void = () => {};
    const newLock = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    this.saveLock = newLock;

    await currentLock.catch(() => {});

    try {
      if (!existsSync(this.configDir)) {
        await mkdir(this.configDir, { recursive: true });
      }

      const tempFile = `${this.permissionsPath}.tmp`;
      await writeFile(
        tempFile,
        JSON.stringify(this.permissions, null, 2),
        "utf8",
      );

      if (process.platform === "win32" && existsSync(this.permissionsPath)) {
        await unlink(this.permissionsPath);
      }

      await rename(tempFile, this.permissionsPath);
      logger.debug("PluginPermissionsService", "Saved permissions to disk");
    } catch (error) {
      logger.error(
        "PluginPermissionsService",
        "Failed to save permissions:",
        formatErrorData(error),
      );
    } finally {
      releaseLock();
    }
  }

  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const pluginPerms = this.permissions[pluginId];
    if (!pluginPerms) {
      return false;
    }

    return pluginPerms[permission] === "granted";
  }

  getPermissionStatus(
    pluginId: string,
    permission: PluginPermission,
  ): PermissionStatus {
    const pluginPerms = this.permissions[pluginId];
    if (!pluginPerms || !pluginPerms[permission]) {
      return "prompt";
    }

    return pluginPerms[permission];
  }

  getPermissions(pluginId: string): PluginPermissions {
    return this.permissions[pluginId] || {};
  }

  grantPermission(pluginId: string, permission: PluginPermission): void {
    if (!this.permissions[pluginId]) {
      this.permissions[pluginId] = {};
    }

    this.permissions[pluginId]![permission] = "granted";
    this.save();
    logger.info(
      "PluginPermissionsService",
      `Granted ${permission} to ${pluginId}`,
    );
  }

  denyPermission(pluginId: string, permission: PluginPermission): void {
    if (!this.permissions[pluginId]) {
      this.permissions[pluginId] = {};
    }

    this.permissions[pluginId]![permission] = "denied";
    this.save();
    logger.info(
      "PluginPermissionsService",
      `Denied ${permission} to ${pluginId}`,
    );
  }

  async requestPermission(
    pluginId: string,
    permission: PluginPermission,
  ): Promise<boolean> {
    const currentStatus = this.getPermissionStatus(pluginId, permission);

    if (currentStatus === "granted") {
      return true;
    }

    if (currentStatus === "denied") {
      return false;
    }

    if (this.onPermissionRequest) {
      try {
        const granted = await this.onPermissionRequest(pluginId, permission);

        if (granted) {
          this.grantPermission(pluginId, permission);
        } else {
          this.denyPermission(pluginId, permission);
        }

        return granted;
      } catch (error) {
        logger.error(
          "PluginPermissionsService",
          "Error requesting permission:",
          formatErrorData(error),
        );
        this.denyPermission(pluginId, permission);
        return false;
      }
    }

    logger.warn(
      "PluginPermissionsService",
      `No permission request handler, denying ${permission} for ${pluginId}`,
    );
    this.denyPermission(pluginId, permission);
    return false;
  }

  grantPermissions(pluginId: string, permissions: PluginPermission[]): void {
    for (const permission of permissions) {
      this.grantPermission(pluginId, permission);
    }
  }

  revokePermission(pluginId: string, permission: PluginPermission): void {
    if (!this.permissions[pluginId]) {
      return;
    }

    delete this.permissions[pluginId]![permission];
    this.save();
    logger.info(
      "PluginPermissionsService",
      `Revoked ${permission} from ${pluginId}`,
    );
  }

  revokeAllPermissions(pluginId: string): void {
    delete this.permissions[pluginId];
    this.save();
    logger.info(
      "PluginPermissionsService",
      `Revoked all permissions from ${pluginId}`,
    );
  }

  getAllPluginIds(): string[] {
    return Object.keys(this.permissions);
  }

  resetAll(): void {
    this.permissions = {};
    this.save();
    logger.info("PluginPermissionsService", "Reset all permissions");
  }
}

let instance: PluginPermissionsService | null = null;

export function getPluginPermissionsService(): PluginPermissionsService {
  if (!instance) {
    instance = new PluginPermissionsService();
  }
  return instance;
}

export function resetPluginPermissionsService(): void {
  instance = null;
}
