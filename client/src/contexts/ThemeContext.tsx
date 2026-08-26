import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  toggleTheme?: () => void;
  setThemePreference?: (theme: ThemePreference) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : defaultTheme;
    }
    return defaultTheme;
  });
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );
  const theme: Theme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    if (!switchable || themePreference !== "system" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");
    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [switchable, themePreference]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme", themePreference);
    }
  }, [theme, themePreference, switchable]);

  const toggleTheme = switchable
    ? () => {
        setThemePreferenceState(theme === "light" ? "dark" : "light");
      }
    : undefined;

  const setThemePreference = switchable
    ? (nextTheme: ThemePreference) => {
        setThemePreferenceState(nextTheme);
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, themePreference, toggleTheme, setThemePreference, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
