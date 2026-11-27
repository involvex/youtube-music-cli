import { describe, expect, test } from "bun:test";

import {
  buildTerminalTitle,
  DEFAULT_TERMINAL_TITLE,
  formatTerminalTitleSequence,
  sanitizeTitleText,
} from "../source/utils/terminal-title.ts";

const ESC = String.fromCodePoint(27);
const BEL = String.fromCodePoint(7);

function makeTrack(overrides = {}) {
  return {
    videoId: "abc123",
    title: "Test Song",
    artists: [{ name: "Test Artist" }],
    ...overrides,
  };
}

describe("sanitizeTitleText", () => {
  test("strips CSI escape sequences", () => {
    expect(sanitizeTitleText(`Song ${ESC}[31mRed${ESC}[0m`)).toBe("Song Red");
  });

  test("strips complete OSC sequences", () => {
    expect(sanitizeTitleText(`A ${ESC}]0;evil title${BEL} B`)).toBe("A  B");
  });

  test("strips unterminated OSC sequences", () => {
    expect(sanitizeTitleText(`A ${ESC}]0;evil`)).toBe("A");
  });

  test("removes raw control characters and trims", () => {
    expect(sanitizeTitleText(`${BEL}  spaced${ESC} out  `)).toBe("spaced out");
    expect(sanitizeTitleText("clean")).toBe("clean");
  });
});

describe("buildTerminalTitle", () => {
  test("returns default title without a track", () => {
    expect(buildTerminalTitle({ currentTrack: null, isPlaying: true })).toBe(
      DEFAULT_TERMINAL_TITLE,
    );
  });

  test("joins title, artist, state marker, and app name while playing", () => {
    expect(
      buildTerminalTitle({ currentTrack: makeTrack(), isPlaying: true }),
    ).toBe("Test Song · Test Artist · ▶ · ymc");
  });

  test("uses pause marker when not playing", () => {
    expect(
      buildTerminalTitle({ currentTrack: makeTrack(), isPlaying: false }),
    ).toBe("Test Song · Test Artist · ⏸ · ymc");
  });

  test("omits missing artist segment", () => {
    const track = makeTrack({ artists: [] });
    expect(buildTerminalTitle({ currentTrack: track, isPlaying: true })).toBe(
      "Test Song · ▶ · ymc",
    );
  });

  test("falls back to Unknown for empty title and drops empty artists", () => {
    const track = makeTrack({
      title: `${ESC}[2J`,
      artists: [{ name: `${ESC}[2J` }],
    });
    expect(buildTerminalTitle({ currentTrack: track, isPlaying: true })).toBe(
      "Unknown · ▶ · ymc",
    );
  });

  test("sanitizes injected escape sequences from metadata", () => {
    const track = makeTrack({
      title: `Evil ${ESC}]0;pwned${BEL}Song`,
    });
    expect(buildTerminalTitle({ currentTrack: track, isPlaying: true })).toBe(
      "Evil Song · Test Artist · ▶ · ymc",
    );
  });
});

describe("formatTerminalTitleSequence", () => {
  test("wraps title in OSC 0 sequence with BEL terminator", () => {
    expect(formatTerminalTitleSequence("hello")).toBe(`${ESC}]0;hello${BEL}`);
  });

  test("never emits embedded terminators or escapes", () => {
    const sequence = formatTerminalTitleSequence(
      `bad${ESC}injected${BEL}title`,
    );
    const inner = sequence.slice(`${ESC}]0;`.length, -1);
    expect(sequence.startsWith(`${ESC}]0;`)).toBe(true);
    expect(sequence.endsWith(BEL)).toBe(true);
    expect(inner.includes(ESC)).toBe(false);
    expect(inner.includes(BEL)).toBe(false);
  });
});
