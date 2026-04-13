"use client";

import { useEffect, useCallback } from "react";

type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

/**
 * Hook for global keyboard shortcuts
 * Works on both Mac (Cmd) and Windows (Ctrl)
 */
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  callback: () => void,
  options?: {
    enabled?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  }
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
  } = options || {};

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check for Ctrl (Windows) or Cmd (Mac)
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = shortcut.ctrlKey ? isCtrlOrCmd : !isCtrlOrCmd;
      const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

      // For shortcuts that need Ctrl/Cmd
      if (shortcut.ctrlKey || shortcut.metaKey) {
        if (!isCtrlOrCmd) return;
      }

      // Check if any modifier keys are pressed that shouldn't be
      if (!shortcut.ctrlKey && !shortcut.metaKey && (event.ctrlKey || event.metaKey)) {
        return;
      }

      if (!shortcut.shiftKey && event.shiftKey) return;
      if (!shortcut.altKey && event.altKey) return;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        callback();
      }
    },
    [shortcut, callback, enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for Cmd+K / Ctrl+K global shortcut
 * Convenience wrapper for the most common use case
 */
export function useQuickAddShortcut(callback: () => void, enabled = true) {
  useKeyboardShortcut(
    { key: "k", ctrlKey: true }, // Works for both Ctrl+K and Cmd+K
    callback,
    { enabled }
  );
}