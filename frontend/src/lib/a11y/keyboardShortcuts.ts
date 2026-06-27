/**
 * Global keyboard shortcuts for main wallet routes.
 *
 * - g d  → Dashboard
 * - g s  → Send
 * - g r  → Receive
 * - g c  → Scan / private balance
 * - g h  → History
 * - ?    → Open keyboard help modal
 *
 * Uses a short chord-prefix model (`g` then a destination key) to avoid
 * colliding with typing in inputs. Any shortcut fired while focus is in a
 * text input, textarea, or contenteditable element is ignored.
 */

import { useEffect } from "react";

export type ShortcutTarget =
  | "dashboard"
  | "send"
  | "receive"
  | "balance"
  | "history"
  | "profile";

export interface ShortcutBinding {
  keys: string;
  label: string;
  target?: ShortcutTarget;
  action?: "openHelp";
}

export const SHORTCUTS: ShortcutBinding[] = [
  { keys: "g d", label: "Go to Dashboard", target: "dashboard" },
  { keys: "g s", label: "Go to Send", target: "send" },
  { keys: "g r", label: "Go to Receive", target: "receive" },
  { keys: "g c", label: "Open scanner / private balance", target: "balance" },
  { keys: "g h", label: "Go to Transaction history", target: "history" },
  { keys: "g p", label: "Go to Profile", target: "profile" },
  { keys: "?", label: "Show keyboard shortcuts", action: "openHelp" },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

interface UseKeyboardShortcutsOpts {
  onNavigate: (target: ShortcutTarget) => void;
  onOpenHelp: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigate,
  onOpenHelp,
  enabled = true,
}: UseKeyboardShortcutsOpts): void {
  useEffect(() => {
    if (!enabled) return;
    let prefixActive = false;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPrefix = () => {
      prefixActive = false;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        onOpenHelp();
        return;
      }

      if (!prefixActive && e.key === "g") {
        prefixActive = true;
        prefixTimer = setTimeout(clearPrefix, 1200);
        return;
      }

      if (prefixActive) {
        const map: Record<string, ShortcutTarget> = {
          d: "dashboard",
          s: "send",
          r: "receive",
          c: "balance",
          h: "history",
          p: "profile",
        };
        const target = map[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          onNavigate(target);
        }
        clearPrefix();
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (prefixTimer) clearTimeout(prefixTimer);
    };
  }, [enabled, onNavigate, onOpenHelp]);
}
