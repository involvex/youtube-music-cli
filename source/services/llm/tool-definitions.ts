// Tool definitions for Gemini function calling
import type { ToolDefinition } from "../../types/llm.types.ts";

export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "search_tracks",
      description: "Search for tracks on YouTube Music",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for tracks" },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 10)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get_track_info",
      description: "Get detailed information about a track",
      parameters: {
        type: "object",
        properties: {
          videoId: { type: "string", description: "YouTube video ID" },
        },
        required: ["videoId"],
      },
    },
    {
      name: "get_playlist",
      description: "Get details of a playlist",
      parameters: {
        type: "object",
        properties: {
          playlistId: { type: "string", description: "YouTube playlist ID" },
        },
        required: ["playlistId"],
      },
    },
    {
      name: "create_playlist",
      description: "Create a new playlist",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Playlist name" },
          trackIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of YouTube video IDs to add",
          },
        },
        required: ["name", "trackIds"],
      },
    },
    {
      name: "add_to_playlist",
      description: "Add tracks to an existing playlist",
      parameters: {
        type: "object",
        properties: {
          playlistId: { type: "string", description: "Playlist ID" },
          trackIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of YouTube video IDs to add",
          },
        },
        required: ["playlistId", "trackIds"],
      },
    },
    {
      name: "get_user_playlists",
      description: "Get all user playlists",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_queue",
      description: "Get the current play queue",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "add_to_queue",
      description: "Add tracks to the play queue",
      parameters: {
        type: "object",
        properties: {
          trackIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of YouTube video IDs to add to queue",
          },
        },
        required: ["trackIds"],
      },
    },
    {
      name: "get_suggestions",
      description: "Get track suggestions based on a track",
      parameters: {
        type: "object",
        properties: {
          videoId: { type: "string", description: "YouTube video ID" },
        },
        required: ["videoId"],
      },
    },
    {
      name: "get_user_favorites",
      description: "Get user favorite tracks",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "start_radio",
      description:
        "Start a radio station based on a track, artist, or playlist. Generates an endless queue of related tracks.",
      parameters: {
        type: "object",
        properties: {
          seedType: {
            type: "string",
            description: "Type of seed: track, artist, playlist, or genre",
          },
          seedId: {
            type: "string",
            description:
              "YouTube video ID, channel ID, playlist ID, or genre browse ID",
          },
          seedName: {
            type: "string",
            description: "Display name for the radio seed",
          },
        },
        required: ["seedType", "seedId", "seedName"],
      },
    },
    {
      name: "stop_radio",
      description:
        "Stop the current radio station and return to normal queue mode",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "generate_playlist",
      description:
        "Generate a playlist of tracks matching a mood, genre, or description. Searches YouTube Music for tracks matching the description and can add them to the queue or create a new playlist.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description:
              'Natural language description of the desired playlist (e.g., "relaxing morning jazz", "energetic workout tracks", "sad indie songs for raining")',
          },
          trackCount: {
            type: "number",
            description: "Number of tracks to include (default 20, max 50)",
          },
          mode: {
            type: "string",
            description:
              "Action to take: queue adds to play queue, playlist creates a new playlist, both does both. Default is queue.",
          },
        },
        required: ["description"],
      },
    },
  ];
}
