// Tool executor for LLM function calls
import type { ToolResult } from "../../types/llm.types.ts";
import type { RadioSeed } from "../../types/radio.types.ts";
import type { Track } from "../../types/youtube-music.types.ts";
import { getConfigService } from "../config/config.service.ts";
import { loadFavorites } from "../favorites/favorites.service.ts";
import { logger } from "../logger/logger.service.ts";
import { getRadioService } from "../radio/radio.service.ts";
import { getMusicService } from "../youtube-music/api.ts";

type ToolArgs = Record<string, unknown>;

export interface ToolExecutorContext {
  addToQueue?: (tracks: Track[]) => void;
  playTracks?: (tracks: Track[]) => void;
  createPlaylist?: (name: string, tracks: Track[]) => string | null;
  getQueue?: () => Track[];
}

export async function executeTool(
  toolName: string,
  args: ToolArgs,
  context?: ToolExecutorContext,
): Promise<ToolResult> {
  const musicService = getMusicService();
  const configService = getConfigService();

  try {
    switch (toolName) {
      case "search_tracks": {
        const query = String(args["query"] || "");
        const limit = Number(args["limit"]) || 10;
        const response = await musicService.search(query, {
          type: "songs",
          limit,
        });
        const tracks = response.results
          .filter(r => r.type === "song")
          .map(r => ({
            id: (r.data as { videoId: string }).videoId,
            title: (r.data as { title: string }).title,
            artist: (
              r.data as {
                artists: Array<{ name: string }>;
              }
            ).artists[0]?.name,
          }));
        return { success: true, data: tracks };
      }

      case "get_track_info": {
        const videoId = String(args["videoId"]);
        const track = await musicService.getTrack(videoId);
        if (!track) {
          return { success: false, error: "Track not found" };
        }
        return {
          success: true,
          data: {
            videoId: track.videoId,
            title: track.title,
            artists: track.artists.map(a => a.name),
            duration: track.duration,
          },
        };
      }

      case "get_playlist": {
        const playlistId = String(args["playlistId"] || "");
        const playlist = await musicService.getPlaylist(playlistId);
        return {
          success: true,
          data: {
            id: playlist.playlistId,
            name: playlist.name,
            trackCount: playlist.tracks.length,
            tracks: playlist.tracks.map(t => ({
              id: t.videoId,
              title: t.title,
              artist: t.artists[0]?.name,
            })),
          },
        };
      }

      case "create_playlist": {
        const name = String(args["name"] || "");
        const trackIds = (args["trackIds"] as string[]) || [];

        if (context?.createPlaylist) {
          const tracks = await resolveTracks(musicService, trackIds);
          const playlistId = context.createPlaylist(name, tracks);
          return {
            success: true,
            data: {
              playlistId,
              name,
              trackCount: tracks.length,
            },
          };
        }

        const currentPlaylists = configService.get("playlists") || [];
        const newPlaylist = {
          playlistId: `local-${Date.now()}`,
          name,
          tracks: trackIds.map(id => ({
            videoId: id,
            title: "Unknown",
            artists: [],
          })),
        };
        currentPlaylists.push(newPlaylist);
        configService.set("playlists", currentPlaylists);
        logger.info("LLMToolExecutor", "Created playlist", {
          name,
          trackCount: trackIds.length,
        });
        return {
          success: true,
          data: { playlistId: newPlaylist.playlistId, name },
        };
      }

      case "add_to_playlist": {
        const playlistId = String(args["playlistId"] || "");
        const trackIds = (args["trackIds"] as string[]) || [];
        const currentPlaylists = configService.get("playlists") || [];
        const playlistIndex = currentPlaylists.findIndex(
          (p: { playlistId: string }) => p.playlistId === playlistId,
        );
        if (playlistIndex === -1) {
          return { success: false, error: "Playlist not found" };
        }
        const playlist = currentPlaylists[playlistIndex];
        if (!playlist) {
          return { success: false, error: "Playlist not found" };
        }
        const existingTracks = playlist.tracks || [];
        const newTracks = trackIds.map(id => ({
          videoId: id,
          title: "Unknown",
          artists: [],
        }));
        playlist.tracks = [...existingTracks, ...newTracks];
        configService.set("playlists", currentPlaylists);
        logger.info("LLMToolExecutor", "Added to playlist", {
          playlistId,
          count: trackIds.length,
        });
        return { success: true, data: { added: trackIds.length } };
      }

      case "get_user_playlists": {
        const playlists = configService.get("playlists") || [];
        return {
          success: true,
          data: playlists.map((p: { playlistId: string; name: string }) => ({
            id: p.playlistId,
            name: p.name,
          })),
        };
      }

      case "get_queue": {
        if (context?.getQueue) {
          const queue = context.getQueue();
          return {
            success: true,
            data: {
              tracks: queue.map(t => ({
                id: t.videoId,
                title: t.title,
                artist: t.artists[0]?.name,
              })),
              length: queue.length,
            },
          };
        }
        return {
          success: true,
          data: { message: "Use add_to_queue to add tracks" },
        };
      }

      case "add_to_queue": {
        const trackIds = (args["trackIds"] as string[]) || [];

        if (context?.addToQueue) {
          const tracks = await resolveTracks(musicService, trackIds);
          context.addToQueue(tracks);
          return {
            success: true,
            data: {
              message: `Added ${tracks.length} tracks to queue`,
              trackIds,
            },
          };
        }

        return {
          success: true,
          data: {
            message: `Queued ${trackIds.length} track IDs (queue dispatch not available)`,
            trackIds,
          },
        };
      }

      case "get_suggestions": {
        const videoId = String(args["videoId"] || "");
        const suggestions = await musicService.getSuggestions(videoId);
        return {
          success: true,
          data: suggestions.map(t => ({
            id: t.videoId,
            title: t.title,
            artist: t.artists[0]?.name,
          })),
        };
      }

      case "get_user_favorites": {
        const favorites = await loadFavorites();
        return {
          success: true,
          data: {
            favorites: favorites.map(track => ({
              id: track.videoId,
              title: track.title,
              artist: track.artists[0]?.name,
            })),
          },
        };
      }

      case "start_radio": {
        const seedType = String(args["seedType"] || "track") as
          "track" | "artist" | "playlist" | "genre" | "mood";
        const seedId = String(args["seedId"] || "");
        const seedName = String(args["seedName"] || "");
        if (!seedId) {
          return { success: false, error: "seedId is required" };
        }

        if (context?.playTracks) {
          const seed: RadioSeed = {
            type: seedType,
            id: seedId,
            name: seedName,
          };
          const radioService = getRadioService();
          const tracks = await radioService.fetchTracksForSeed(seed);
          if (tracks.length > 0) {
            context.playTracks(tracks);
          }
        }

        return {
          success: true,
          data: {
            message: `Radio started from ${seedType}: ${seedName}`,
            seedType,
            seedId,
            seedName,
          },
        };
      }

      case "stop_radio": {
        return {
          success: true,
          data: { message: "Radio stopped" },
        };
      }

      case "generate_playlist": {
        const description = String(args["description"] || "");
        const trackCount = Math.min(
          50,
          Math.max(1, Number(args["trackCount"]) || 20),
        );
        const mode = (String(args["mode"]) || "queue") as
          "queue" | "playlist" | "both";

        const searchResults = await musicService.search(description, {
          type: "songs",
          limit: trackCount * 2,
        });
        const tracks = searchResults.results
          .filter(r => r.type === "song")
          .map(r => r.data as Track)
          .slice(0, trackCount);

        if (tracks.length === 0) {
          return {
            success: false,
            error: "No tracks found matching that description",
          };
        }

        let playlistId: string | null = null;

        if (mode === "playlist" || mode === "both") {
          if (context?.createPlaylist) {
            playlistId = context.createPlaylist(`AI: ${description}`, tracks);
          } else {
            const currentPlaylists = configService.get("playlists") || [];
            const newPlaylist = {
              playlistId: `ai-${Date.now()}`,
              name: `AI: ${description}`,
              tracks: tracks.map(t => ({
                videoId: t.videoId,
                title: t.title,
                artists: t.artists,
              })),
            };
            currentPlaylists.push(newPlaylist);
            configService.set("playlists", currentPlaylists);
            playlistId = newPlaylist.playlistId;
          }
        }

        if (mode === "queue" || mode === "both") {
          if (context?.addToQueue) {
            context.addToQueue(tracks);
          }
        }

        return {
          success: true,
          data: {
            playlistName: `AI: ${description}`,
            trackCount: tracks.length,
            tracks: tracks.map(t => ({
              id: t.videoId,
              title: t.title,
              artist: t.artists[0]?.name,
            })),
            playlistId,
          },
        };
      }

      default: {
        return { success: false, error: `Unknown tool: ${toolName}` };
      }
    }
  } catch (error) {
    logger.error("LLMToolExecutor", "Tool execution failed", {
      toolName,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function resolveTracks(
  musicService: ReturnType<typeof getMusicService>,
  trackIds: string[],
): Promise<Track[]> {
  const tracks: Track[] = [];
  for (const id of trackIds) {
    try {
      const track = await musicService.getTrack(id);
      if (track) {
        tracks.push(track);
      }
    } catch {
      // Skip tracks that can't be resolved
    }
  }
  return tracks;
}
