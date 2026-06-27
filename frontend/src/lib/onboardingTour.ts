/**
 * driver.js onboarding tour for first-time wallet users.
 *
 * Steps cover Connect, Register, Receive, and Scan. The tour:
 *  - triggers automatically on first connect once keys are set up,
 *  - is dismissible at any step (Esc / X / outside-click),
 *  - persists progress so a partially-completed tour can be replayed
 *    from Security Settings without showing already-seen steps,
 *  - never overlays a critical security warning modal.
 */

import { driver, type Config as DriverConfig } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_STORAGE_KEY = "opaque-tour-done";
const TOUR_PROGRESS_KEY = "opaque-tour-progress";
const TOUR_SKIPPED_KEY = "opaque-tour-skipped";

export function hasCompletedOnboardingTour(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(TOUR_STORAGE_KEY);
}

export function hasSkippedOnboardingTour(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(TOUR_SKIPPED_KEY);
}

export function getOnboardingProgress(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(TOUR_PROGRESS_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resetOnboardingTour(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOUR_STORAGE_KEY);
  localStorage.removeItem(TOUR_PROGRESS_KEY);
  localStorage.removeItem(TOUR_SKIPPED_KEY);
}

// Bails out so the tour never visually obstructs warnings the user must
// read (network mismatch, mainnet legal acceptance, signing prompts, etc.).
function criticalSecurityModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return (
    !!document.querySelector("[data-critical-modal]") ||
    !!document.querySelector("[data-security-warning]") ||
    !!document.querySelector("[role='alertdialog']")
  );
}

const STEPS: NonNullable<DriverConfig["steps"]> = [
  {
    element: "[data-tour=\"connect\"]",
    popover: {
      title: "Connect your wallet",
      description:
        "Start by connecting Freighter. We never see your seed phrase — keys stay in the wallet extension.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour=\"register\"]",
    popover: {
      title: "Register your meta-address",
      description:
        "One-time registration publishes a stealth meta-address so others can pay you privately.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour=\"meta\"]",
    popover: {
      title: "Your ID",
      description:
        "Your stealth meta-address lives in the Profile menu. Share it to receive private payments.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour=\"receive\"]",
    popover: {
      title: "Receive — Ghost addresses",
      description:
        "Use Receive to generate one-time ghost addresses. Each payment lands on a fresh address that no one can link.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour=\"scan\"]",
    popover: {
      title: "Scan for received payments",
      description:
        "The scanner watches on-chain announcements with your view key and surfaces funds you can claim.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour=\"vault\"]",
    popover: {
      title: "Your private balance",
      description:
        "Claimed funds appear in your private balance. From here you can sweep them to any Stellar address.",
      side: "top",
      align: "start",
    },
  },
];

export function runOnboardingTour(force?: boolean): void {
  if (typeof window === "undefined") return;
  if (!force && (hasCompletedOnboardingTour() || hasSkippedOnboardingTour())) return;
  if (criticalSecurityModalOpen()) return;

  const startStep = force ? 0 : getOnboardingProgress();

  const d = driver({
    showProgress: true,
    allowClose: true,
    steps: STEPS,
    onHighlightStarted: (_el, _step, opts) => {
      try {
        localStorage.setItem(TOUR_PROGRESS_KEY, String(opts.state.activeIndex ?? 0));
      } catch {
        // ignore storage errors
      }
    },
    onDestroyStarted: () => {
      const completedAll = d.isLastStep();
      try {
        if (completedAll) {
          localStorage.setItem(TOUR_STORAGE_KEY, "1");
          localStorage.removeItem(TOUR_PROGRESS_KEY);
        } else {
          localStorage.setItem(TOUR_SKIPPED_KEY, "1");
        }
      } catch {
        // ignore storage errors
      }
      d.destroy();
    },
  });

  d.drive(startStep);
}
