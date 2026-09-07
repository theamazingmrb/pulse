"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type FontScale = "sm" | "md" | "lg" | "xl";

const STORAGE_KEY = "priority-compass-font-scale";
const DEFAULT: FontScale = "md";

interface FontSizeContextValue {
  scale: FontScale;
  setScale: (s: FontScale) => void;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<FontScale>(DEFAULT);

  // Load persisted scale on mount (client-only)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as FontScale | null;
      if (stored && ["sm", "md", "lg", "xl"].includes(stored)) {
        setScaleState(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setScale = (s: FontScale) => {
    setScaleState(s);
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
    } catch {
      // ignore storage errors
    }
  };

  // Apply the scale class to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-scale-sm", "text-scale-md", "text-scale-lg", "text-scale-xl");
    root.classList.add(`text-scale-${scale}`);
  }, [scale]);

  return (
    <FontSizeContext.Provider value={{ scale, setScale }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize must be used within FontSizeProvider");
  return ctx;
}
