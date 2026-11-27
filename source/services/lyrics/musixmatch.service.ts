// Word-synced ("richsync") lyrics via the Musixmatch desktop API.
// Original MIT implementation; token persisted under CONFIG_DIR.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { CONFIG_DIR } from "../../utils/constants.ts";
import { logger } from "../logger/logger.service.ts";

const TOKEN_FILE = path.join(CONFIG_DIR, "musixmatch-token.json");
const MUSIXMATCH_BASE = "https://apic-desktop.musixmatch.com/ws/1.1";
const APP_ID = "web-desktop-app-v1.0";
const SCHEMA_VERSION = 1;
const TOKEN_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const CAPTCHA_RETRY_DELAY_MS = 3_000;
const MAX_TOKEN_ATTEMPTS = 4;

export interface MusixmatchTokenData {
  usertoken: string;
  cookies: string | null;
  expiresAt: number;
}

export interface PersistedMusixmatchToken {
  schemaVersion: number;
  updatedAt: number;
  usertoken: string;
  cookies?: string | null;
  expiresAt: number;
}

export interface MusixmatchTrackInfo {
  trackId: string;
  commonTrackId: string;
  hasRichsync: boolean;
}

export interface RichsyncWord {
  text: string;
  time: number;
}

export interface RichsyncLine {
  start: number;
  end: number;
  text: string;
  words: RichsyncWord[];
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
};

function isCaptchaResponse(data: unknown): boolean {
  const header = (
    data as { message?: { header?: { status_code?: number; hint?: string } } }
  )?.message?.header;
  return header?.status_code === 401 && header?.hint === "captcha";
}

function extractSetCookies(headers: Headers): string[] {
  const getter = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  const raw =
    typeof getter === "function"
      ? getter.call(headers)
      : [headers.get("set-cookie") ?? ""];
  return raw
    .map(cookie => cookie.split(";")[0] ?? "")
    .filter(part => part.includes("="));
}

