import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./themeContextObject";

const STORAGE_KEY = "talentx-theme";
const VALID_THEMES = ["light", "dark", "system"];

function getSystemPreference() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme) {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return getSystemPreference();
}

function applyThemeToDOM(resolved) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function readSavedTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && VALID_THEMES.includes(saved)) return saved;
  return "system";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readSavedTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(readSavedTheme()));

  const setTheme = useCallback((next) => {
    const value = VALID_THEMES.includes(next) ? next : "system";
    localStorage.setItem(STORAGE_KEY, value);
    setThemeState(value);
    const resolved = resolveTheme(value);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = resolveTheme("system");
      setResolvedTheme(next);
      applyThemeToDOM(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const darkMode = resolvedTheme === "dark";
  const toggleDarkMode = toggleTheme;

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, darkMode, toggleDarkMode }),
    [theme, resolvedTheme, setTheme, toggleTheme, darkMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
