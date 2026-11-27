import { Text } from "ink";

import { useTheme } from "../../hooks/useTheme.ts";

type PlaybackModeIconProps = {
  icon: string;
  active: boolean;
  /** Optional keybinding label shown after the icon, e.g. `[Sft+S]`. */
  label?: string;
  /** Brief flash highlight (toggle feedback). */
  flash?: boolean;
};

/**
 * Spotify-style mode indicator: active = accent + bold + underdot;
 * inactive = dimmed (still visible when a keybinding label is shown).
 */
export default function PlaybackModeIcon({
  icon,
  active,
  label,
  flash = false,
}: PlaybackModeIconProps) {
  const { theme } = useTheme();
  const color = flash
    ? theme.colors.success
    : active
      ? theme.colors.accent
      : theme.colors.dim;

  return (
    <Text
      color={color}
      bold={active || flash}
      dimColor={!active && !flash}
    >
      {icon}
      {active ? "•" : ""}
      {label ? ` ${label}` : ""}
    </Text>
  );
}
