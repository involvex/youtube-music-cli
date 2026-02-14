// Playlist management hook
import {getConfigService} from '../services/config/config.service';
import type {Playlist, Track} from '../types/youtube-music.types';
import {useState, useCallback, useEffect} from 'react';

export function usePlaylist() {
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const configService = getConfigService();

	useEffect(() => {
		setPlaylists(configService.get('playlists'));
	}, []);

	const createPlaylist = useCallback(
		(name: string) => {
			const newPlaylist: Playlist = {
				playlistId: Date.now().toString(),
				name,
				tracks: [],
			};

			const updatedPlaylists = [...playlists, newPlaylist];
			setPlaylists(updatedPlaylists);
			configService.set('playlists', updatedPlaylists);
		},
		[playlists, configService],
	);

	const deletePlaylist = useCallback(
		(playlistId: string) => {
			const updatedPlaylists = playlists.filter(
				p => p.playlistId !== playlistId,
			);
			setPlaylists(updatedPlaylists);
			configService.set('playlists', updatedPlaylists);
		},
		[playlists, configService],
	);

	const addTrackToPlaylist = useCallback(
		(playlistId: string, track: Track) => {
			const playlistIndex = playlists.findIndex(
				p => p.playlistId === playlistId,
			);
			if (playlistIndex === -1) return;

			const updatedPlaylists = [...playlists];
			updatedPlaylists[playlistIndex]!.tracks.push(track);

			setPlaylists(updatedPlaylists);
			configService.set('playlists', updatedPlaylists);
		},
		[playlists, configService],
	);

	const removeTrackFromPlaylist = useCallback(
		(playlistId: string, trackIndex: number) => {
			const playlistIndex = playlists.findIndex(
				p => p.playlistId === playlistId,
			);
			if (playlistIndex === -1) return;

			const updatedPlaylists = [...playlists];
			updatedPlaylists[playlistIndex]!.tracks.splice(trackIndex, 1);

			setPlaylists(updatedPlaylists);
			configService.set('playlists', updatedPlaylists);
		},
		[playlists, configService],
	);

	return {
		playlists,
		createPlaylist,
		deletePlaylist,
		addTrackToPlaylist,
		removeTrackFromPlaylist,
	};
}
