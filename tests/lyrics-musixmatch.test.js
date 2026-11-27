import { afterEach, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const __fileTeardowns = [];
afterEach(() => {
  while (__fileTeardowns.length) {
    const fn = __fileTeardowns.pop();
    fn();
  }
});

function makeTempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "ymc-lyrics-test-"));
  __fileTeardowns.push(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

// Parse fetch input into a real URL so mock routing matches exact hosts and
// paths (avoids CodeQL js/incomplete-url-substring-sanitization).
function toUrl(input) {
  return new URL(String(input instanceof Request ? input.url : input));
}

const isMusixmatchEndpoint = (url, endpoint) =>
  url.host === "apic-desktop.musixmatch.com" &&
  url.pathname.endsWith(`/${endpoint}`);

test("lyrics: parseRichsyncBody maps richsync JSON to timed lines", async () => {
  const { parseRichsyncBody } =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const rawBody = JSON.stringify([
    {
      ts: 1.5,
      te: 5,
      x: "Hello world",
      l: [
        { c: "Hello", o: 0 },
        { c: " ", o: 500 },
        { c: "world", o: 800 },
      ],
    },
    {
      ts: 0.2,
      te: 1,
      x: "",
      l: [],
    },
  ]);

  const lines = parseRichsyncBody(rawBody);

  expect(lines.length).toBe(1);
  expect(lines[0]?.start).toBe(1.5);
  expect(lines[0]?.end).toBe(5);
  expect(lines[0]?.text).toBe("Hello world");
  expect(lines[0]?.words.map(word => word.text)).toEqual([
    "Hello",
    " ",
    "world",
  ]);
  // word time = line start + offset ms / 1000
  expect(lines[0]?.words[0]?.time).toBeCloseTo(1.5);
  expect(lines[0]?.words[2]?.time).toBeCloseTo(2.3);
});

test("lyrics: parseRichsyncBody sorts lines and rejects malformed input", async () => {
  const { parseRichsyncBody } =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const unsorted = JSON.stringify([
    { ts: 10, te: 12, x: "second", l: [] },
    { ts: 1, te: 3, x: "first", l: [] },
  ]);
  const sorted = parseRichsyncBody(unsorted);
  expect(sorted.map(line => line.text)).toEqual(["first", "second"]);

  expect(parseRichsyncBody("not json")).toEqual([]);
  expect(parseRichsyncBody(JSON.stringify({ nope: true }))).toEqual([]);
  expect(parseRichsyncBody(JSON.stringify([{ x: "no timestamps" }]))).toEqual(
    [],
  );
});

test("lyrics: parseMusixmatchSearchPayload prefers exact name match", async () => {
  const { parseMusixmatchSearchPayload } =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const payload = {
    message: {
      header: { status_code: 200 },
      body: {
        track_list: [
          {
            track: {
              track_id: 111,
              commontrack_id: 900,
              track_name: "Test Song (Live)",
              artist_name: "Tester",
              has_richsync: true,
            },
          },
          {
            track: {
              track_id: 42,
              commontrack_id: 7,
              track_name: "Test Song",
              artist_name: "The Testers",
              has_richsync: 1,
            },
          },
          {
            track: {
              track_id: 222,
              commontrack_id: 901,
              track_name: "Unrelated",
              artist_name: "Someone Else",
              has_richsync: false,
            },
          },
        ],
      },
    },
  };

  const info = parseMusixmatchSearchPayload(payload, "Test Song", "Tester");
  expect(info?.trackId).toBe("42");
  expect(info?.commonTrackId).toBe("7");
  expect(info?.hasRichsync).toBe(true);

  const noArtistMatch = parseMusixmatchSearchPayload(
    payload,
    "Test Song",
    "Someone Else",
  );
  // no track named "Test Song" belongs to this artist
  expect(noArtistMatch).toBeNull();
});

test("lyrics: parseMusixmatchSearchPayload falls back to partial match", async () => {
  const { parseMusixmatchSearchPayload } =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const payload = {
    message: {
      body: {
        track_list: [
          {
            track: {
              track_id: 55,
              commontrack_id: 66,
              track_name: "Midnight City (Remastered 2016)",
              artist_name: "M83",
              has_richsync: true,
            },
          },
        ],
      },
    },
  };

  expect(
    parseMusixmatchSearchPayload(payload, "Midnight City", "M83")?.trackId,
  ).toBe("55");
  expect(
    parseMusixmatchSearchPayload(payload, "Missing Song", "M83"),
  ).toBeNull();
  expect(parseMusixmatchSearchPayload({}, "Anything", "Anyone")).toBeNull();
  expect(parseMusixmatchSearchPayload(null, "Anything", "Anyone")).toBeNull();
});

test("lyrics: validateMusixmatchTokenFile enforces schema", async () => {
  const { validateMusixmatchTokenFile } =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const valid = validateMusixmatchTokenFile({
    schemaVersion: 1,
    updatedAt: 123,
    usertoken: "abc",
    cookies: "a=b",
    expiresAt: 456,
  });
  expect(valid?.usertoken).toBe("abc");
  expect(valid?.cookies).toBe("a=b");

  expect(validateMusixmatchTokenFile(null)).toBeNull();
  expect(validateMusixmatchTokenFile({ schemaVersion: 99 })).toBeNull();
  expect(
    validateMusixmatchTokenFile({
      schemaVersion: 1,
      usertoken: "",
      expiresAt: 1,
    }),
  ).toBeNull();

  // missing cookies is fine
  const noCookies = validateMusixmatchTokenFile({
    schemaVersion: 1,
    usertoken: "tok",
    expiresAt: 9999999999999,
  });
  expect(noCookies?.cookies).toBeNull();
});

test("lyrics: cleanTrackName strips video title noise", async () => {
  const { cleanTrackName } =
    await import("../source/services/lyrics/lyrics.service.ts");

  expect(cleanTrackName("Song Name (Official Lyric Video)")).toBe("Song Name");
  expect(cleanTrackName("Song Name [Official Audio]")).toBe("Song Name");
  expect(cleanTrackName("Song Name (HD)")).toBe("Song Name");
  expect(cleanTrackName("Artist - Song Name", "Artist")).toBe("Song Name");
  expect(cleanTrackName("AC/DC - Song (Official Video)", "AC/DC")).toBe("Song");
  expect(cleanTrackName("(Official Video)", "X")).toBe("(Official Video)");
  expect(cleanTrackName("Tester – Great Song", "Tester")).toBe("Great Song");
  expect(cleanTrackName("Tester — Great Song", "Tester")).toBe("Great Song");
  expect(cleanTrackName("Tester: Great Song", "Tester")).toBe("Great Song");
  expect(cleanTrackName("Plain Song")).toBe("Plain Song");
});

test("lyrics: getCurrentLineIndex handles edge cases", async () => {
  const { getLyricsService } =
    await import("../source/services/lyrics/lyrics.service.ts");

  const service = getLyricsService();
  const lines = [
    { time: 10, text: "a" },
    { time: 20, text: "b" },
    { time: 30, text: "c" },
  ];

  expect(service.getCurrentLineIndex([], 100)).toBe(-1);
  expect(service.getCurrentLineIndex(lines, 0)).toBe(0);
  expect(service.getCurrentLineIndex(lines, 10)).toBe(0);
  expect(service.getCurrentLineIndex(lines, 25)).toBe(1);
  expect(service.getCurrentLineIndex(lines, 100)).toBe(2);
});

test("lyrics: buildWordSpans estimates timing from line sync", async () => {
  const {
    buildWordSpans,
    buildKaraokeCells,
    precomputeLineTiming,
    resolveKaraokeColors,
  } = await import("../source/utils/karaoke.ts");

  const colors = resolveKaraokeColors({
    colors: { primary: "cyan", accent: "yellow", text: "white" },
  });

  // estimated spans: line at t=10, next line at t=14
  const spans = buildWordSpans({ time: 10, text: "ab cd" }, 14);
  expect(spans.length).toBe(3); // 'ab', ' ', 'cd'
  const textTokens = spans.filter(span => span.text.trim().length > 0);
  expect(textTokens.length).toBe(2);
  for (const span of spans) {
    expect(span.start).toBeGreaterThanOrEqual(10);
    expect(span.end).toBeLessThanOrEqual(14);
  }
  expect(spans[0]?.start).toBeLessThanOrEqual(spans.at(-1)?.end ?? Infinity);

  // real word timings are used when available
  const wordSynced = buildWordSpans(
    {
      time: 5,
      endTime: 8,
      text: "hello there",
      words: [
        { text: "hello", time: 5 },
        { text: " ", time: 6 },
        { text: "there", time: 6.5 },
      ],
    },
    20,
  );
  expect(wordSynced[0]?.start).toBe(5);
  expect(wordSynced[0]?.end).toBe(6);
  expect(wordSynced[2]?.end).toBe(8); // last word falls back to endTime

  const precomputed = precomputeLineTiming(spans);
  const cellsAhead = buildKaraokeCells(precomputed, 100, colors);
  expect(new Set(cellsAhead.map(cell => cell.color)).size).toBe(1);
  expect(cellsAhead[0]?.color).toBe(colors.sung);

  const cellsBehind = buildKaraokeCells(precomputed, -100, colors);
  expect(cellsBehind.every(cell => cell.color === colors.upcoming)).toBe(true);

  // mid-sweep progress produces a mix of colors (line spans ~[10, 10.4])
  const mixed = new Set(
    buildKaraokeCells(precomputed, 10.05, colors).map(cell => cell.color),
  );
  expect(mixed.size).toBeGreaterThan(1);
});

test("lyrics: lerpHexColor interpolates and clamps", async () => {
  const { lerpHexColor } = await import("../source/utils/karaoke.ts");

  expect(lerpHexColor("#000000", "#ffffff", 0)).toBe("#000000");
  expect(lerpHexColor("#000000", "#ffffff", 1)).toBe("#ffffff");
  expect(lerpHexColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  // clamped out-of-range t values
  expect(lerpHexColor("#000000", "#ffffff", 5)).toBe("#ffffff");
  expect(lerpHexColor("#000000", "#ffffff", -5)).toBe("#000000");
});

test(
  "lyrics: MusixmatchService fetches token, search and richsync",
  async () => {
    const { resetMusixmatchServiceForTests, parseRichsyncBody } =
      await import("../source/services/lyrics/musixmatch.service.ts");

    const tempDir = makeTempDir();
    const tokenFile = path.join(tempDir, "musixmatch-token.json");

    const richsyncLines = [
      {
        ts: 2,
        te: 4.5,
        x: "line one",
        l: [
          { c: "line", o: 0 },
          { c: " one", o: 250 },
        ],
      },
      { ts: 5, te: 7, x: "line two", l: [{ c: "line", o: 0 }] },
    ];

    const requestedUrls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async input => {
      const url = toUrl(input);
      requestedUrls.push(url.href);

      if (isMusixmatchEndpoint(url, "token.get")) {
        return new Response(
          JSON.stringify({
            message: {
              header: { status_code: 200 },
              body: { user_token: "tok123" },
            },
          }),
          { status: 200 },
        );
      }

      if (isMusixmatchEndpoint(url, "track.search")) {
        expect(url.href).toContain("q_duration=120");
        return new Response(
          JSON.stringify({
            message: {
              body: {
                track_list: [
                  {
                    track: {
                      track_id: 42,
                      commontrack_id: 7,
                      track_name: "Test Song",
                      artist_name: "Tester",
                      has_richsync: true,
                    },
                  },
                ],
              },
            },
          }),
          { status: 200 },
        );
      }

      if (isMusixmatchEndpoint(url, "track.richsync.get")) {
        expect(url.href).toContain("track_id=42");
        return new Response(
          JSON.stringify({
            message: {
              body: {
                richsync: { richsync_body: JSON.stringify(richsyncLines) },
              },
            },
          }),
          { status: 200 },
        );
      }

      return new Response("{}", { status: 404 });
    };
    __fileTeardowns.push(() => {
      globalThis.fetch = originalFetch;
    });

    const service = resetMusixmatchServiceForTests(tokenFile);
    const result = await service.getRichSync("Test Song", "Tester", 120);

    expect(result).not.toBeNull();
    expect(result?.length).toBe(2);
    expect(result?.[0]?.text).toBe("line one");
    expect(result?.[0]?.words[1]?.time).toBeCloseTo(2.25);
    expect(requestedUrls[0]).toContain("/token.get");

    // token persisted to disk
    expect(existsSync(tokenFile)).toBe(true);
    const persisted = JSON.parse(readFileSync(tokenFile, "utf8"));
    expect(persisted.usertoken).toBe("tok123");
    expect(persisted.schemaVersion).toBe(1);

    // fresh instance reuses the persisted token without hitting token.get
    requestedUrls.length = 0;
    const secondService = resetMusixmatchServiceForTests(tokenFile);
    await secondService.getRichSync("Test Song", "Tester", 120);
    expect(requestedUrls.some(url => url.includes("/token.get"))).toBe(false);

    // corrupted token file is ignored gracefully
    writeFileSync(tokenFile, "{broken json", "utf8");
    const thirdService = resetMusixmatchServiceForTests(tokenFile);
    requestedUrls.length = 0;
    await thirdService.getRichSync("Test Song", "Tester", 120);
    expect(requestedUrls[0]).toContain("/token.get");

    expect(parseRichsyncBody("").length).toBe(0);
  },
  { timeout: 60_000 },
);

test("lyrics: getLyrics falls back to LRCLIB when richsync unavailable", async () => {
  const lyricsModule =
    await import("../source/services/lyrics/lyrics.service.ts");
  const musixmatchModule =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const tempDir = makeTempDir();
  const tokenFile = path.join(tempDir, "musixmatch-token.json");
  musixmatchModule.resetMusixmatchServiceForTests(tokenFile);
  lyricsModule.getLyricsService().clearCache();

  const requestedUrls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = toUrl(input);
    requestedUrls.push(url.href);

    if (isMusixmatchEndpoint(url, "token.get")) {
      return new Response(
        JSON.stringify({
          message: { header: { status_code: 200 }, body: { user_token: "t" } },
        }),
        { status: 200 },
      );
    }

    if (isMusixmatchEndpoint(url, "track.search")) {
      // no results from musixmatch
      return new Response(
        JSON.stringify({ message: { body: { track_list: [] } } }),
        {
          status: 200,
        },
      );
    }

    if (url.host === "lrclib.net") {
      return new Response(
        JSON.stringify({
          syncedLyrics:
            "[00:01.00]fallback line one\n[00:02.50]fallback line two",
          plainLyrics: "fallback plain",
        }),
        { status: 200 },
      );
    }

    return new Response("{}", { status: 404 });
  };
  __fileTeardowns.push(() => {
    globalThis.fetch = originalFetch;
  });

  const lyrics = await lyricsModule
    .getLyricsService()
    .getLyrics("Fallback Song (Official Video)", "Tester", 100);

  expect(lyrics?.synced?.length).toBe(2);
  expect(lyrics?.synced?.[0]).toEqual({ time: 1, text: "fallback line one" });
  expect(lyrics?.plain).toBe("fallback plain");

  // cleaned title used for provider lookups (URLSearchParams encodes ' ' as '+')
  expect(
    requestedUrls.some(url => url.includes("track_name=Fallback+Song")),
  ).toBe(true);
  expect(requestedUrls.some(url => url.includes("%28Official"))).toBe(false);
});

test("lyrics: transient lookup errors are retried instead of cached", async () => {
  const lyricsModule =
    await import("../source/services/lyrics/lyrics.service.ts");
  const musixmatchModule =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const tempDir = makeTempDir();
  musixmatchModule.resetMusixmatchServiceForTests(
    path.join(tempDir, "musixmatch-token.json"),
  );
  const service = lyricsModule.getLyricsService();
  service.clearCache();

  let lrclibShouldFail = true;
  let lrclibCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = toUrl(input);

    if (isMusixmatchEndpoint(url, "token.get")) {
      return new Response(
        JSON.stringify({
          message: {
            header: { status_code: 200 },
            body: { user_token: "tok" },
          },
        }),
        { status: 200 },
      );
    }

    if (isMusixmatchEndpoint(url, "track.search")) {
      return new Response(
        JSON.stringify({ message: { body: { track_list: [] } } }),
        {
          status: 200,
        },
      );
    }

    if (url.host === "lrclib.net") {
      lrclibCalls += 1;
      if (lrclibShouldFail) {
        return new Response("boom", { status: 500 });
      }
      return new Response(
        JSON.stringify({
          syncedLyrics: "[00:01.00]recovered line",
          plainLyrics: "",
        }),
        { status: 200 },
      );
    }

    return new Response("{}", { status: 404 });
  };
  __fileTeardowns.push(() => {
    globalThis.fetch = originalFetch;
  });

  // first attempt fails (HTTP 500) -> null but NOT cached as "no lyrics"
  expect(await service.getLyrics("Flaky Song", "A", 90)).toBeNull();

  lrclibShouldFail = false;
  const lyrics = await service.getLyrics("Flaky Song", "A", 90);
  expect(lrclibCalls).toBe(2); // second call actually hit the network again
  expect(lyrics?.synced?.[0]?.text).toBe("recovered line");
});

