import {
	Infinity as InfinityIcon,
	Loader2,
	Pause,
	Play,
	Repeat,
	Shuffle,
	SkipBack,
	SkipForward,
	Volume2,
	VolumeX,
} from 'lucide-react';

export interface TransportProps {
	isPlaying: boolean;
	isLoading: boolean;
	shuffle: boolean;
	repeat: 'off' | 'all' | 'one';
	autoplay: boolean;
	isBrowserMuted?: boolean;
	onPlayPause: () => void;
	onNext: () => void;
	onPrevious: () => void;
	onToggleShuffle: () => void;
	onToggleRepeat: () => void;
	onToggleAutoplay: () => void;
	onToggleBrowserMute?: () => void;
}

export default function Transport({
	isPlaying,
	isLoading,
	shuffle,
	repeat,
	autoplay,
	isBrowserMuted = false,
	onPlayPause,
	onNext,
	onPrevious,
	onToggleShuffle,
	onToggleRepeat,
	onToggleAutoplay,
	onToggleBrowserMute,
}: TransportProps) {
	const repeatLabel =
		repeat === 'off'
			? 'Repeat: off'
			: repeat === 'all'
				? 'Repeat: all'
				: 'Repeat: one';

	return (
		<div className="transport" role="group" aria-label="Playback">
			<button
				type="button"
				className={`transport__btn transport__btn--mode${shuffle ? ' transport__btn--active' : ''}`}
				onClick={onToggleShuffle}
				aria-pressed={shuffle}
				aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
			>
				<Shuffle size={20} aria-hidden />
			</button>

			<button
				type="button"
				className="transport__btn"
				onClick={onPrevious}
				aria-label="Previous track"
			>
				<SkipBack size={22} aria-hidden />
			</button>

			<button
				type="button"
				className="transport__play"
				onClick={onPlayPause}
				disabled={isLoading}
				aria-label={isPlaying ? 'Pause' : 'Play'}
			>
				{isLoading ? (
					<Loader2 size={24} className="spin" aria-hidden />
				) : isPlaying ? (
					<Pause size={24} aria-hidden />
				) : (
					<Play size={24} aria-hidden />
				)}
			</button>

			<button
				type="button"
				className="transport__btn"
				onClick={onNext}
				aria-label="Next track"
			>
				<SkipForward size={22} aria-hidden />
			</button>

			<button
				type="button"
				className={`transport__btn transport__btn--mode${repeat !== 'off' ? ' transport__btn--active' : ''}`}
				onClick={onToggleRepeat}
				aria-label={repeatLabel}
			>
				<Repeat size={20} aria-hidden />
				{repeat === 'one' && <span className="transport__badge">1</span>}
			</button>

			<button
				type="button"
				className={`transport__btn transport__btn--mode${autoplay ? ' transport__btn--active' : ''}`}
				onClick={onToggleAutoplay}
				aria-pressed={autoplay}
				aria-label={autoplay ? 'Autoplay on' : 'Autoplay off'}
			>
				<InfinityIcon size={20} aria-hidden />
			</button>

			{onToggleBrowserMute && (
				<button
					type="button"
					className={`transport__btn transport__btn--mode${isBrowserMuted ? ' transport__btn--active' : ''}`}
					onClick={onToggleBrowserMute}
					aria-pressed={isBrowserMuted}
					aria-label={
						isBrowserMuted ? 'Unmute browser audio' : 'Mute browser audio'
					}
					title={
						isBrowserMuted
							? 'Browser muted (mpv still plays)'
							: 'Mute browser only (mpv still plays)'
					}
				>
					{isBrowserMuted ? (
						<VolumeX size={20} aria-hidden />
					) : (
						<Volume2 size={20} aria-hidden />
					)}
				</button>
			)}
		</div>
	);
}
