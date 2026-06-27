import { useEffect } from "react";
import { SHORTCUTS } from "../lib/a11y/keyboardShortcuts";
import { useFocusTrap } from "../lib/a11y/useFocusTrap";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Help modal listing all keyboard shortcuts. Acts as the "documented"
 * surface required by the keyboard-navigation acceptance criteria.
 * Uses the existing focus-trap hook so Tab cycles inside the dialog and
 * Escape closes it — no keyboard traps.
 */
export function KeyboardHelpModal({ open, onClose }: Props) {
  const containerRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-help-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="kbd-help-title" className="text-lg font-semibold text-white">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard help"
            className="rounded-md px-2 py-1 text-mist hover:text-white"
          >
            ×
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-4 rounded-lg border border-ink-700/60 px-3 py-2"
            >
              <span className="text-mist">{s.label}</span>
              <kbd className="font-mono text-xs text-white bg-ink-800 border border-ink-700 px-2 py-1 rounded">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-mist/70">
          Press <kbd className="font-mono">?</kbd> any time to reopen this list.
          Shortcuts are ignored while typing in an input or textarea.
        </p>
      </div>
    </div>
  );
}
