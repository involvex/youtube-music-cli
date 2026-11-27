import { useCallback, useEffect, useState } from "react";

// Playlist management hook
import { getConfigService } from "../services/config/config.service.ts";
import type { Playlist, Track } from "../types/youtube-music.types.ts";

export type AddTrackResult = "added" | "duplicate";

export function usePlaylist() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const configService = getConfigService();

  useEffect(() => {
    setPlaylists(configService.get("playlists"));
  }, []);

  const createPlaylist = useCallback(
    (name: string, tracks: Track[] = []) => {
      const newPlaylist: Playlist = {
        playlistId: Date.now().toString(),
        name,
        tracks: tracks.map(track => ({ ...track })),
      };

      const updatedPlaylists = [...playlists, newPlaylist];
      setPlaylists(updatedPlaylists);
      configService.set("playlists", updatedPlaylists);
      return newPlaylist;
    },
    [playlists, configService],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      const updatedPlaylists = playlists.filter(
        p => p.playlistId !== playlistId,
      );
      setPlaylists(updatedPlaylists);
      configService.set("playlists", updatedPlaylists);
    },
    [playlists, configService],
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, track: Track, force = false): AddTrackResult => {
      const playlistIndex = playlists.findIndex(
        p => p.playlistId === playlistId,
      );
      if (playlistIndex === -1) return "added";

      const playlist = playlists[playlistIndex]!;
      const isDuplicate = playlist.tracks.some(
        t => t.videoId === track.videoId,
      );

      if (isDuplicate && !force) {
        return "duplicate";
      }

      const updatedPlaylists = [...playlists];
      updatedPlaylists[playlistIndex]!.tracks.push(track);

      setPlaylists(updatedPlaylists);
      configService.set("playlists", updatedPlaylists);
      return "added";
    },
    [playlists, configService],
  );

  const renamePlaylist = useCallback(
    (playlistId: string, newName: string) => {
      const updatedPlaylists = playlists.map(playlist =>
        playlist.playlistId === playlistId
          ? { ...playlist, name: newName }
          : playlist,
      );
      setPlaylists(updatedPlaylists);
      configService.set("playlists", updatedPlaylists);
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
      configService.set("playlists", updatedPlaylists);
    },
    [playlists, configService],
  );

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  };
}
