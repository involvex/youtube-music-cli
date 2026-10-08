// Network status toggle — layouts must respect the showNetworkStatus setting.
// Full-frame render checks via ink-testing-library with network stubbed out.
import {afterEach, beforeEach, describe, expect, test} from 'bun:test';
import {render} from 'ink-testing-library';
import type {ReactElement, ReactNode} from 'react';
import GenresLayout from '../source/components/layouts/GenresLayout.tsx';
import HomeLayout from '../source/components/layouts/HomeLayout.tsx';
import NewReleasesLayout from '../source/components/layouts/NewReleasesLayout.tsx';
import SearchLayout from '../source/components/layouts/SearchLayout.tsx';
import TrendingLayout from '../source/components/layouts/TrendingLayout.tsx';
import NowPlaying from '../source/components/player/NowPlaying.tsx';
import {ThemeProvider} from '../source/contexts/theme.context.tsx';
import {KeyboardBlockProvider} from '../source/hooks/useKeyboardBlocker.tsx';
import {getConfigService} from '../source/services/config/config.service.ts';
import {
	resetOfflineStateForTests,
	setOfflineState,
} from '../source/services/offline/offline-mode.service.ts';
import {FavoritesProvider} from '../source/stores/favorites.store.tsx';
import {HistoryProvider} from '../source/stores/history.store.tsx';
import {NavigationProvider} from '../source/stores/navigation.store.tsx';
import {PlayerProvider} from '../source/stores/player.store.tsx';

const OFFLINE_BADGE = '📡 Offline';
const ONLINE_BADGE = '⚠️ Online';

const realFetch = globalThis.fetch;

function Providers({children}: {children: ReactNode}) {
	return (
		<ThemeProvider>
			<PlayerProvider>
				<FavoritesProvider>
					<HistoryProvider>
						<NavigationProvider>
							<KeyboardBlockProvider>{children}</KeyboardBlockProvider>
						</NavigationProvider>
					</HistoryProvider>
				</FavoritesProvider>
			</PlayerProvider>
		</ThemeProvider>
	);
}

async function renderFrame(node: ReactElement): Promise<string> {
	const {lastFrame, unmount, rerender, stdout} = render(
		<Providers>{node}</Providers>,
	);
	try {
		// Ink may commit the first frame asynchronously (especially under CI
		// load), so wait for content instead of trusting a synchronous read.
		// A genuinely missing badge still fails once content arrives.
		const start = Date.now();
		let frame = lastFrame() ?? '';
		while (frame === '' && Date.now() - start < 2000) {
			await new Promise(resolve => setTimeout(resolve, 10));
			frame = lastFrame() ?? '';
		}
		if (frame === '') {
			// Second chance: a dropped first commit recovers on rerender.
			rerender(node);
			await new Promise(resolve => setTimeout(resolve, 250));
			frame = lastFrame() ?? '';
		}
		if (frame === '') {
			console.warn(
				`renderFrame: no output committed (frames=${stdout.frames.length})`,
			);
		}
		return frame;
	} finally {
		unmount();
	}
}

// HomeLayout always contains a static '📡 Live Streams' quick-link label,
// so assertions must target the full badge strings, not the bare emoji.
const headerLayouts: Array<[string, ReactElement]> = [
	['TrendingLayout', <TrendingLayout key="trending" />],
	['NewReleasesLayout', <NewReleasesLayout key="releases" />],
	['GenresLayout', <GenresLayout key="genres" />],
	['HomeLayout', <HomeLayout key="home" />],
	['SearchLayout', <SearchLayout key="search" />],
];

describe('showNetworkStatus toggle', () => {
	let original: boolean | undefined;

	beforeEach(() => {
		original = getConfigService().get('showNetworkStatus');
		resetOfflineStateForTests();
		globalThis.fetch = (() =>
			Promise.reject(
				new Error('network disabled in tests'),
			)) as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = realFetch;
		getConfigService().set('showNetworkStatus', original);
		resetOfflineStateForTests();
	});

	test(
		'header layouts show offline badge when enabled and offline',
		async () => {
			getConfigService().set('showNetworkStatus', true);
			setOfflineState({isOffline: true});

			for (const [name, node] of headerLayouts) {
				expect(await renderFrame(node), name).toContain(OFFLINE_BADGE);
			}
		},
		{timeout: 60_000},
	);

	test(
		'header layouts show online badge when enabled and online',
		async () => {
			getConfigService().set('showNetworkStatus', true);
			setOfflineState({isOffline: false});

			for (const [name, node] of headerLayouts) {
				expect(await renderFrame(node), name).toContain(ONLINE_BADGE);
			}
		},
		{timeout: 60_000},
	);

	test(
		'header layouts hide badges when disabled, offline or online',
		async () => {
			getConfigService().set('showNetworkStatus', false);

			for (const isOffline of [true, false]) {
				setOfflineState({isOffline});
				for (const [name, node] of headerLayouts) {
					const frame = await renderFrame(node);
					expect(frame, `${name} offline=${isOffline}`).not.toContain(
						OFFLINE_BADGE,
					);
					expect(frame, `${name} offline=${isOffline}`).not.toContain(
						ONLINE_BADGE,
					);
				}
			}
		},
		{timeout: 60_000},
	);

	test(
		'NowPlaying renders no badge without a current track',
		async () => {
			// The offline badge lives in the time display, which only renders
			// alongside a current track. Without one, no badge may leak
			// regardless of the toggle or network state.
			for (const show of [true, false]) {
				getConfigService().set('showNetworkStatus', show);
				for (const isOffline of [true, false]) {
					setOfflineState({isOffline});
					const frame = await renderFrame(<NowPlaying />);
					const label = `show=${show} offline=${isOffline}`;
					expect(frame, label).toContain('No track playing');
					expect(frame, label).not.toContain(OFFLINE_BADGE);
					expect(frame, label).not.toContain(ONLINE_BADGE);
				}
			}
		},
		{timeout: 60_000},
	);

	test(
		'showNetworkStatus defaults to true',
		() => {
			expect(getConfigService().getDefaultConfig().showNetworkStatus).toBe(
				true,
			);
		},
		{timeout: 60_000},
	);
});
