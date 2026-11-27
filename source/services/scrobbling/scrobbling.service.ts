// Scrobbling service — supports Last.fm and ListenBrainz
import { createHash } from "node:crypto";

import { logger } from "../logger/logger.service.ts";

interface TrackInfo {
  title: string;
  artist: string;
  duration: number; // seconds
}

// ---------- Last.fm ----------

async function lastfmScrobble(
  title: string,
  artist: string,
  timestamp: number,
  apiKey: string,
  sessionKey: string,
): Promise<void> {
  const params: Record<string, string> = {
    method: "track.scrobble",
    artist,
    track: title,
    timestamp: String(timestamp),
    api_key: apiKey,
    sk: sessionKey,
  };

  const secret = ""; // User must provide shared secret if using real auth
  const sig = buildLastfmSignature(params, secret);
  params["api_sig"] = sig;
  params["format"] = "json";

  const body = new URLSearchParams(params);
  const response = await fetch("https://ws.audioscrobbler.com/2.0/", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error(`Last.fm scrobble failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { error?: number; message?: string };
  if (data.error) {
    throw new Error(`Last.fm error ${data.error}: ${data.message}`);
  }

  logger.info("ScrobblingService", "Last.fm scrobble successful", {
    title,
    artist,
  });
}

function buildLastfmSignature(
  params: Record<string, string>,
  secret: string,
): string {
  const sorted = Object.keys(params)
    .filter(k => k !== "format" && k !== "callback")
    .sort()
    .map(k => `${k}${params[k]}`)
    .join("");
  return createHash("sha256")
    .update(sorted + secret)
    .digest("hex");
}

// ---------- ListenBrainz ----------

async function listenbrainzScrobble(
  title: string,
  artist: string,
  listenedAt: number,
  token: string,
): Promise<void> {
  const payload = {
    listen_type: "single",
    payload: [
      {
        listened_at: listenedAt,
        track_metadata: {
          artist_name: artist,
          track_name: title,
        },
      },
    ],
  };

  const response = await fetch(
    "https://api.listenbrainz.org/1/submit-listens",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`ListenBrainz scrobble failed: HTTP ${response.status}`);
  }

  logger.info("ScrobblingService", "ListenBrainz scrobble successful", {
    title,
    artist,
  });
}

// ---------- Main service ----------

export class ScrobblingService {
  private lastfmApiKey?: string;
  private lastfmSessionKey?: string;
  private listenbrainzToken?: string;

  configure(config: {
    lastfm?: { apiKey?: string; sessionKey?: string };
    listenbrainz?: { token?: string };
  }): void {
    this.lastfmApiKey = config.lastfm?.apiKey;
    this.lastfmSessionKey = config.lastfm?.sessionKey;
    this.listenbrainzToken = config.listenbrainz?.token;
  }

  get isEnabled(): boolean {
    return Boolean(
      (this.lastfmApiKey && this.lastfmSessionKey) || this.listenbrainzToken,
    );
  }

  async scrobble(track: TrackInfo): Promise<void> {
    if (!this.isEnabled) return;

    const timestamp = Math.floor(Date.now() / 1000);

    const tasks: Array<Promise<void>> = [];

    if (this.lastfmApiKey && this.lastfmSessionKey) {
      tasks.push(
        lastfmScrobble(
          track.title,
          track.artist,
          timestamp,
          this.lastfmApiKey,
          this.lastfmSessionKey,
        ).catch(error => {
          logger.error("ScrobblingService", "Last.fm scrobble failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      );
    }

    if (this.listenbrainzToken) {
      tasks.push(
        listenbrainzScrobble(
          track.title,
          track.artist,
          timestamp,
          this.listenbrainzToken,
        ).catch(error => {
          logger.error("ScrobblingService", "ListenBrainz scrobble failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      );
    }

    await Promise.all(tasks);
  }
}

let instance: ScrobblingService | null = null;
export const getScrobblingService = (): ScrobblingService => {
  if (!instance) instance = new ScrobblingService();
  return instance;
};
