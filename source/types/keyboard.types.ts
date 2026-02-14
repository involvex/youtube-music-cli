// Keyboard handling type definitions
export interface KeyBinding {
	keys: string[];
	description: string;
}

export type KeyBindings = Record<string, KeyBinding>;
