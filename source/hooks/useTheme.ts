// Theme management hook
import { useTheme as useThemeContext } from "../contexts/theme.context.tsx";

export function useTheme() {
  return useThemeContext();
}
