import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const serverHost = process.env.HOST ?? '0.0.0.0';
const serverPort = Number(process.env.PORT) || 3000;
const target = process.env.TARGET ?? `localhost:${serverPort}`;
const wsTarget = `ws://${target}`;

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: '../dist/web',
		emptyOutDir: true,
	},
	server: {
		port: serverPort,
		host: serverHost,
		proxy: {
			'/ws': {
				target: wsTarget,
				ws: true,
			},
		},
	},
});