function mergeCookies(
  existing: string | undefined,
  additions: string[],
): string | undefined {
  const jar = new Map<string, string>();
  for (const cookie of [
    ...(existing ? existing.split("; ") : []),
    ...additions,
  ]) {
    const separator = cookie.indexOf("=");
    if (separator <= 0) continue;
    jar.set(cookie.slice(0, separator), cookie.slice(separator + 1));
  }
  if (jar.size === 0) return existing;
  return [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function validateMusixmatchTokenFile(
  payload: unknown,
): PersistedMusixmatchToken | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Partial<PersistedMusixmatchToken>;
  if (
    record.schemaVersion !== SCHEMA_VERSION ||
    typeof record.usertoken !== "string" ||
    record.usertoken.length === 0 ||
    typeof record.expiresAt !== "number" ||
    !Number.isFinite(record.expiresAt)
  ) {
    return null;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt:
      typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
    usertoken: record.usertoken,
    cookies:
      typeof record.cookies === "string" && record.cookies.length > 0
        ? record.cookies
        : null,
    expiresAt: record.expiresAt,
  };
}

export function parseMusixmatchSearchPayload(
  payload: unknown,
  trackName: string,
  artistName: string,
): MusixmatchTrackInfo | null {
  const trackList = (
    payload as {
      message?: {
        body?: { track_list?: Array<{ track?: Record<string, unknown> }> };
      };
    }
  )?.message?.body?.track_list;

  if (!Array.isArray(trackList)) return null;

  const wantedArtist = artistName.toLowerCase();
  const wantedTrack = trackName.toLowerCase();

  const toTrackInfo = (
    track: Record<string, unknown>,
  ): MusixmatchTrackInfo | null => {
    const trackId = String(track.track_id ?? "");
    const commonTrackId = String(track.commontrack_id ?? "");
    if (!trackId || !commonTrackId) return null;
    return {
      trackId,
      commonTrackId,
      hasRichsync: track.has_richsync === true || track.has_richsync === 1,
    };
  };

  const candidates: Record<string, unknown>[] = [];
  for (const entry of trackList) {
    const track = entry?.track;
    if (!track) continue;
    candidates.push(track);
  }

  const findMatch = (
    nameMatches: (lowerName: string) => boolean,
  ): MusixmatchTrackInfo | null => {
    for (const track of candidates) {
      const name = typeof track.track_name === "string" ? track.track_name : "";
      if (!nameMatches(name.toLowerCase())) continue;
      const artist =
        typeof track.artist_name === "string" ? track.artist_name : "";
      if (wantedArtist && !artist.toLowerCase().includes(wantedArtist)) {
        continue;
      }
      const info = toTrackInfo(track);
      if (info) return info;
    }
    return null;
  };

  // Prefer exact title matches, then fall back to partial (covers
  // "(Remastered 2016)" style suffixes that survived cleaning).
  return (
    findMatch(name => name === wantedTrack) ??
    findMatch(name => name.includes(wantedTrack))
  );
}

export function parseRichsyncBody(rawBody: string): RichsyncLine[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const lines: RichsyncLine[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;
    const start = raw["ts"];
    const end = raw["te"];
    if (typeof start !== "number" || typeof end !== "number") continue;

    const text = typeof raw["x"] === "string" ? raw["x"] : "";
    const words: RichsyncWord[] = [];
    const wordList = raw["l"];
    if (Array.isArray(wordList)) {
      for (const wordItem of wordList) {
        if (typeof wordItem !== "object" || wordItem === null) continue;
        const rawWord = wordItem as Record<string, unknown>;
        const label = rawWord["c"];
        const offset = rawWord["o"];
        if (typeof label !== "string" || typeof offset !== "number") {
          continue;
        }
        words.push({ text: label, time: start + offset / 1000 });
      }
    }

    if (!text && words.length === 0) continue;
    // Fresh object for AOT — do not retain JSON.parse shapes in the hot path.
    lines.push({ start, end, text, words });
  }

  lines.sort((a, b) => a.start - b.start);
  return lines;
}

class MusixmatchService {
  private tokenFilePath: string;
  private readonly captchaRetryDelayMs: number;
  private cachedToken: MusixmatchTokenData | null = null;
  private tokenRequest: Promise<MusixmatchTokenData | null> | null = null;

  constructor(
    tokenFilePath: string = TOKEN_FILE,
    options: { captchaRetryDelayMs?: number } = {},
  ) {
    this.tokenFilePath = tokenFilePath;
    this.captchaRetryDelayMs =
      options.captchaRetryDelayMs ?? CAPTCHA_RETRY_DELAY_MS;
    this.cachedToken = this.readPersistedToken();
  }

  async getRichSync(
    trackName: string,
    artistName: string,
    durationSeconds?: number,
  ): Promise<RichsyncLine[] | null> {
    const token = await this.getToken();
    if (!token) return null;

    const search = await this.searchTrack(
      trackName,
      artistName,
      durationSeconds,
      token,
    );
    if (!search?.hasRichsync) return null;

    const params = new URLSearchParams({
      app_id: APP_ID,
      usertoken: token.usertoken,
      track_id: search.trackId,
    });

    const data = await this.apiGet("track.richsync.get", params, token);
    if (!data || isCaptchaResponse(data)) {
      logger.warn("Musixmatch", "Richsync request failed or rate limited");
      return null;
    }

    const rawBody = (
      data as {
        message?: { body?: { richsync?: { richsync_body?: unknown } } };
      }
    )?.message?.body?.richsync?.richsync_body;

    if (typeof rawBody !== "string" || rawBody.length === 0) return null;

    const lines = parseRichsyncBody(rawBody);
    return lines.length > 0 ? lines : null;
  }

  async getToken(): Promise<MusixmatchTokenData | null> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken;
    }
    if (!this.tokenRequest) {
      this.tokenRequest = this.fetchToken().finally(() => {
        this.tokenRequest = null;
      });
    }
    return this.tokenRequest;
  }

  private async searchTrack(
    trackName: string,
    artistName: string,
    durationSeconds: number | undefined,
    token: MusixmatchTokenData,
  ): Promise<MusixmatchTrackInfo | null> {
    const params = new URLSearchParams({
      app_id: APP_ID,
      usertoken: token.usertoken,
      q_track: trackName,
      q_artist: artistName,
      page_size: "20",
      page: "1",
      s_track_rating: "asc",
    });
    if (
      typeof durationSeconds === "number" &&
      Number.isFinite(durationSeconds) &&
      durationSeconds > 0
    ) {
      params.set("q_duration", String(Math.round(durationSeconds)));
    }

    const data = await this.apiGet("track.search", params, token);
    if (!data || isCaptchaResponse(data)) {
      logger.warn("Musixmatch", "Track search failed or rate limited");
      return null;
    }

    return parseMusixmatchSearchPayload(data, trackName, artistName);
  }

  private async apiGet(
    endpoint: string,
    params: URLSearchParams,
    token: MusixmatchTokenData,
  ): Promise<unknown | null> {
    try {
      const response = await fetch(`${MUSIXMATCH_BASE}/${endpoint}?${params}`, {
        headers: token.cookies ? { cookie: token.cookies } : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        logger.warn("Musixmatch", `${endpoint} request failed`, {
          status: response.status,
        });
        return null;
      }
      return await response.json();
    } catch (error) {
      logger.warn("Musixmatch", `${endpoint} request error`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async fetchToken(
    cookies?: string,
    captchaRetries = 0,
    redirects = 0,
  ): Promise<MusixmatchTokenData | null> {
    // Redirect hops and captcha retries are budgeted independently so a
    // cookie dance never consumes the captcha retry (and vice versa).
    if (captchaRetries > 1 || redirects >= MAX_TOKEN_ATTEMPTS) return null;
    try {
      const url = `${MUSIXMATCH_BASE}/token.get?${new URLSearchParams({
        app_id: APP_ID,
        user_language: "en",
      })}`;
      const response = await fetch(url, {
        redirect: "manual",
        headers: cookies ? { cookie: cookies } : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status >= 300 && response.status < 400) {
        const nextCookies = mergeCookies(
          cookies,
          extractSetCookies(response.headers),
        );
        return await this.fetchToken(
          nextCookies,
          captchaRetries,
          redirects + 1,
        );
      }

      if (!response.ok) {
        logger.warn("Musixmatch", "Token request failed", {
          status: response.status,
        });
        return null;
      }

      const data = (await response.json()) as unknown;
      if (isCaptchaResponse(data)) {
        if (captchaRetries === 0) {
          await sleep(this.captchaRetryDelayMs);
          return await this.fetchToken(cookies, captchaRetries + 1, redirects);
        }
        logger.warn("Musixmatch", "Token endpoint rate limited");
        return null;
      }

      const usertoken = (
        data as { message?: { body?: { user_token?: unknown } } }
      )?.message?.body?.user_token;
      if (typeof usertoken !== "string" || usertoken.length === 0) {
        logger.warn("Musixmatch", "Token response missing user_token");
        return null;
      }

      const token: MusixmatchTokenData = {
        usertoken,
        cookies: cookies ?? null,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      };
      this.persistToken(token);
      return token;
    } catch (error) {
      logger.warn("Musixmatch", "Token request error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private readPersistedToken(): MusixmatchTokenData | null {
    try {
      if (!existsSync(this.tokenFilePath)) return null;
      const parsed = JSON.parse(
        readFileSync(this.tokenFilePath, "utf8"),
      ) as unknown;
      const validated = validateMusixmatchTokenFile(parsed);
      if (!validated || Date.now() >= validated.expiresAt) return null;
      return {
        usertoken: validated.usertoken,
        cookies: validated.cookies ?? null,
        expiresAt: validated.expiresAt,
      };
    } catch {
      return null;
    }
  }

  private persistToken(token: MusixmatchTokenData): void {
    this.cachedToken = token;
    try {
      const dir = path.dirname(this.tokenFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const payload: PersistedMusixmatchToken = {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: Date.now(),
        usertoken: token.usertoken,
        cookies: token.cookies,
        expiresAt: token.expiresAt,
      };
      const tempFile = `${this.tokenFilePath}.tmp`;
      writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf8");
      if (process.platform === "win32" && existsSync(this.tokenFilePath)) {
        unlinkSync(this.tokenFilePath);
      }
      renameSync(tempFile, this.tokenFilePath);
    } catch (error) {
      logger.warn("Musixmatch", "Failed to persist token file", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

let instance: MusixmatchService | null = null;

export function getMusixmatchService(): MusixmatchService {
  if (!instance) {
    instance = new MusixmatchService();
  }
  return instance;
}

export function resetMusixmatchServiceForTests(
  tokenFilePath?: string,
  options?: { captchaRetryDelayMs?: number },
): MusixmatchService {
  instance = new MusixmatchService(tokenFilePath, options);
  return instance;
}
