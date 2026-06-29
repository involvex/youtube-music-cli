import process from 'node:process';
import {startImmersiveApp} from './immersive/immersive-app.ts';

const discoMode = process.env.DISCO_MODE === 'true';

process.on('unhandledRejection', reason => {
	const message =
		reason instanceof Error ? reason.message : String(reason ?? 'unknown');
	console.error(`Playback error: ${message}`);
});

void startImmersiveApp({
	discoMode,
}).catch(error => {
	const message =
		error instanceof Error ? error.message : String(error ?? 'unknown');
	console.error(`Immersive mode failed: ${message}`);
	process.exit(1);
});
