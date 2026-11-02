import { useContext } from "react";
import { ThemeContext, type ThemeContextType } from "./theme-context";

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}

