declare module 'play-sound' {
	function play(
		file: string,
		callback?: (err: Error) => void,
	): {kill: () => void};

	export = play;
}
