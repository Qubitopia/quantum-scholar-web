import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
  mode: "system",
  theme: "light",
  setMode: () => {},
});

export function ThemeProvider({ children }) {

  const getInitialMode = () => {
    const saved = localStorage.getItem("qs-theme-mode");
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
    return "system";
  };

  const [mode, setMode] = useState(getInitialMode);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const systemPrefersDark =
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (mode === "system") {
      setTheme(systemPrefersDark ? "dark" : "light");
    } else {
      setTheme(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      setTheme(e.matches ? "dark" : "light");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("qs-theme-mode", mode);
  }, [theme, mode]);

  const value = useMemo(() => ({ mode, theme, setMode }), [mode, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}