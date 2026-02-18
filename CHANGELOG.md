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
