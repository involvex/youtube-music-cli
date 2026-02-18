// Basic plugin template for youtube-music-cli
import type {
	Plugin,
	PluginManifest,
	PluginContext,
} from '../../source/types/plugin.types.ts';

const manifest: PluginManifest = {
	id: '{{PLUGIN_ID}}',
	name: '{{PLUGIN_NAME}}',
	version: '1.0.0',
	description: 'A basic youtube-music-cli plugin',
	author: '{{AUTHOR}}',
	license: 'MIT',
	main: 'index.ts',
	permissions: [],
	hooks: ['play', 'pause', 'track-change'],
};

const plugin: Plugin = {
	manifest,

	// Called when plugin is loaded
	async init(context: PluginContext) {
		context.logger.info('Plugin initialized');

		// Register event listeners
		context.on('play', event => {
			context.logger.info('Track started playing:', event.track?.title);
		});

		context.on('pause', () => {
			context.logger.info('Playback paused');
		});

		context.on('track-change', event => {
			context.logger.info('Track changed to:', event.track?.title);
		});
	},

	// Called when plugin is enabled
	async enable(context: PluginContext) {
		context.logger.info('Plugin enabled');
	},

	// Called when plugin is disabled
	async disable(context: PluginContext) {
		context.logger.info('Plugin disabled');
	},

	// Called when plugin is unloaded
	async destroy(context: PluginContext) {
		context.logger.info('Plugin destroyed');
	},
};

export default plugin;
export {manifest};
