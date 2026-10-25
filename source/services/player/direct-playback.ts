// Keeps one-shot CLI playback (`ymc play`) alive until the track finishes.
import type {getPlayerService} from './player.service.ts';

type DirectPlaybackPlayer = Pick<
	ReturnType<typeof getPlayerService>,
	'onEvent' | 'tryReconnectIpc' | 'hasMpvProcess' | 'stop'
>;

/**
 * Resolve once direct playback is over: mpv reported end of file, mpv is
 * gone, or the user pressed Ctrl+C / sent SIGTERM. Stops mpv before
 * resolving so the CLI never leaves a detached, idle mpv behind.
 */
export async function waitForDirectPlaybackEnd(
	playerService: DirectPlaybackPlayer,
): Promise<void> {
	await new Promise<void>(resolve => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			clearInterval(processWatch);
			process.off('SIGINT', finish);
			process.off('SIGTERM', finish);
			playerService.stop();
			resolve();
		};

		playerService.onEvent(event => {
			if (event.eof) {
				finish();
				return;
			}

			// IPC drops can be transient (notably Windows named pipes) while mpv
			// keeps playing: reconnect like the TUIs do, and only give up if mpv
			// cannot be reached again (EOF would never arrive).
			if (event.ipcDisconnected) {
				void playerService.tryReconnectIpc().then(reconnected => {
					if (!reconnected) finish();
				});
			}
		});
		// Covers mpv dying without a clean IPC close
		const processWatch = setInterval(() => {
			if (!playerService.hasMpvProcess()) finish();
		}, 1000);
		process.on('SIGINT', finish);
		process.on('SIGTERM', finish);
	});
}
