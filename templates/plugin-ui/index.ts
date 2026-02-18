// UI plugin template for youtube-music-cli
import type {
	Plugin,
	PluginManifest,
	PluginContext,
} from '../../source/types/plugin.types.ts';

const manifest: PluginManifest = {
	id: '{{PLUGIN_ID}}',
	name: '{{PLUGIN_NAME}}',
	version: '1.0.0',
	description: 'A UI plugin for youtube-music-cli',
	author: '{{AUTHOR}}',
	license: 'MIT',
	main: 'index.ts',
	permissions: ['ui'],
	hooks: ['view-change'],
	ui: {
		views: ['{{PLUGIN_ID}}-view'],
		shortcuts: ['ctrl+shift+p'],
	},
};

const plugin: Plugin = {
	manifest,

	async init(context: PluginContext) {
		context.logger.info('UI Plugin initialized');

		// Register a keyboard shortcut
		context.registerShortcut(['ctrl+shift+p'], () => {
			context.logger.info('Shortcut triggered!');
			// Navigate to custom view
			context.navigation.navigate('{{PLUGIN_ID}}-view');
		});

		// Listen for view changes
		context.on('view-change', event => {
			context.logger.info('View changed to:', event.view);
		});
	},

	async enable(context: PluginContext) {
		context.logger.info('UI Plugin enabled');
	},

	async disable(context: PluginContext) {
		context.logger.info('UI Plugin disabled');
		// Unregister shortcuts
		context.unregisterShortcut(['ctrl+shift+p']);
	},

	async destroy(context: PluginContext) {
		context.logger.info('UI Plugin destroyed');
	},
};

export default plugin;
export {manifest};
