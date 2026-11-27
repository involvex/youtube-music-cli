import { afterEach, beforeEach, expect, test } from "bun:test";

import { getConfigService } from "../source/services/config/config.service.ts";
import { KEYBINDINGS } from "../source/utils/constants.ts";
import {
  getEffectiveKeybindings,
  refreshKeybindings,
  resetKeybindingResolverForTests,
  resolveKeybinding,
} from "../source/utils/keybinding-resolver.ts";

beforeEach(() => {
  resetKeybindingResolverForTests();
  getConfigService().resetKeybindingsForTests();
});

afterEach(() => {
  resetKeybindingResolverForTests();
  getConfigService().resetKeybindingsForTests();
});

test("resolveKeybinding returns defaults when no custom binding is set", () => {
  const result = resolveKeybinding("PLAY_PAUSE");
  expect(result).toEqual(KEYBINDINGS.PLAY_PAUSE);
});

test("resolveKeybinding returns custom binding when set", () => {
  const config = getConfigService();
  config.setKeybinding("PLAY_PAUSE", ["f5"]);

  const result = resolveKeybinding("PLAY_PAUSE");
  expect(result).toEqual(["f5"]);
});

test("setKeybinding invalidates cache so next resolve picks up new keys", () => {
  const config = getConfigService();
  config.setKeybinding("NEXT", ["x"]);

  const result = resolveKeybinding("NEXT");
  expect(result).toEqual(["x"]);

  config.setKeybinding("NEXT", ["y"]);
  const result2 = resolveKeybinding("NEXT");
  expect(result2).toEqual(["y"]);
});

test("AI_RECOMMENDATIONS no longer collides with AUTOPLAY_TOGGLE", () => {
  refreshKeybindings();

  const aiRecs = resolveKeybinding("AI_RECOMMENDATIONS");
  const autoplay = resolveKeybinding("AUTOPLAY_TOGGLE");

  expect(aiRecs).not.toEqual(autoplay);
  expect(aiRecs).not.toContain("shift+a");
  expect(autoplay).toContain("shift+a");
});

test('AI_CHAT remains bound to "a"', () => {
  refreshKeybindings();

  const aiChat = resolveKeybinding("AI_CHAT");
  expect(aiChat).toEqual(["a"]);
});

test("getEffectiveKeybindings returns all actions with defaults or custom", () => {
  const config = getConfigService();
  config.setKeybinding("SHUFFLE", ["u"]);
  refreshKeybindings();

  const effective = getEffectiveKeybindings();
  expect(effective.SHUFFLE).toEqual(["u"]);
  expect(effective.PLAY_PAUSE).toEqual(KEYBINDINGS.PLAY_PAUSE);
});

test("custom binding returns frozen array", () => {
  const config = getConfigService();
  config.setKeybinding("QUIT", ["q", "ctrl+q"]);

  const result = resolveKeybinding("QUIT");
  expect(Object.isFrozen(result)).toBe(true);
  expect(result).toEqual(["q", "ctrl+q"]);
});

test("clearKeybinding reverts to default", () => {
  const config = getConfigService();
  config.setKeybinding("NEXT", ["x"]);
  expect(resolveKeybinding("NEXT")).toEqual(["x"]);

  config.clearKeybinding("NEXT");
  expect(resolveKeybinding("NEXT")).toEqual(KEYBINDINGS.NEXT);
});
