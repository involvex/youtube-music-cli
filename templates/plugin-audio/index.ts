// Audio plugin template for youtube-music-cli
import type {
	Plugin,
	PluginManifest,
	PluginContext,
} from '../../source/types/plugin.types.ts';

const manifest: PluginManifest = {
	id: '{{PLUGIN_ID}}',
	name: '{{PLUGIN_NAME}}',
	version: '1.0.0',
	description: 'An audio processing plugin for youtube-music-cli',
	author: '{{AUTHOR}}',
	license: 'MIT',
	main: 'index.ts',
	permissions: ['player'],
	hooks: ['stream-request', 'stream-start', 'stream-end'],
};

const plugin: Plugin = {
	manifest,

	async init(context: PluginContext) {
		context.logger.info('Audio Plugin initialized');

		// Register audio stream handler
		context.audio.onStreamRequest(async (url, track) => {
			context.logger.info('Stream requested for:', track.title);

			// Example: Transform URL (e.g., for quality adjustment, proxy, etc.)
			// Return null to block the stream
			// Return a modified URL to redirect
			// Return the same URL to pass through

			// For this template, we just pass through
			return url;
		});

		// Listen for stream events
		context.on('stream-start', event => {
			context.logger.info('Stream started:', event.track?.title);
		});

		context.on('stream-end', event => {
			context.logger.info('Stream ended:', event.track?.title);
		});

		context.on('stream-error', event => {
			context.logger.error('Stream error:', event.error?.message);
		});
	},

	async enable(context: PluginContext) {
		context.logger.info('Audio Plugin enabled');
	},

	async disable(context: PluginContext) {
		context.logger.info('Audio Plugin disabled');
	},

	async destroy(context: PluginContext) {
		context.logger.info('Audio Plugin destroyed');
	},
};

export default plugin;
export {manifest};
