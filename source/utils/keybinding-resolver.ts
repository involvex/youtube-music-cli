import { getConfigService } from "../services/config/config.service.ts";
import { KEYBINDINGS } from "../utils/constants.ts";

const cache = new Map<string, readonly string[]>();
let fullSnapshot: Record<string, readonly string[]> | null = null;

export type KeybindingAction = keyof typeof KEYBINDINGS;

export function resolveKeybinding(action: KeybindingAction): readonly string[] {
  const cached = cache.get(action);
  if (cached) return cached;

  const config = getConfigService();
  const custom = config.getKeybinding(action);
  const defaults = KEYBINDINGS[action];
  const resolved = Object.freeze([...(custom ?? [...defaults])]);
  cache.set(action, resolved);
  return resolved;
}

export function getEffectiveKeybindings(): Record<string, readonly string[]> {
  if (fullSnapshot) return fullSnapshot;

  const config = getConfigService();
  const result: Record<string, readonly string[]> = {};
  for (const action of Object.keys(KEYBINDINGS) as KeybindingAction[]) {
    const custom = config.getKeybinding(action);
    const defaults = KEYBINDINGS[action];
    result[action] = Object.freeze([...(custom ?? [...defaults])]);
  }
  fullSnapshot = result;
  return result;
}

export function refreshKeybindings(): void {
  cache.clear();
  fullSnapshot = null;
}

export function resetKeybindingResolverForTests(): void {
  cache.clear();
  fullSnapshot = null;
}
