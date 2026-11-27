import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Plugin registry service - central registry for all loaded plugins
import type {
  PluginInstance,
  PluginNavigationAPI,
  PluginPermissions,
  PluginPlayerAPI,
} from "../../types/plugin.types.ts";
import { CONFIG_DIR } from "../../utils/constants.ts";
import { getConfigService } from "../config/config.service.ts";
import { logger } from "../logger/logger.service.ts";
import { createPluginContext } from "./plugin-context.ts";
import { getPluginLoaderService } from "./plugin-loader.service.ts";
import { getPluginPermissionsService } from "./plugin-permissions.service.ts";

const PLUGINS_DIR = join(CONFIG_DIR, "plugins");

// Stub implementations for headless mode
function createStubPlayerAPI(): PluginPlayerAPI {
  return {
    play: async () => {},
    pause: () => {},
    resume: () => {},
    stop: () => {},
    next: () => {},
    previous: () => {},
    seek: () => {},
    setVolume: () => {},
    getVolume: () => 70,
    getCurrentTrack: () => null,
    getQueue: () => [],
    addToQueue: () => {},
    removeFromQueue: () => {},
    clearQueue: () => {},
    shuffle: () => {},
    setRepeat: () => {},
  };
}

function createStubNavigationAPI(): PluginNavigationAPI {
  return {
    navigate: () => {},
    goBack: () => {},
    getCurrentView: () => "",
    registerView: () => {},
    unregisterView: () => {},
  };
}

/**
 * Plugin registry service - manages all loaded plugins
 */
class PluginRegistryService {
  private plugins: Map<string, PluginInstance>;
  private pluginLoader = getPluginLoaderService();
  private permissionsService = getPluginPermissionsService();
  private configService = getConfigService();
  private playerAPI: PluginPlayerAPI;
  private navigationAPI: PluginNavigationAPI;

  constructor() {
    this.plugins = new Map();
    // Initialize with stubs so plugins always have a context, even in headless mode
    this.playerAPI = createStubPlayerAPI();
    this.navigationAPI = createStubNavigationAPI();
  }

  /**
   * Set the player API for plugin contexts (call before loading plugins)
   */
  setPlayerAPI(api: PluginPlayerAPI): void {
    this.playerAPI = api;
  }

  /**
   * Set the navigation API for plugin contexts (call before loading plugins)
   */
  setNavigationAPI(api: PluginNavigationAPI): void {
    this.navigationAPI = api;
  }

  /**
   * Ensure a plugin has a context initialized
   */
  private ensurePluginContext(plugin: PluginInstance): void {
    if (plugin.context) {
      return; // Already initialized
    }
    if (!this.playerAPI || !this.navigationAPI) {
      // No real APIs provided yet; will be initialized later when set
      return;
    }
    plugin.context = createPluginContext(
      plugin.manifest,
      this.playerAPI,
      this.navigationAPI,
    );
  }

