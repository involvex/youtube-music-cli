// Auto-update service for ymc across install channels
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

import { APP_NAME, APP_VERSION } from "../../utils/constants.ts";
import { logger } from "../logger/logger.service.ts";
import { getVersionCheckService } from "../version-check/version-check.service.ts";

export type InstallChannel =
  "standalone" | "npm" | "brew" | "scoop" | "unknown";

export interface UpdateResult {
  success: boolean;
  channel: InstallChannel;
  currentVersion: string;
  targetVersion: string;
  message: string;
}

class AutoUpdateService {
  private static instance: AutoUpdateService;

  private constructor() {}

  static getInstance(): AutoUpdateService {
    if (!AutoUpdateService.instance) {
      AutoUpdateService.instance = new AutoUpdateService();
    }
    return AutoUpdateService.instance;
  }

  detectChannel(): InstallChannel {
    const isStandalone =
      Boolean(
        (process as unknown as { isStandaloneExecutable?: boolean })
          .isStandaloneExecutable,
      ) ||
      Boolean(
        (globalThis as unknown as { Bun?: { isStandalone: boolean } }).Bun
          ?.isStandalone,
      );

    if (isStandalone) {
      return "standalone";
    }

    const execPath = process.execPath.toLowerCase();
    if (execPath.includes("homebrew") || execPath.includes("/brew/")) {
      return "brew";
    }
    if (execPath.includes("scoop")) {
      return "scoop";
    }

    // Check command availability or global npm paths
    try {
      const npmRoot = execSync("npm root -g", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      }).trim();
      if (
        execPath.startsWith(npmRoot) ||
        process.argv[1]?.includes("node_modules")
      ) {
        return "npm";
      }
    } catch {
      // Ignore
    }

    // Fallback heuristic based on package manager or global install path
    if (existsSync(process.execPath) && process.execPath.includes("bin")) {
      try {
        const brewCheck = execSync("brew --prefix", {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 2000,
        }).trim();
        if (brewCheck && process.execPath.startsWith(brewCheck)) {
          return "brew";
        }
      } catch {
        // Ignore
      }
    }

    return "npm";
  }

  async update(
    targetVersion?: string,
    options?: { dryRun?: boolean; checkOnly?: boolean },
  ): Promise<UpdateResult> {
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
    if (targetVersion && !semverRegex.test(targetVersion)) {
      return {
        success: false,
        channel: "unknown",
        currentVersion: APP_VERSION,
        targetVersion,
        message: `Invalid target version format: ${targetVersion}`,
      };
    }

    const versionCheck = getVersionCheckService();
    const check = await versionCheck.checkForUpdates(APP_VERSION);
    const channel = this.detectChannel();
    const versionToInstall = targetVersion || check.latestVersion;

    if (!semverRegex.test(versionToInstall)) {
      return {
        success: false,
        channel,
        currentVersion: APP_VERSION,
        targetVersion: versionToInstall,
        message: `Invalid target version format: ${versionToInstall}`,
      };
    }

    if (options?.checkOnly) {
      return {
        success: true,
        channel,
        currentVersion: APP_VERSION,
        targetVersion: versionToInstall,
        message: check.hasUpdate
          ? `Update available: v${APP_VERSION} -> v${versionToInstall} (channel: ${channel})`
          : `Already up-to-date (v${APP_VERSION})`,
      };
    }

    if (!targetVersion && !check.hasUpdate) {
      return {
        success: true,
        channel,
        currentVersion: APP_VERSION,
        targetVersion: check.latestVersion,
        message: `Already up-to-date (v${APP_VERSION})`,
      };
    }

    if (options?.dryRun) {
      return {
        success: true,
        channel,
        currentVersion: APP_VERSION,
        targetVersion: versionToInstall,
        message: `[Dry Run] Would update ${APP_NAME} from v${APP_VERSION} to v${versionToInstall} via ${channel}`,
      };
    }

    logger.info("AutoUpdateService", "Initiating update", {
      channel,
      currentVersion: APP_VERSION,
      targetVersion: versionToInstall,
    });

    try {
      switch (channel) {
        case "npm": {
          try {
            execSync(`bun add -g ${APP_NAME}@${versionToInstall}`, {
              stdio: "inherit",
            });
          } catch {
            execSync(`npm install -g ${APP_NAME}@${versionToInstall}`, {
              stdio: "inherit",
            });
          }
          break;
        }
        case "brew": {
          execSync(`brew upgrade ${APP_NAME}`, { stdio: "inherit" });
          break;
        }
        case "scoop": {
          execSync(`scoop update ${APP_NAME}`, { stdio: "inherit" });
          break;
        }
        case "standalone": {
          return {
            success: false,
            channel,
            currentVersion: APP_VERSION,
            targetVersion: versionToInstall,
            message:
              "Standalone binary updates are automatic on next release download or via npm (npm i -g @involvex/youtube-music-cli)",
          };
        }
        default: {
          try {
            execSync(`bun add -g ${APP_NAME}@${versionToInstall}`, {
              stdio: "inherit",
            });
          } catch {
            execSync(`npm install -g ${APP_NAME}@${versionToInstall}`, {
              stdio: "inherit",
            });
          }
          break;
        }
      }

      return {
        success: true,
        channel,
        currentVersion: APP_VERSION,
        targetVersion: versionToInstall,
        message: `Successfully updated ${APP_NAME} to v${versionToInstall} via ${channel}`,
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      logger.error("AutoUpdateService", "Update failed", { error: errMessage });
      return {
        success: false,
        channel,
        currentVersion: APP_VERSION,
        targetVersion: versionToInstall,
        message: `Update failed via ${channel}: ${errMessage}`,
      };
    }
  }
}

export const getAutoUpdateService = (): AutoUpdateService =>
  AutoUpdateService.getInstance();
