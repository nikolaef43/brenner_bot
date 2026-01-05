import * as React from "react";

export type ThemePreference = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const THEME_EVENT = "brenner-theme-change";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getSystemThemePreference(): ThemePreference {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getPreferredTheme(): ThemePreference {
  return getStoredThemePreference() ?? getSystemThemePreference();
}

function getActiveTheme(): ThemePreference {
  if (typeof document === "undefined") {
    return getPreferredTheme();
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyThemeClass(theme: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setThemePreference(theme: ThemePreference) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failures
    }
  }
  applyThemeClass(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  }
}

export function toggleThemePreference() {
  const current = getActiveTheme();
  const next = current === "dark" ? "light" : "dark";
  setThemePreference(next);
  return next;
}

export function subscribeToThemeChanges(callback: (theme: ThemePreference) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const next = (event as CustomEvent<ThemePreference>).detail;
    if (isThemePreference(next)) {
      applyThemeClass(next);
      callback(next);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }
    const next = isThemePreference(event.newValue) ? event.newValue : getSystemThemePreference();
    applyThemeClass(next);
    callback(next);
  };

  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  const handleMediaChange = () => {
    if (getStoredThemePreference() !== null) {
      return;
    }
    const next = getSystemThemePreference();
    applyThemeClass(next);
    callback(next);
  };

  window.addEventListener(THEME_EVENT, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);
  if (mediaQuery?.addEventListener) {
    mediaQuery.addEventListener("change", handleMediaChange);
  } else if (mediaQuery?.addListener) {
    mediaQuery.addListener(handleMediaChange);
  }

  return () => {
    window.removeEventListener(THEME_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
    if (mediaQuery?.removeEventListener) {
      mediaQuery.removeEventListener("change", handleMediaChange);
    } else if (mediaQuery?.removeListener) {
      mediaQuery.removeListener(handleMediaChange);
    }
  };
}

export function useThemePreference() {
  const [theme, setTheme] = React.useState<ThemePreference>("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const initial = getPreferredTheme();
    setTheme(initial);
    applyThemeClass(initial);
    return subscribeToThemeChanges(setTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    toggleThemePreference();
  }, []);

  const setThemePreferenceSafe = React.useCallback((next: ThemePreference) => {
    setThemePreference(next);
  }, []);

  return {
    theme,
    mounted,
    toggleTheme,
    setTheme: setThemePreferenceSafe,
  };
}