  /**
   * Load a plugin from a directory
   */
  async loadPlugin(pluginPath: string): Promise<PluginInstance> {
    const instance = await this.pluginLoader.loadPlugin(pluginPath);

    // Check if already loaded
    if (this.plugins.has(instance.manifest.id)) {
      throw new Error(`Plugin ${instance.manifest.id} is already loaded`);
    }

    // Store in registry
    this.plugins.set(instance.manifest.id, instance);
    logger.info(
      "PluginRegistryService",
      `Registered plugin: ${instance.manifest.name}`,
    );

    // Ensure context is initialized if APIs are available
    this.ensurePluginContext(instance);

    return instance;
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    // Call destroy hook if enabled
    if (instance.enabled && instance.plugin.destroy) {
      try {
        await this.pluginLoader.callHook(
          instance.plugin,
          "destroy",
          instance.context,
        );
      } catch (error) {
        logger.error(
          "PluginRegistryService",
          `Error destroying plugin ${pluginId}:`,
          error,
        );
      }
    }

    // Remove from registry
    this.plugins.delete(pluginId);
    logger.info("PluginRegistryService", `Unloaded plugin: ${pluginId}`);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    if (instance.enabled) {
      logger.debug(
        "PluginRegistryService",
        `Plugin ${pluginId} is already enabled`,
      );
      return;
    }

    // Call enable hook
    if (instance.plugin.enable) {
      try {
        await this.pluginLoader.callHook(
          instance.plugin,
          "enable",
          instance.context,
        );
      } catch (error) {
        logger.error(
          "PluginRegistryService",
          `Error in enable hook for ${pluginId}:`,
          error,
        );
        // Don't re-throw - plugin remains disabled but app continues
        return;
      }
    }

    instance.enabled = true;
    instance.config.enabled = true;
    this.savePluginState();

    logger.info("PluginRegistryService", `Enabled plugin: ${pluginId}`);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    if (!instance.enabled) {
      logger.debug(
        "PluginRegistryService",
        `Plugin ${pluginId} is already disabled`,
      );
      return;
    }

    // Call disable hook
    if (instance.plugin.disable) {
      try {
        await this.pluginLoader.callHook(
          instance.plugin,
          "disable",
          instance.context,
        );
      } catch (error) {
        logger.error(
          "PluginRegistryService",
          `Error in disable hook for ${pluginId}:`,
          error,
        );
        // Continue to disable state even if disable hook fails
      }
    }

    instance.enabled = false;
    instance.config.enabled = false;
    this.savePluginState();

    logger.info("PluginRegistryService", `Disabled plugin: ${pluginId}`);
  }

  /**
   * Get a plugin instance
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginInstance[] {
    return [...this.plugins.values()];
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): PluginInstance[] {
    return this.getAllPlugins().filter(p => p.enabled);
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.enabled ?? false;
  }

  /**
   * Get plugin permissions
   */
  getPermissions(pluginId: string): PluginPermissions {
    return this.permissionsService.getPermissions(pluginId);
  }

  /**
   * Load all plugins from the plugins directory
   */
  async loadAllPlugins(): Promise<void> {
    if (!existsSync(PLUGINS_DIR)) {
      logger.info(
        "PluginRegistryService",
        "Plugins directory does not exist, skipping plugin loading",
      );
      return;
    }

    const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
    const pluginDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => join(PLUGINS_DIR, entry.name));

    logger.info(
      "PluginRegistryService",
      `Found ${pluginDirs.length} potential plugin(s)`,
    );

    for (const pluginDir of pluginDirs) {
      try {
        await this.loadPlugin(pluginDir);
      } catch (error) {
        logger.error(
          "PluginRegistryService",
          `Failed to load plugin from ${pluginDir}:`,
          error,
        );
      }
    }

    logger.info(
      "PluginRegistryService",
      `Loaded ${this.plugins.size} plugin(s)`,
    );
  }

  /**
   * Save plugin enabled/disabled state to config
   */
  private savePluginState(): void {
    const pluginStates: Record<string, { enabled: boolean }> = {};

    for (const [id, instance] of this.plugins) {
      pluginStates[id] = { enabled: instance.enabled };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.configService.set("pluginStates" as any, pluginStates);
  }

  /**
   * Get saved plugin state from config
   */
  private getSavedPluginState(
    pluginId: string,
  ): { enabled: boolean } | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const states = this.configService.get("pluginStates" as any) as Record<
      string,
      { enabled: boolean }
    >;
    return states?.[pluginId];
  }

  /**
   * Clear all plugins
   */
  async unloadAllPlugins(): Promise<void> {
    const pluginIds = [...this.plugins.keys()];
    for (const pluginId of pluginIds) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        logger.error(
          "PluginRegistryService",
          `Error unloading plugin ${pluginId}:`,
          error,
        );
      }
    }
  }
}

// Singleton instance
let instance: PluginRegistryService | null = null;

/**
 * Get the plugin registry service singleton
 */
export function getPluginRegistryService(): PluginRegistryService {
  if (!instance) {
    instance = new PluginRegistryService();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPluginRegistryService(): void {
  if (instance) {
    void instance.unloadAllPlugins();
  }
  instance = null;
}
