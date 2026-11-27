// Version check service for npm registry updates
import { APP_NAME, APP_VERSION } from "../../utils/constants.ts";
import { logger } from "../logger/logger.service.ts";

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
}

class VersionCheckService {
  private static instance: VersionCheckService;
  private readonly NPM_REGISTRY_URL = "https://registry.npmjs.org";
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private constructor() {}

  static getInstance(): VersionCheckService {
    if (!VersionCheckService.instance) {
      VersionCheckService.instance = new VersionCheckService();
    }
    return VersionCheckService.instance;
  }

  /**
   * Compare two semantic version strings
   * Returns: 1 if a > b, -1 if a < b, 0 if equal
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string): number[] => {
      // Remove 'v' prefix if present and split by non-numeric chars
      const clean = v.replace(/^v/i, "");
      return clean.split(/[.-]/).map(part => {
        const num = parseInt(part, 10);
        return Number.isNaN(num) ? 0 : num;
      });
    };

    const partsA = parseVersion(a);
    const partsB = parseVersion(b);

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] ?? 0;
      const partB = partsB[i] ?? 0;

      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  /**
   * Check if a version check should be performed (once per 24 hours)
   */
  shouldCheck(lastCheck: string | undefined): boolean {
    if (!lastCheck) return true;

    try {
      const lastCheckDate = new Date(lastCheck);
      const now = new Date();
      const diff = now.getTime() - lastCheckDate.getTime();

      return diff >= this.CHECK_INTERVAL;
    } catch {
      return true;
    }
  }

  /**
   * Mark that a version check has been performed
   * Returns the timestamp string to store
   */
  markChecked(): string {
    return new Date().toISOString();
  }

  /**
   * Check npm registry for available updates
   */
  async checkForUpdates(
    currentVersion = APP_VERSION,
  ): Promise<VersionCheckResult> {
    try {
      logger.debug("VersionCheckService", "Checking for updates", {
        package: APP_NAME,
        currentVersion,
      });

      const url = `${this.NPM_REGISTRY_URL}/${APP_NAME}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        logger.warn("VersionCheckService", "Failed to fetch package info", {
          status: response.status,
        });
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
        };
      }

      const data = (await response.json()) as {
        ["dist-tags"]?: { latest?: string };
      };

      const latestVersion = data["dist-tags"]?.latest;
      if (!latestVersion) {
        logger.warn(
          "VersionCheckService",
          "No latest version found in response",
        );
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
        };
      }

      const hasUpdate = this.compareVersions(latestVersion, currentVersion) > 0;

      logger.info("VersionCheckService", "Version check complete", {
        currentVersion,
        latestVersion,
        hasUpdate,
      });

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
      };
    } catch (error) {
      logger.error("VersionCheckService", "Error checking for updates", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
      };
    }
  }
}

export const getVersionCheckService = (): VersionCheckService =>
  VersionCheckService.getInstance();
