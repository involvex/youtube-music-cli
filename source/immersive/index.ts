import process from 'node:process';
import {ImmersiveEngine, type ImmersiveOptions} from './immersive-engine.ts';

export {ImmersiveEngine} from './immersive-engine.ts';
export {startImmersiveApp} from './immersive-app.ts';
export type {ImmersiveAppOptions} from './immersive-app.ts';

export function launchImmersiveMode(options: ImmersiveOptions): void {
	if (process.platform !== 'win32') {
		console.error('Immersive mode is only supported on Windows.');
		process.exit(1);
	}

	const engine = new ImmersiveEngine(options);
	void engine.start();
}

export function isImmersiveSupported(): boolean {
	return process.platform === 'win32';
}

export type {ImmersiveOptions} from './immersive-engine.ts';
