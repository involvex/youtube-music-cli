import { create } from "zustand";

type Theme = "dark" | "light";

const STORAGE_KEY = "ymc-theme";

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  // Migrate legacy key
  const legacy = localStorage.getItem("theme");
  if (legacy === "light" || legacy === "dark") {
    return legacy;
  }
  return "dark";
}

export const useTheme = create<ThemeStore>(
  (set: (partial: Partial<ThemeStore>) => void, get: () => ThemeStore) => ({
    theme: readStoredTheme(),

    toggleTheme: () => {
      const newTheme = get().theme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
      set({ theme: newTheme });
    },

    setTheme: (theme: Theme) => {
      applyTheme(theme);
      set({ theme });
    },
  }),
);

applyTheme(readStoredTheme());
