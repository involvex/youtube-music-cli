// Network status toggle — layouts must respect the showNetworkStatus setting.
// Synchronous render-to-string checks: the badges live in static header
// output, so asserting on a full App frame added nothing but commit-timing
// flakiness under CI load.
import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';
import {renderToString} from 'ink';
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

// Stub the YouTube client: renderToString executes mount effects, so the
// layouts' data fetches fire. Empty shapes parse cleanly to [] with no
// warnings. Note Bun's mock.module registry is process-global, so this fake
// must stay a superset of music-service.test.js's (getBasicInfo) to avoid
// changing behavior for files running later in the same process.
mock.module('youtubei.js', () => ({
	Innertube: class {
		static async create() {
			return {
				getBasicInfo: async () => ({
					playability_status: {status: 'OK'},
					basic_info: {
						title: 'Test Track',
						channel: {id: 'channel1', name: 'Test Artist'},
						duration: 180,
					},
				}),
				music: {getExplore: async () => ({sections: []})},
				actions: {execute: async () => ({data: {}})},
			};
		}
	},
	Log: {setLevel: () => {}, Level: {ERROR: 3}},
}));

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

function renderFrame(node: ReactElement): string {
	return renderToString(<Providers>{node}</Providers>);
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
	});

	afterEach(() => {
		getConfigService().set('showNetworkStatus', original);
		resetOfflineStateForTests();
	});

	test('header layouts show offline badge when enabled and offline', () => {
		getConfigService().set('showNetworkStatus', true);
		setOfflineState({isOffline: true});

		for (const [name, node] of headerLayouts) {
			expect(renderFrame(node), name).toContain(OFFLINE_BADGE);
		}
	});

	test('header layouts show online badge when enabled and online', () => {
		getConfigService().set('showNetworkStatus', true);
		setOfflineState({isOffline: false});

		for (const [name, node] of headerLayouts) {
			expect(renderFrame(node), name).toContain(ONLINE_BADGE);
		}
	});

	test('header layouts hide badges when disabled, offline or online', () => {
		getConfigService().set('showNetworkStatus', false);

		for (const isOffline of [true, false]) {
			setOfflineState({isOffline});
			for (const [name, node] of headerLayouts) {
				const frame = renderFrame(node);
				expect(frame, `${name} offline=${isOffline}`).not.toContain(
					OFFLINE_BADGE,
				);
				expect(frame, `${name} offline=${isOffline}`).not.toContain(
					ONLINE_BADGE,
				);
			}
		}
	});

	test('NowPlaying renders no badge without a current track', () => {
		// The offline badge lives in the time display, which only renders
		// alongside a current track. Without one, no badge may leak
		// regardless of the toggle or network state.
		for (const show of [true, false]) {
			getConfigService().set('showNetworkStatus', show);
			for (const isOffline of [true, false]) {
				setOfflineState({isOffline});
				const frame = renderFrame(<NowPlaying />);
				const label = `show=${show} offline=${isOffline}`;
				expect(frame, label).toContain('No track playing');
				expect(frame, label).not.toContain(OFFLINE_BADGE);
				expect(frame, label).not.toContain(ONLINE_BADGE);
			}
		}
	});

	test('showNetworkStatus defaults to true', () => {
		expect(getConfigService().getDefaultConfig().showNetworkStatus).toBe(true);
	});
});
