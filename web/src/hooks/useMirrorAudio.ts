import {useCallback, useEffect, useRef, useState} from 'react';
import type {RadioStation, Track} from '../types';

const MUTE_STORAGE_KEY = 'ymc-browser-audio-muted';

function readStoredMute(): boolean {
	try {
		return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function writeStoredMute(muted: boolean): void {
	try {
		localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
	} catch {
		// Ignore quota / private mode
	}
}

function buildAudioSrc(
	playbackMode: string | undefined,
	currentTrack: Track | null,
	currentStation: RadioStation | null,
): string | null {
	if (playbackMode === 'stream' && currentStation?.streamUrl) {
		return `/audio?url=${encodeURIComponent(currentStation.streamUrl)}`;
	}
	if (currentTrack?.videoId) {
		return `/audio?videoId=${encodeURIComponent(currentTrack.videoId)}`;
	}
	return null;
}

export function useMirrorAudio(options: {
	isPlaying: boolean;
	progress: number;
	currentTrack: Track | null;
	currentStation: RadioStation | null;
	playbackMode?: string;
}): {
	isBrowserMuted: boolean;
	toggleBrowserMute: () => void;
	audioError: string | null;
} {
	const {isPlaying, progress, currentTrack, currentStation, playbackMode} =
		options;
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const lastSrcRef = useRef<string | null>(null);
	const lastSeekAtRef = useRef(0);
	const [isBrowserMuted, setIsBrowserMuted] = useState(readStoredMute);
	const [audioError, setAudioError] = useState<string | null>(null);

	useEffect(() => {
		const audio = new Audio();
		audio.preload = 'auto';
		audio.muted = readStoredMute();
		audioRef.current = audio;

		const onError = () => {
			setAudioError('Browser audio unavailable for this track');
		};
		const onPlaying = () => {
			setAudioError(null);
		};
		audio.addEventListener('error', onError);
		audio.addEventListener('playing', onPlaying);

		return () => {
			audio.pause();
			audio.removeAttribute('src');
			audio.load();
			audio.removeEventListener('error', onError);
			audio.removeEventListener('playing', onPlaying);
			audioRef.current = null;
		};
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}
		audio.muted = isBrowserMuted;
	}, [isBrowserMuted]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		const nextSrc = buildAudioSrc(playbackMode, currentTrack, currentStation);
		if (!nextSrc) {
			audio.pause();
			audio.removeAttribute('src');
			lastSrcRef.current = null;
			return;
		}

		if (lastSrcRef.current !== nextSrc) {
			lastSrcRef.current = nextSrc;
			audio.src = nextSrc;
			audio.load();
			setAudioError(null);
		}

		if (isPlaying) {
			void audio.play().catch(() => {
				setAudioError('Tap play to enable browser audio');
			});
		} else {
			audio.pause();
		}
	}, [currentTrack, currentStation, playbackMode, isPlaying]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(progress) || playbackMode === 'stream') {
			return;
		}
		const drift = Math.abs((audio.currentTime || 0) - progress);
		const now = Date.now();
		// Soft sync when browser drifts > 2.5s from mpv (avoid seek thrash)
		if (drift > 2.5 && now - lastSeekAtRef.current > 1500) {
			try {
				audio.currentTime = Math.max(0, progress);
				lastSeekAtRef.current = now;
			} catch {
				// Ignore seek failures during load
			}
		}
	}, [progress, playbackMode]);

	const toggleBrowserMute = useCallback(() => {
		setIsBrowserMuted(prev => {
			const next = !prev;
			writeStoredMute(next);
			return next;
		});
	}, []);

	return {isBrowserMuted, toggleBrowserMute, audioError};
}
