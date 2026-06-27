import process from 'node:process';
import {startImmersiveApp} from './immersive/immersive-app.ts';

const discoMode = process.env.DISCO_MODE === 'true';

void startImmersiveApp({
	discoMode,
});
