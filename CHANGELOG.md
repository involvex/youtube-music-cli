# [0.3.0](https://github.com/involvex/youtube-music-cli/compare/v0.2.3...v0.3.0) (2026-10-04)

### Bug Fixes

- make Escape/back navigation and keyboard controls reliable ([5207822](https://github.com/involvex/youtube-music-cli/commit/52078226033fbcfc7b489f208f36695b7d5b9bc6))
- **security:** resolve CodeQL alerts for missing workflow permissions and identity replacement ([459e983](https://github.com/involvex/youtube-music-cli/commit/459e983b4b9a00971c18d8c6ac4c4b108605c110)), closes [#10](https://github.com/involvex/youtube-music-cli/issues/10) [#11](https://github.com/involvex/youtube-music-cli/issues/11) [#12](https://github.com/involvex/youtube-music-cli/issues/12) [#9](https://github.com/involvex/youtube-music-cli/issues/9)
- treat raw ESC byte as cancel in keybinding capture mode ([5da1810](https://github.com/involvex/youtube-music-cli/commit/5da1810f4277beaa045059c3bbd7bd9b6e71a828))

### Features

- add offline mode with network status indicator and periodic health checks ([38e57c4](https://github.com/involvex/youtube-music-cli/commit/38e57c4efab48e6de2aaa380efb9e2647e25a070))
- add showNetworkStatus setting for toggling network status indicators ([57d1648](https://github.com/involvex/youtube-music-cli/commit/57d16486fb468b0ae8a03cfd8f47a4c1d0732a9e))
- extend network status indicators to all layouts with notifications ([dedf4d4](https://github.com/involvex/youtube-music-cli/commit/dedf4d4df32b53557ccc6ad7741df28b0635cc24))
- gate network status indicators behind showNetworkStatus ([26cae78](https://github.com/involvex/youtube-music-cli/commit/26cae784b28cdd5a14935ba937578e5bae620a50))

### Performance Improvements

- karaoke timing optimization, cache O(1) eviction, and React 19.3.0 alignment ([4b468c7](https://github.com/involvex/youtube-music-cli/commit/4b468c727e86331a29ec3834763b8427f867926a))
- LRU cache O(1) eviction + SearchResults item memoization ([9eb0306](https://github.com/involvex/youtube-music-cli/commit/9eb0306a545ee92e33f42bb857774ab0e6d2aacc)), closes [hi#impact](https://github.com/hi/issues/impact)

## [0.2.3](https://github.com/involvex/youtube-music-cli/compare/v0.2.2...v0.2.3) (2026-09-14)

### Bug Fixes

- **player:** resume playback when using --continue flag ([3d4ff29](https://github.com/involvex/youtube-music-cli/commit/3d4ff29c16985c88f234f41f9a9a2928defe9b1e))
- **player:** stop infinite mpv spawn on --continue ([b48e9b2](https://github.com/involvex/youtube-music-cli/commit/b48e9b209f0420f0ee0cd5386faca6762161297b))

## [0.2.2](https://github.com/involvex/youtube-music-cli/compare/v0.2.1...v0.2.2) (2026-09-13)

### Bug Fixes

- add mpv command logging and exit diagnostics for Fedora IPC issue ([01478f6](https://github.com/involvex/youtube-music-cli/commit/01478f62063de5695d751ef7458662082ab13a68))
- **ci:** increase Homebrew publish retries for npm tarball propagation ([af89e7a](https://github.com/involvex/youtube-music-cli/commit/af89e7a9e609ecebe3e09df66bb1ba648a9ea891))
- expose npm CLI binaries in Homebrew bin ([#44](https://github.com/involvex/youtube-music-cli/issues/44)) ([de1ac65](https://github.com/involvex/youtube-music-cli/commit/de1ac65b222586554b814790171ff718c48a1fc1))
- guide users when YouTube streams fail to load ([#46](https://github.com/involvex/youtube-music-cli/issues/46)) ([425c69e](https://github.com/involvex/youtube-music-cli/commit/425c69e3a430de289517b7c57dfa01d45d95adc2))
- initialize OAuth2 before getDeviceAndUserCode in auth service and LoginView ([c347685](https://github.com/involvex/youtube-music-cli/commit/c34768593241ea9cad8f5d530b25f9843ed370ad))
- use direct useInput for Tab and Escape in SearchBar to fix keyboard cycling on Linux ([88cd458](https://github.com/involvex/youtube-music-cli/commit/88cd4589b36fce68152ce5ed3eaa9dc22ec8fb29))

### Features

- add config backup command with compression, restore, and retention ([b080686](https://github.com/involvex/youtube-music-cli/commit/b080686b17907e225068dd6d4a2b71de11079aa6))

## [0.2.1](https://github.com/involvex/youtube-music-cli/compare/v0.2.0...v0.2.1) (2026-09-04)

### Bug Fixes

- **player:** always pass --idle=yes to mpv to prevent immediate exit on Windows ([499a361](https://github.com/involvex/youtube-music-cli/commit/499a3611ebf52eb537bd4b000585a4b847da6848))
- **player:** improve mpv IPC reliability on Linux/Fedora ([d199699](https://github.com/involvex/youtube-music-cli/commit/d199699dd83bde941a3a198577b32aa3a53ded47)), closes [#42](https://github.com/involvex/youtube-music-cli/issues/42)

# [0.2.0](https://github.com/involvex/youtube-music-cli/compare/v0.1.9...v0.2.0) (2026-09-03)

### Features

- add YouTube Music playlist sync and fix Windows cookie extraction ([c311f06](https://github.com/involvex/youtube-music-cli/commit/c311f06fa98bfd1b4e79cdffa89aa0ea8d23d9de)), closes [#18](https://github.com/involvex/youtube-music-cli/issues/18)
- **auth:** add cookie-based auth as fallback for broken OAuth2 ([9213fc5](https://github.com/involvex/youtube-music-cli/commit/9213fc5e9892a137da2fd938fc0a0e1558e5f38e))

## [0.1.9](https://github.com/involvex/youtube-music-cli/compare/v0.1.8...v0.1.9) (2026-09-03)

### Bug Fixes

- **player:** suppress spurious pause events during track loading (fixes [#39](https://github.com/involvex/youtube-music-cli/issues/39)) ([bba7c57](https://github.com/involvex/youtube-music-cli/commit/bba7c57d9960d3b02aba70d0ddd875a7b2b9e00a))
- **test:** prevent auto-update version validation from timing out on CI ([91274bb](https://github.com/involvex/youtube-music-cli/commit/91274bbc0de9791a5dbaf2088c55683fdb82084b))

### Features

- **boot:** use larger figlet logo and show app metadata ([f8fdae9](https://github.com/involvex/youtube-music-cli/commit/f8fdae9aa6c4274393604e0cc164461a9349b165))

## [0.1.8](https://github.com/involvex/youtube-music-cli/compare/v0.1.7...v0.1.8) (2026-08-28)

### Bug Fixes

- **auth:** address review items [#2](https://github.com/involvex/youtube-music-cli/issues/2) [#4](https://github.com/involvex/youtube-music-cli/issues/4) [#9](https://github.com/involvex/youtube-music-cli/issues/9) ([b4c2f99](https://github.com/involvex/youtube-music-cli/commit/b4c2f99ea8fedf52f8570fa8394d5ca1bd3b96ab))
- **auth:** harden credential storage, refactor LoginView, add auth service tests ([99bb8ac](https://github.com/involvex/youtube-music-cli/commit/99bb8aca99da416463a023b2685f830113371cd0))
- **ci:** rebase before pushing homebrew formula update ([db9a416](https://github.com/involvex/youtube-music-cli/commit/db9a4163b2609b9adb90a8376e0a60252d02765d))
- **lint:** remove unused handleLogout and resetClient from LoginView ([0e36135](https://github.com/involvex/youtube-music-cli/commit/0e36135981409f3f5b422f1e593c18e251d88e2c))
- **test:** sync immersive settings row counts and indices with current 29-row layout ([6a5120e](https://github.com/involvex/youtube-music-cli/commit/6a5120ed18a38f4c5dc4b528489f20719b56b33b))

### Features

- **completions:** add login, logout, whoami to shell completions ([8de5ee0](https://github.com/involvex/youtube-music-cli/commit/8de5ee0fb7f14ee1d4b8eaf46630d84d3101fc0c))

## [0.1.7](https://github.com/involvex/youtube-music-cli/compare/v0.1.6...v0.1.7) (2026-08-26)

### Bug Fixes

- **cli:** prevent ink boot screen from opening on ymc update --check commands ([f1eb848](https://github.com/involvex/youtube-music-cli/commit/f1eb8485feff08c048b31393310f506b0676b995))
- **update,completions:** register update command in shell completions and fix ymc update command execution ([5c8834c](https://github.com/involvex/youtube-music-cli/commit/5c8834c8ce0f7430862fecb10280d3f04a2b941b))

### Features

- **update:** add --check and --dry-run flags to ymc update command ([b65f27f](https://github.com/involvex/youtube-music-cli/commit/b65f27f9fe3778544246e7be59381c9b9828d94a))

## [0.1.6](https://github.com/involvex/youtube-music-cli/compare/v0.1.5...v0.1.6) (2026-08-26)

### Features

- **player:** tui terminal title, configurable cache ttl, sleep-timer fade-out ([b0c79ba](https://github.com/involvex/youtube-music-cli/commit/b0c79ba1524f55b1aefdb95d8a726e3a48f58f19))
- **update,recommendations:** add auto-update CLI command and smart recommendations service ([44582fe](https://github.com/involvex/youtube-music-cli/commit/44582fe646b464e5f69ae9fcaaf3390757c3ebc7))
- **web:** add media session api integration and /mini player route ([24713aa](https://github.com/involvex/youtube-music-cli/commit/24713aa5e6c46eccb0a48b0a004c1e9d621e472a))

## [0.1.5](https://github.com/involvex/youtube-music-cli/compare/v0.1.4...v0.1.5) (2026-08-25)

### Bug Fixes

- **build:** skip self-copy when web dist already sits beside binary ([af0cb92](https://github.com/involvex/youtube-music-cli/commit/af0cb9240784d6718fe39b252ddedc4e03e2fca4))

### Features

- **lyrics:** word-level karaoke sync via native Musixmatch richsync ([50e29fc](https://github.com/involvex/youtube-music-cli/commit/50e29fcf5b42ef7a99403c0ff0c2b0803522ec7b)), closes [#40](https://github.com/involvex/youtube-music-cli/issues/40)
- **radio:** endless playlist radio from saved playlists ([31ca8cf](https://github.com/involvex/youtube-music-cli/commit/31ca8cfd4390b8cb06e9b8066f8460032cd8ea0f))

## [0.1.4](https://github.com/involvex/youtube-music-cli/compare/v0.1.3...v0.1.4) (2026-08-19)

### Bug Fixes

- **player:** ensure media auto-plays after loading via IPC ([b7b4164](https://github.com/involvex/youtube-music-cli/commit/b7b41644271f73ef108730dc20ff1a59d767414a))

### Features

- add boot screens with YMC ASCII art and sponsor line ([49f6c74](https://github.com/involvex/youtube-music-cli/commit/49f6c742851d1930d71965392857c7ad29ab1915))

## [0.1.3](https://github.com/involvex/youtube-music-cli/compare/v0.1.2...v0.1.3) (2026-08-04)

### Bug Fixes

- handle Windows file locking in config and player-state save ([cebd5e9](https://github.com/involvex/youtube-music-cli/commit/cebd5e9e88b7cd2d0d3890c3c26eae72264741f1))
- **keybindings:** resolve Shift+A collision and wire custom keybindings into dispatcher ([15e395e](https://github.com/involvex/youtube-music-cli/commit/15e395ee9198df5b26bf489381178f304d6a30c5)), closes [#1](https://github.com/involvex/youtube-music-cli/issues/1)
- prevent config corruption on Windows and add keybinding conflict warnings ([f1aa38b](https://github.com/involvex/youtube-music-cli/commit/f1aa38ba3c9e3c09050dfafcc34066b013caa5db))

## [0.1.2](https://github.com/involvex/youtube-music-cli/compare/v0.1.1...v0.1.2) (2026-08-02)

### Bug Fixes

- **ci:** exclude compiled binaries from npm package ([5a484b6](https://github.com/involvex/youtube-music-cli/commit/5a484b61dd848ef61675d78cf50257d48b2d21fd))
- **keyboard:** add Esc back navigation from player view ([d6187bb](https://github.com/involvex/youtube-music-cli/commit/d6187bbee0ca4312321289aee2bf6a86d7ff105b))
- **radio:** remove double-deduplication in mood radio seed fetching ([cf5e759](https://github.com/involvex/youtube-music-cli/commit/cf5e759cd6afe0a6b8cd03329b98bbe1853c8bb9))

### Features

- **mood-radio:** add mood-based radio and AI playlist generation ([829b111](https://github.com/involvex/youtube-music-cli/commit/829b111b7043edde05bba3e89d3fb835000acd7f))

## [0.1.1](https://github.com/involvex/youtube-music-cli/compare/v0.1.0...v0.1.1) (2026-07-27)

### Features

- cookies, stats share, log rotation, history, and bun tests ([68608df](https://github.com/involvex/youtube-music-cli/commit/68608df2235c4730babdaa648fcb8ddfce6ba4c3))
- local-play settings, videoId filenames, and multi-arch releases ([9f6eac2](https://github.com/involvex/youtube-music-cli/commit/9f6eac2f5fd86335276f262b1f835dda44301ace))
- prefer local downloads and clean agent/install tooling ([bc37062](https://github.com/involvex/youtube-music-cli/commit/bc370622f4599686818d4ddd826dce52627e2662))
- show Local media source and document release assets ([def7129](https://github.com/involvex/youtube-music-cli/commit/def71299268bd8ecac9aa9e26e0e0713a24cd407))
- **web:** add favorites with heart toggle and play random ([6091a45](https://github.com/involvex/youtube-music-cli/commit/6091a456d5a0186ed1928e86a2078e2b7f655a1f))

# [0.1.0](https://github.com/involvex/youtube-music-cli/compare/v0.0.100...v0.1.0) (2026-07-25)

### Bug Fixes

- **release:** align react version with npm overrides for publish ([d00f9f2](https://github.com/involvex/youtube-music-cli/commit/d00f9f2a5ec2e4fdf021735482ac1c5260f6f82a))
- **web:** align react and react-dom to 19.2.8 ([24b2994](https://github.com/involvex/youtube-music-cli/commit/24b2994a2c254963e12e21549ec86236c89f9338))
- **web:** ship dist/web with build and resolve static path ([2101684](https://github.com/involvex/youtube-music-cli/commit/2101684d60aced734ac55b80d7a31d4e8bcc5c9c))

### Features

- **web:** Phosphor Console responsive companion UI ([e80d361](https://github.com/involvex/youtube-music-cli/commit/e80d361c5f3424e908b1f1c53e9abad717734aba))

## [0.0.100](https://github.com/involvex/youtube-music-cli/compare/v0.0.99...v0.0.100) (2026-07-25)

### Features

- add live streams view and queue/history UX ([42a563f](https://github.com/involvex/youtube-music-cli/commit/42a563fda12e68ea3d8002e0fc11f88d207f25d9))

## [0.0.99](https://github.com/involvex/youtube-music-cli/compare/v0.0.97...v0.0.99) (2026-07-18)

### Bug Fixes

- reconnect mpv IPC when UI and playback desync ([c277e3b](https://github.com/involvex/youtube-music-cli/commit/c277e3bb033418de53b32b5b631ca74dbfc568d1))
- restore downloads via yt-dlp/youtubei and improve download UX ([9ce89ba](https://github.com/involvex/youtube-music-cli/commit/9ce89bab3462d4ced2bf868269c17e2115341b54))

### Features

- enrich radio streams with Radio Browser, metadata, and favorites ([ca3f29d](https://github.com/involvex/youtube-music-cli/commit/ca3f29db08a222c3899963ffae75f7498abb9498))

## [0.0.97](https://github.com/involvex/youtube-music-cli/compare/v0.0.96...v0.0.97) (2026-07-16)

### Bug Fixes

- link binaries from libexec/bin to Homebrew prefix bin ([4d1706f](https://github.com/involvex/youtube-music-cli/commit/4d1706f72dfd6e886585b7933fd50f7181d1643a))
- **player:** await in-flight IPC connection in resume() to prevent track restart ([95acc49](https://github.com/involvex/youtube-music-cli/commit/95acc4994825712ad4a88ac8a8987cf3edad9aec))
- **player:** cover IPC delay window and abort stale resume awaits ([9765a9c](https://github.com/involvex/youtube-music-cli/commit/9765a9c8c3c9f5cf12a2c260cffe67f3ec5fe8ea))
- symlink all Homebrew libexec binaries with Dir glob ([1726aaa](https://github.com/involvex/youtube-music-cli/commit/1726aaa2c4c1183992795631d2407266510d5d89))

### Features

- add internet radio streams view for Ink TUI and immersive mode ([5febede](https://github.com/involvex/youtube-music-cli/commit/5febedea32fb42392da17ad83a0ea463c4db22a3))

## [0.0.96](https://github.com/involvex/youtube-music-cli/compare/v0.0.95...v0.0.96) (2026-07-13)

### Bug Fixes

- prevent infinite loop on unavailable tracks, fix playlist name resolution, add proxy support, and reduce suggestion API calls ([eaa4727](https://github.com/involvex/youtube-music-cli/commit/eaa47277c35796489a35262a0e16386d34cbaabe))

## [0.0.95](https://github.com/involvex/youtube-music-cli/compare/v0.0.94...v0.0.95) (2026-07-13)

### Bug Fixes

- **static-file-service:** correct path traversal validation in resolveSafeFilePath ([4aa17d3](https://github.com/involvex/youtube-music-cli/commit/4aa17d3dbd3f77b72cff8fa8d8da240e3ab0cf4e))

### Features

- add logs and config doctor CLI commands ([2d08033](https://github.com/involvex/youtube-music-cli/commit/2d08033ea6f44c40be26292c0fd9d928130359f7))

## [0.0.94](https://github.com/involvex/youtube-music-cli/compare/v0.0.93...v0.0.94) (2026-07-02)

### Features

- **immersive:** Spotify-like infinite autoplay for Win32 ([125b4bf](https://github.com/involvex/youtube-music-cli/commit/125b4bf2af97cc1a0bedf6e674cf501e608fa009))
- **immersive:** Win32 library favorites, playlist edit, and add-to-playlist ([d0791ef](https://github.com/involvex/youtube-music-cli/commit/d0791eff14526bf77791fe392ebff1633753057f))

## [0.0.93](https://github.com/involvex/youtube-music-cli/compare/v0.0.92...v0.0.93) (2026-07-01)

### Features

- **immersive:** add Spotify-like autoplay for Win32 mode ([cc19e04](https://github.com/involvex/youtube-music-cli/commit/cc19e04ce440c1b1b0bc7641148b7e356eaeadc2))

## [0.0.92](https://github.com/involvex/youtube-music-cli/compare/v0.0.91...v0.0.92) (2026-06-30)

### Bug Fixes

- **immersive:** keep favorites queue playing with shuffle and repeat-all ([fe7e133](https://github.com/involvex/youtube-music-cli/commit/fe7e133ac918fba76b23853a8c20908ef7b4f4b4))

## [0.0.91](https://github.com/involvex/youtube-music-cli/compare/v0.0.90...v0.0.91) (2026-06-29)

### Bug Fixes

- **immersive:** align mpv playback sync with Ink TUI ([f1e9ff4](https://github.com/involvex/youtube-music-cli/commit/f1e9ff4303cc9654f4ccac71ccf459497bb9a791))

## [0.0.90](https://github.com/involvex/youtube-music-cli/compare/v0.0.89...v0.0.90) (2026-06-29)

### Bug Fixes

- **favorites:** stop tests from wiping user favorites.json ([10f6c9d](https://github.com/involvex/youtube-music-cli/commit/10f6c9d1fad4918a3926e5b29ce33e3186b70317))
- **immersive:** auto-advance queue without pausing between tracks ([f19b4f8](https://github.com/involvex/youtube-music-cli/commit/f19b4f86294c2a2eca7d27dbafaedd4cf097229c))
- **player:** restore playback when subtitles enabled with mpv 0.41+ ([53d17cd](https://github.com/involvex/youtube-music-cli/commit/53d17cd92d1b2e017f726b24944fb0807db6adff))

## [0.0.89](https://github.com/involvex/youtube-music-cli/compare/v0.0.88...v0.0.89) (2026-06-29)

### Bug Fixes

- resolve mpv IPC crashes and unify favorites persistence ([d390f17](https://github.com/involvex/youtube-music-cli/commit/d390f170cad21a026b575a83ee8d24d9723d984c))

## [0.0.88](https://github.com/involvex/youtube-music-cli/compare/v0.0.87...v0.0.88) (2026-06-29)

### Features

- **immersive:** TUI volume keys and tray context menu ([ab8e070](https://github.com/involvex/youtube-music-cli/commit/ab8e070f793060b4e190826e7932c8e42be6332d))

## [0.0.87](https://github.com/involvex/youtube-music-cli/compare/v0.0.86...v0.0.87) (2026-06-27)

## [0.0.86](https://github.com/involvex/youtube-music-cli/compare/v0.0.85...v0.0.86) (2026-06-27)

## [0.0.85](https://github.com/involvex/youtube-music-cli/compare/v0.0.84...v0.0.85) (2026-06-27)

## [0.0.84](https://github.com/involvex/youtube-music-cli/compare/v0.0.83...v0.0.84) (2026-06-27)

## [0.0.83](https://github.com/involvex/youtube-music-cli/compare/v0.0.82...v0.0.83) (2026-06-27)

### Bug Fixes

- **immersive:** rewrite as plain Node.js class to fix black screen ([cf8e16b](https://github.com/involvex/youtube-music-cli/commit/cf8e16b2490441e2f929b7a9b07dd94666c0a392))

## [0.0.82](https://github.com/involvex/youtube-music-cli/compare/v0.0.80...v0.0.82) (2026-06-23)

### Bug Fixes

- replace jiti with native ESM import for plugin loading ([3a07e7e](https://github.com/involvex/youtube-music-cli/commit/3a07e7eb1cee50ee3b41195fc064b5705930ecc0))

### Features

- **immersive:** add Windows immersive TUI mode with visualizer and disco effects ([31ca503](https://github.com/involvex/youtube-music-cli/commit/31ca5039b3392807be84515614c48db89168be50)), closes [hi#DPI](https://github.com/hi/issues/DPI)

## [0.0.80](https://github.com/involvex/youtube-music-cli/compare/v0.0.79...v0.0.80) (2026-06-19)

### Bug Fixes

- **install:** require bun in install scripts to match runtime dependency ([83e1772](https://github.com/involvex/youtube-music-cli/commit/83e177266739426c619701f0859610464556365e)), closes [#27](https://github.com/involvex/youtube-music-cli/issues/27)

### Features

- add Node.js production build support ([ae8b506](https://github.com/involvex/youtube-music-cli/commit/ae8b50658879b5f99b029065a5d1a52c25cd4fd1))

## [0.0.79](https://github.com/involvex/youtube-music-cli/compare/v0.0.78...v0.0.79) (2026-06-15)

## [0.0.78](https://github.com/involvex/youtube-music-cli/compare/v0.0.77...v0.0.78) (2026-06-06)

## [0.0.77](https://github.com/involvex/youtube-music-cli/compare/v0.0.76...v0.0.77) (2026-05-16)

## [0.0.76](https://github.com/involvex/youtube-music-cli/compare/v0.0.75...v0.0.76) (2026-05-15)

## [0.0.75](https://github.com/involvex/youtube-music-cli/compare/v0.0.74...v0.0.75) (2026-05-02)

### Features

- **settings:** add LLM endpoint and base URL configuration options ([154cfe6](https://github.com/involvex/youtube-music-cli/commit/154cfe68a7d6697e2e1405832459f394168952aa))

## [0.0.74](https://github.com/involvex/youtube-music-cli/compare/v0.0.73...v0.0.74) (2026-04-29)

## [0.0.73](https://github.com/involvex/youtube-music-cli/compare/v0.0.72...v0.0.73) (2026-04-29)

## [0.0.72](https://github.com/involvex/youtube-music-cli/compare/v0.0.71...v0.0.72) (2026-04-28)

## [0.0.71](https://github.com/involvex/youtube-music-cli/compare/v0.0.70...v0.0.71) (2026-04-22)

## [0.0.70](https://github.com/involvex/youtube-music-cli/compare/v0.0.69...v0.0.70) (2026-04-17)

### Bug Fixes

- **web:** correct cross-platform root path validation for static files ([66df09a](https://github.com/involvex/youtube-music-cli/commit/66df09ad8ae639eba6847c66141d5d66d51a8daa))

## [0.0.69](https://github.com/involvex/youtube-music-cli/compare/v0.0.68...v0.0.69) (2026-04-16)

### Features

- Implement full subtitle display feature with config toggle & UI ([479ffb8](https://github.com/involvex/youtube-music-cli/commit/479ffb82bbeb9819bc40e08b4d6110aa8d59c40f))
- Implement full subtitle display feature with config toggle & UI ([6e97b10](https://github.com/involvex/youtube-music-cli/commit/6e97b1040af8260704efe7a901b32611a4572c3a))
- Initialize web frontend workspace and remove unused punycode dependency ([9f36f61](https://github.com/involvex/youtube-music-cli/commit/9f36f61404bb62b9038b5b7fe49e1ef533e37ea5))
- Initialize web frontend workspace and remove unused punycode dependency ([48ebe58](https://github.com/involvex/youtube-music-cli/commit/48ebe580fb3e56a062939cc7877f9c0a736d5d86))

## [0.0.68](https://github.com/involvex/youtube-music-cli/compare/v0.0.66...v0.0.68) (2026-04-16)

## [0.0.66](https://github.com/involvex/youtube-music-cli/compare/v0.0.65...v0.0.66) (2026-04-14)

## [0.0.65](https://github.com/involvex/youtube-music-cli/compare/v0.0.64...v0.0.65) (2026-04-09)

## [0.0.64](https://github.com/involvex/youtube-music-cli/compare/v0.0.63...v0.0.64) (2026-04-02)

### Features

- **ai:** add AI chat assistant with playlist management tools ([fdbebd6](https://github.com/involvex/youtube-music-cli/commit/fdbebd6196738f7766ba313f9b88f00ba4442af1))

## [0.0.63](https://github.com/involvex/youtube-music-cli/compare/v0.0.62...v0.0.63) (2026-03-28)

## [0.0.62](https://github.com/involvex/youtube-music-cli/compare/v0.0.61...v0.0.62) (2026-03-27)

### Bug Fixes

- address review feedback — tests, orphan cleanup, URL logging ([d3aa441](https://github.com/involvex/youtube-music-cli/commit/d3aa441e5e064b8b525561149fd7ed88e89afff8))
- use IPC loadfile instead of CLI arg for URL loading ([a0efa22](https://github.com/involvex/youtube-music-cli/commit/a0efa22c650a8cb5d58db46d6baf9aefeb02be0b))

## [0.0.61](https://github.com/involvex/youtube-music-cli/compare/v0.0.60...v0.0.61) (2026-03-19)

## [0.0.60](https://github.com/involvex/youtube-music-cli/compare/v0.0.59...v0.0.60) (2026-03-19)

### Features

- Favorites Feature Implementation ([793cb4f](https://github.com/involvex/youtube-music-cli/commit/793cb4fbbded37e0388cdb7f548cac8136fb17a5))

## [0.0.59](https://github.com/involvex/youtube-music-cli/compare/v0.0.57...v0.0.59) (2026-03-19)

## [0.0.57](https://github.com/involvex/youtube-music-cli/compare/v0.0.56...v0.0.57) (2026-03-09)

### Bug Fixes

- **autoplay:** prevent infinite skip loop by adding progress and playing guards to track completion effect ([b06de96](https://github.com/involvex/youtube-music-cli/commit/b06de96a76c8fb18481eba33917515e042cdec61))

## [0.0.56](https://github.com/involvex/youtube-music-cli/compare/v0.0.55...v0.0.56) (2026-03-09)

### Bug Fixes

- **autoplay:** robustly trigger next track when suggestions load, ignoring inconsistent isPlaying state ([cd13cd8](https://github.com/involvex/youtube-music-cli/commit/cd13cd80dc57dfd4f672e4fcf5cbc5b01a75bc96))

## [0.0.55](https://github.com/involvex/youtube-music-cli/compare/v0.0.54...v0.0.55) (2026-03-09)

## [0.0.54](https://github.com/involvex/youtube-music-cli/compare/v0.0.53...v0.0.54) (2026-03-09)

### Bug Fixes

- **player:** resolve play() promise immediately to fix stuck loading state and add state saving lock ([204f6b3](https://github.com/involvex/youtube-music-cli/commit/204f6b344c578770f63fc1ef99bf346e634ff468))

## [0.0.53](https://github.com/involvex/youtube-music-cli/compare/v0.0.52...v0.0.53) (2026-03-08)

## [0.0.52](https://github.com/involvex/youtube-music-cli/compare/v0.0.50...v0.0.52) (2026-03-08)

### Features

- **ui:** Add AB Loop feature and keyboard bindings ([fd55b59](https://github.com/involvex/youtube-music-cli/commit/fd55b59bbd9394218ac53cfe2c7c4864621f5fa0))

## [0.0.50](https://github.com/involvex/youtube-music-cli/compare/v0.0.49...v0.0.50) (2026-03-08)

### Features

- **ui:** add genres and new releases navigation ([f0400d2](https://github.com/involvex/youtube-music-cli/commit/f0400d2e2927cddb6fb441d35e37a2903c5de890))

## [0.0.49](https://github.com/involvex/youtube-music-cli/compare/v0.0.48...v0.0.49) (2026-03-08)

### Features

- **cli:** enhance help text with emojis and improve flag handling ([067c6f9](https://github.com/involvex/youtube-music-cli/commit/067c6f926e96a2c43b40fe810e224d8bb6177687))

## [0.0.48](https://github.com/involvex/youtube-music-cli/compare/v0.0.47...v0.0.48) (2026-03-08)

## [0.0.47](https://github.com/involvex/youtube-music-cli/compare/v0.0.46...v0.0.47) (2026-03-07)

## [0.0.46](https://github.com/involvex/youtube-music-cli/compare/v0.0.45...v0.0.46) (2026-02-24)

### Bug Fixes

- keep autoplay running and document completions ([9356c5d](https://github.com/involvex/youtube-music-cli/commit/9356c5db6583cd926a78af15302cdac5bde65aab))

## [0.0.45](https://github.com/involvex/youtube-music-cli/compare/v0.0.44...v0.0.45) (2026-02-24)

### Features

- add volume fade duration setting for smoother playback transitions ([936e3e2](https://github.com/involvex/youtube-music-cli/commit/936e3e2c7ae043b26dd48a1cd6f2d26cb11b0ae2))

## [0.0.44](https://github.com/involvex/youtube-music-cli/compare/v0.0.43...v0.0.44) (2026-02-23)

### Features

- add standalone executable support with build-time versioning ([18f730c](https://github.com/involvex/youtube-music-cli/commit/18f730cef46dfe862cfbce0065af4b4989296ef0))

## [0.0.43](https://github.com/involvex/youtube-music-cli/compare/v0.0.42...v0.0.43) (2026-02-23)

## [0.0.42](https://github.com/involvex/youtube-music-cli/compare/v0.0.41...v0.0.42) (2026-02-23)

## [0.0.41](https://github.com/involvex/youtube-music-cli/compare/v0.0.40...v0.0.41) (2026-02-23)

### Features

- add shell completions for bash, zsh, powershell, and fish ([5adecc3](https://github.com/involvex/youtube-music-cli/commit/5adecc3af1cf6dae5a188c24c598e67c8260c844))

## [0.0.40](https://github.com/involvex/youtube-music-cli/compare/v0.0.39...v0.0.40) (2026-02-23)

### Features

- enable MSIX packaging for Windows distribution ([14eafbf](https://github.com/involvex/youtube-music-cli/commit/14eafbf522f1d2fbacf7ed1243df035cd254891b))

## [0.0.39](https://github.com/involvex/youtube-music-cli/compare/v0.0.38...v0.0.39) (2026-02-23)

### Features

- add visual flash feedback when shortcuts are pressed ([dc3efa8](https://github.com/involvex/youtube-music-cli/commit/dc3efa8f642619ad2e9ce937528e76f4d388e4dc))

## [0.0.38](https://github.com/involvex/youtube-music-cli/compare/v0.0.36...v0.0.38) (2026-02-22)

### Bug Fixes

- **search:** prevent 'q' key from triggering quit when typing in search bar ([32cd888](https://github.com/involvex/youtube-music-cli/commit/32cd888afcabc30d10988491da12c653cb5175d5))

## [0.0.36](https://github.com/involvex/youtube-music-cli/compare/v0.0.35...v0.0.36) (2026-02-22)

### Features

- update Homebrew installation instructions and add Formula for easier macOS installation ([c07fb9e](https://github.com/involvex/youtube-music-cli/commit/c07fb9e6650ddfb193b183bc708ebd495688979a))

## [0.0.35](https://github.com/involvex/youtube-music-cli/compare/v0.0.34...v0.0.35) (2026-02-22)

### Features

- add history layout for recently played tracks ([a33c93c](https://github.com/involvex/youtube-music-cli/commit/a33c93c485e8e0e42a4d233cb60b06f4c08452cb))

## [0.0.34](https://github.com/involvex/youtube-music-cli/compare/v0.0.33...v0.0.34) (2026-02-22)

### Features

- **search:** implement search filters by artist, album, and year ([d3edbe6](https://github.com/involvex/youtube-music-cli/commit/d3edbe6b61fd0afa363e1c19b420d73fd6ebbab7))

## [0.0.33](https://github.com/involvex/youtube-music-cli/compare/v0.0.32...v0.0.33) (2026-02-22)

### Features

- add gapless playback, crossfade, and equalizer settings ([0fe10f4](https://github.com/involvex/youtube-music-cli/commit/0fe10f42700bb9031e4e4c1eacca1bc3aba5ec4d))

## [0.0.32](https://github.com/involvex/youtube-music-cli/compare/v0.0.31...v0.0.32) (2026-02-22)

## [0.0.31](https://github.com/involvex/youtube-music-cli/compare/v0.0.30...v0.0.31) (2026-02-22)

### Bug Fixes

- improve mpv process management and fix EOF/pause race condition ([b5e9786](https://github.com/involvex/youtube-music-cli/commit/b5e9786d99bdc0dc81cd32bef65ac5467c032231))

## [0.0.30](https://github.com/involvex/youtube-music-cli/compare/v0.0.29...v0.0.30) (2026-02-22)

## [0.0.29](https://github.com/involvex/youtube-music-cli/compare/v0.0.28...v0.0.29) (2026-02-22)

### Bug Fixes

- prevent import navigation when in settings view ([d805b5a](https://github.com/involvex/youtube-music-cli/commit/d805b5a182a2241ab5494565dcf6645da82da954))

## [0.0.28](https://github.com/involvex/youtube-music-cli/compare/v0.0.27...v0.0.28) (2026-02-22)

### Bug Fixes

- standardize quote style in snyk_rules.instructions.md ([5906fed](https://github.com/involvex/youtube-music-cli/commit/5906fed587be5f9cd6629281428ef304d8b32749))

## [0.0.27](https://github.com/involvex/youtube-music-cli/compare/v0.0.26...v0.0.27) (2026-02-20)

## [0.0.26](https://github.com/involvex/youtube-music-cli/compare/v0.0.25...v0.0.26) (2026-02-20)

## [0.0.25](https://github.com/involvex/youtube-music-cli/compare/v0.0.24...v0.0.25) (2026-02-20)

### Features

- add Shift+Q/R shortcuts and improve help view navigation ([0d68ad0](https://github.com/involvex/youtube-music-cli/commit/0d68ad0f6aa2e379b164a4b35a452a592e2ae421))

## [0.0.24](https://github.com/involvex/youtube-music-cli/compare/v0.0.23...v0.0.24) (2026-02-20)

### Features

- add YouTube URL support for play command ([c09e411](https://github.com/involvex/youtube-music-cli/commit/c09e411dd36e5670727d3914203c5c66de08457b))

## [0.0.23](https://github.com/involvex/youtube-music-cli/compare/v0.0.22...v0.0.23) (2026-02-20)

## [0.0.22](https://github.com/involvex/youtube-music-cli/compare/v0.0.21...v0.0.22) (2026-02-20)

### Features

- add Homebrew and Winget publish workflows with Snyk security rules ([cff659b](https://github.com/involvex/youtube-music-cli/commit/cff659b2775fd50bb898fbf9b552e0fa413ff0fa))

## [0.0.21](https://github.com/involvex/youtube-music-cli/compare/v0.0.20...v0.0.21) (2026-02-20)

## [0.0.20](https://github.com/involvex/youtube-music-cli/compare/v0.0.19...v0.0.20) (2026-02-20)

### Bug Fixes

- keyboard shortcut conflicts and web UI TypeScript errors ([af01f16](https://github.com/involvex/youtube-music-cli/commit/af01f16a151416c15891e44bb1eee3696a1ddc0e))

## [0.0.19](https://github.com/involvex/youtube-music-cli/compare/v0.0.18...v0.0.19) (2026-02-20)

## [0.0.18](https://github.com/involvex/youtube-music-cli/compare/v0.0.17...v0.0.18) (2026-02-18)

### Bug Fixes

- start playback on shuffle, reset, and next actions ([d57452b](https://github.com/involvex/youtube-music-cli/commit/d57452bc6cf49ba7cdc62910ebadf7a2dea66007))

## [0.0.17](https://github.com/involvex/youtube-music-cli/compare/v0.0.16...v0.0.17) (2026-02-18)

### Features

- **ui:** add playback mode and repeat indicators ([bc499a2](https://github.com/involvex/youtube-music-cli/commit/bc499a2083063d3bda3d4b1b1f1a85d620be9fd1))

## [0.0.16](https://github.com/involvex/youtube-music-cli/compare/v0.0.15...v0.0.16) (2026-02-18)

### Bug Fixes

- correct shuffle hotkey and mpv error handling ([7a08643](https://github.com/involvex/youtube-music-cli/commit/7a0864395b48c8bc1b30d817edc5b2f7cb9c79c6))

### Features

- implement shuffle mode with Shift+S hotkey ([77be9ae](https://github.com/involvex/youtube-music-cli/commit/77be9ae53650dc3bf40a89427fbb1b6eef32683a))

## [0.0.15](https://github.com/involvex/youtube-music-cli/compare/v0.0.14...v0.0.15) (2026-02-18)

### Features

- **ui:** remove escape key from quit keybinding ([df6e794](https://github.com/involvex/youtube-music-cli/commit/df6e794583aa96a1dd27b1ff208f3f1b69249829))

### BREAKING CHANGES

- **ui:** 'escape' no longer quits; use 'q' instead.

## [0.0.14](https://github.com/involvex/youtube-music-cli/compare/v0.0.13...v0.0.14) (2026-02-18)

### Features

- **download:** add download feature with configuration and shortcuts ([a616c4c](https://github.com/involvex/youtube-music-cli/commit/a616c4c2443cb6f7d929268fd08453708255503c))

## [0.0.13](https://github.com/involvex/youtube-music-cli/compare/v0.0.12...v0.0.13) (2026-02-18)

### Features

- **download:** add cover art and improved file organization ([1d48f7d](https://github.com/involvex/youtube-music-cli/commit/1d48f7de3a4787e9341697b4c6f44a50a43e752c))

### BREAKING CHANGES

- **download:** The output file structure has changed from flat directory
  to nested artist/album directories. Existing workflows expecting the old
  structure will need to be updated.

## [0.0.12](https://github.com/involvex/youtube-music-cli/compare/v0.0.11...v0.0.12) (2026-02-18)

## [0.0.11](https://github.com/involvex/youtube-music-cli/compare/v0.0.10...v0.0.11) (2026-02-18)

### Features

- **download:** add track, artist, and playlist downloads ([42298d2](https://github.com/involvex/youtube-music-cli/commit/42298d2fd35ba71ad841f58e140f4c53b3222ed7))

## [0.0.10](https://github.com/involvex/youtube-music-cli/compare/v0.0.9...v0.0.10) (2026-02-18)

### Bug Fixes

- mpv resume not working and double-process on track change ([fd04bda](https://github.com/involvex/youtube-music-cli/commit/fd04bdaa852f366eb92d265415ec18794ea5dfc3))

### Features

- dynamic mix playlist creation from search results ([d019048](https://github.com/involvex/youtube-music-cli/commit/d019048c4450d633003c8026ac43e92a743d87a0))

## [0.0.9](https://github.com/involvex/youtube-music-cli/compare/v0.0.8...v0.0.9) (2026-02-18)

### Features

- **search:** add dynamic mix creation from search results ([0d50231](https://github.com/involvex/youtube-music-cli/commit/0d5023168c73cec9d22dab9808e0fb2f23b5c1cc))

## [0.0.8](https://github.com/involvex/youtube-music-cli/compare/v0.0.7...v0.0.8) (2026-02-18)

### Features

- **ui:** add keyboard blocker to search bar ([ee533fe](https://github.com/involvex/youtube-music-cli/commit/ee533fe716a203d432170e36149389f5bd48d687))

## [0.0.7](https://github.com/involvex/youtube-music-cli/compare/v0.0.6...v0.0.7) (2026-02-18)

### Features

- **ui:** add plugins and enhance playlist management ([83a043c](https://github.com/involvex/youtube-music-cli/commit/83a043c0956da7023ea198468db8bbc2ce3acb0d))

### BREAKING CHANGES

- **ui:** The keybinding for playlists has changed from 'p' to
  'shift+p' to accommodate the new plugins feature.

## [0.0.6](https://github.com/involvex/youtube-music-cli/compare/v0.0.5...v0.0.6) (2026-02-18)

### Features

- **ui:** add playlist creation and artist playback features ([0f50fd2](https://github.com/involvex/youtube-music-cli/commit/0f50fd2eeda0d340aee26b8fa2f7e5f2356d8042))

## [0.0.5](https://github.com/involvex/youtube-music-cli/compare/v0.0.4...v0.0.5) (2026-02-18)

## [0.0.4](https://github.com/involvex/youtube-music-cli/compare/v0.0.3...v0.0.4) (2026-02-18)

### Bug Fixes

- resolve three bugs - discord rpc, search history key, resume ([90c5306](https://github.com/involvex/youtube-music-cli/commit/90c530698f08c355e11d31048844b2e1d6a312ef))
- **youtube:** guard suggestions parsing errors ([aca832e](https://github.com/involvex/youtube-music-cli/commit/aca832e27bb244f8b42b33060f2640f3cc003f7f))

### Features

- **assets:** add new icons and images ([a0d6558](https://github.com/involvex/youtube-music-cli/commit/a0d6558ed2fd42b470e7123eaac5ce0c602db051))

## [0.0.3](https://github.com/involvex/youtube-music-cli/compare/v0.0.2...v0.0.3) (2026-02-18)

### Features

- add playback speed control, new themes, and notifications ([426360a](https://github.com/involvex/youtube-music-cli/commit/426360adfde0a19d7cf9706371f5bc15a4e7640b))

## [0.0.2](https://github.com/involvex/youtube-music-cli/compare/v0.0.1...v0.0.2) (2026-02-18)

## [0.0.1](https://github.com/involvex/youtube-music-cli/compare/32798e7dd129656b9786fc435466203a0c913705...v0.0.1) (2026-02-18)

### Bug Fixes

- **api:** resolve 404 error during search and improve reliability ([c26f80f](https://github.com/involvex/youtube-music-cli/commit/c26f80f3c7f4de075393da7cc378aada8809604a))
- **api:** resolve search runtime error and integrate real streaming ([3c8066c](https://github.com/involvex/youtube-music-cli/commit/3c8066c37386ed6b2d50249cbeec4b30e012960d))
- clear queue when playing from search results to match indices ([272690d](https://github.com/involvex/youtube-music-cli/commit/272690d2f1dd0f81fecfdad4e916f4a6f42392a2))
- **cli:** resolve Ink crash, prevent double instances, and add features ([2dfa274](https://github.com/involvex/youtube-music-cli/commit/2dfa2747a1729037e3f88656579042892aec0b26))
- **cli:** resolve search input issues, terminal auto-scrolling, and UI duplication ([f3898ad](https://github.com/involvex/youtube-music-cli/commit/f3898adde09d244e6705d970ab2c3af75cd7aec7))
- **cli:** resolve search trigger and improve UI stability ([ccce4b1](https://github.com/involvex/youtube-music-cli/commit/ccce4b1a354432f04e771a7ddd957bd7ec5b8e6d))
- **cli:** resolve terminal flooding, fix search selection, and modernize React imports ([1bdfae3](https://github.com/involvex/youtube-music-cli/commit/1bdfae307ee45cafe722590ed64c5c1fd22322ae))
- **hooks:** resolve memory leak in useKeyboard hook ([94f4d39](https://github.com/involvex/youtube-music-cli/commit/94f4d3974a4ad0a5e609f5cc3003933978fd9008))
- **lint:** disable no-explicit-any for react-hooks plugin in eslint.config.ts ([7a54c2a](https://github.com/involvex/youtube-music-cli/commit/7a54c2ab04dd6dfbfcc80a3c8ec86fdcb66c05c8))
- **lint:** resolve react-hooks/exhaustive-deps error and fix hook bugs ([19cf971](https://github.com/involvex/youtube-music-cli/commit/19cf9712b049e494fba1b86e5e08f37c5f24c91e))
- **security:** implement URL sanitization and resolve linting errors ([adb1d8f](https://github.com/involvex/youtube-music-cli/commit/adb1d8fa02830d470c14912a0c1155441224ec01))
- simplify VOLUME_UP and VOLUME_DOWN keybindings ([571b136](https://github.com/involvex/youtube-music-cli/commit/571b136bfefefc122e9da82ce4e615d3d576b9e3))
- **ui:** refine help display, fix help nav, and update key hints ([adb8afb](https://github.com/involvex/youtube-music-cli/commit/adb8afbba95c1495431502d9049e67bac10295a4))

### Features

- add .gemini agent config for CLI UI design ([e27269e](https://github.com/involvex/youtube-music-cli/commit/e27269e88bd73a23bf668ef1374f4525d06a69bd))
- add @distube/ytdl-core dependency for YouTube downloading ([da5a8a7](https://github.com/involvex/youtube-music-cli/commit/da5a8a70cf4d65ff90dff3e7956c5d4e72740b7d))
- add compile script for building standalone executable ([ce3d731](https://github.com/involvex/youtube-music-cli/commit/ce3d7314e42f852b4c05eb8436463a1572ef6ed0))
- add config screen with keyboard navigation ([f9566cd](https://github.com/involvex/youtube-music-cli/commit/f9566cdd4f4818b158ecc5c45dae73b2af544f44))
- add Help component for keyboard shortcuts display ([32798e7](https://github.com/involvex/youtube-music-cli/commit/32798e7dd129656b9786fc435466203a0c913705))
- add player state persistence and npm publish workflow ([df7e5ce](https://github.com/involvex/youtube-music-cli/commit/df7e5ce10d13406ec0e284ff91ab8d1c38c23084))
- add plugin system API docs, templates, and context provider ([06392dc](https://github.com/involvex/youtube-music-cli/commit/06392dc95253fe90ddfc77d0bfbb0455b517fff6))
- add plugin system infrastructure and improve navigation ([626ada6](https://github.com/involvex/youtube-music-cli/commit/626ada679d530b66733ad58a553e72bd7b94755a))
- add react-devtools-core dependency and bun build script ([44a2a90](https://github.com/involvex/youtube-music-cli/commit/44a2a90a6c738d3bc4637bccf0d8513b2967c363))
- add ShortcutsBar component and prevent duplicate track playback ([af1fe32](https://github.com/involvex/youtube-music-cli/commit/af1fe32c42a49ba3ac12bb5e081dcfb31b5771c6))
- **cli:** fix search typing, add headless mode and control commands ([506653d](https://github.com/involvex/youtube-music-cli/commit/506653d5e1e7098a87002f039a7051f7f8e7ce76))
- **layouts:** optimize components with React.memo and responsive padding ([924991c](https://github.com/involvex/youtube-music-cli/commit/924991cc85ae7c96f38760ecce139e58175af8d1))
- migrate audio player from play-sound to mpv ([ac1aeb3](https://github.com/involvex/youtube-music-cli/commit/ac1aeb3652ec49a5e74c0519d41055e715eb4499))
- move PlayerControls to MainLayout for global key bindings ([4190bf0](https://github.com/involvex/youtube-music-cli/commit/4190bf0393a4f1c8602d0603a953b36d4351d89d))
- **player:** Add IPC-based player event monitoring for mpv ([5a40ab0](https://github.com/involvex/youtube-music-cli/commit/5a40ab06679adf6569914075440dce833f1c1226))
- **ui:** implement responsive layout, adjustable search limit, and fix search navigation ([78150d6](https://github.com/involvex/youtube-music-cli/commit/78150d675746879cce2d329333009cd8cfe8cc4d))

### Performance Improvements

- **cli:** optimize UI rendering and fix search result selection ([17e9f7e](https://github.com/involvex/youtube-music-cli/commit/17e9f7efc07980852fa7b1c45e002b2abd93cfd8))
- memoize view components and remove redundant useEffect in SearchResults ([9b90902](https://github.com/involvex/youtube-music-cli/commit/9b90902d27416df0ca5bd2854e5afb46ab24b128))
- throttle progress updates and fix exit handler stale closure ([162b732](https://github.com/involvex/youtube-music-cli/commit/162b73292fb21a3eae2cf998a8a02dbb0adc5446))