test("lyrics: musixmatch token follows cookie redirect and retries captcha", async () => {
  const musixmatchModule =
    await import("../source/services/lyrics/musixmatch.service.ts");

  const tempDir = makeTempDir();
  const tokenFile = path.join(tempDir, "musixmatch-token.json");

  let tokenCalls = 0;
  const seenCookieHeaders = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = toUrl(input);

    if (isMusixmatchEndpoint(url, "token.get")) {
      tokenCalls += 1;
      seenCookieHeaders.push(init?.headers?.cookie ?? null);

      if (tokenCalls === 1) {
        // redirect dance: set-cookie must be captured and replayed
        return new Response(null, {
          status: 301,
          headers: { location: url.href, "set-cookie": "mxm=abc123; Path=/" },
        });
      }

      if (tokenCalls === 2) {
        return new Response(
          JSON.stringify({
            message: { header: { status_code: 401, hint: "captcha" } },
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          message: {
            header: { status_code: 200 },
            body: { user_token: "retry-tok" },
          },
        }),
        { status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ message: { body: { track_list: [] } } }),
      {
        status: 200,
      },
    );
  };
  __fileTeardowns.push(() => {
    globalThis.fetch = originalFetch;
  });

  const service = musixmatchModule.resetMusixmatchServiceForTests(tokenFile, {
    captchaRetryDelayMs: 1,
  });
  // search returns nothing; the point is exercising the token lifecycle
  expect(await service.getRichSync("Any Song", "Any Artist", 100)).toBeNull();

  expect(tokenCalls).toBe(3);
  expect(seenCookieHeaders[0]).toBeNull();
  expect(seenCookieHeaders[1]).toContain("mxm=abc123");
  expect(seenCookieHeaders[2]).toContain("mxm=abc123");

  const persisted = JSON.parse(readFileSync(tokenFile, "utf8"));
  expect(persisted.usertoken).toBe("retry-tok");
});

test("lyrics: resolveKaraokeColors rejects malformed custom hex", async () => {
  const { resolveKaraokeColors } = await import("../source/utils/karaoke.ts");

  const colors = { primary: "cyan", accent: "yellow", text: "white" };
  const resolved = resolveKaraokeColors({
    karaoke: { sung: "#f00", peak: "not-a-color", upcoming: "#aabbcc" },
    colors,
  });

  expect(resolved.sung).toBe("#56b6c2"); // cyan fallback
  expect(resolved.peak).toBe("#e5c07b"); // yellow fallback
  expect(resolved.upcoming).toBe("#aabbcc"); // valid custom value kept

  // valid karaoke triples pass through untouched
  const exact = resolveKaraokeColors({
    karaoke: { sung: "#123456", peak: "#abcdef", upcoming: "#000000" },
    colors,
  });
  expect(exact).toEqual({
    sung: "#123456",
    peak: "#abcdef",
    upcoming: "#000000",
    sungRgb: { r: 18, g: 52, b: 86 },
    peakRgb: { r: 171, g: 205, b: 239 },
    upcomingRgb: { r: 0, g: 0, b: 0 },
  });
});
