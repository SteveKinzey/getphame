/**
 * useHaptics — Web Vibration API wrapper with user preference + accessibility support.
 *
 * Features:
 *  - Reads/writes `rr_haptics_enabled` in localStorage (default: true)
 *  - Silently no-ops on browsers without Vibration API (desktop, Safari)
 *  - Respects `prefers-reduced-motion: reduce` media query
 *  - Exposes named patterns: keyPress, buttonPress, success, emailOpened, reviewPosted
 *  - Exposes `hapticEnabled` boolean and `setHapticEnabled(bool)` for the Settings toggle
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rr_haptics_enabled";
const HAPTIC_PREFERENCE_EVENT = "getphame:haptic-preference-change";

// ── Vibration patterns (ms) ──────────────────────────────────────────────────
// Format: [vibrate, pause, vibrate, pause, ...]
const PATTERNS = {
  /** Barely-there tick on each keystroke */
  keyPress: [8],
  /** Crisp tap on button press */
  buttonPress: [18],
  /** Soft double-tap for generic success */
  success: [20, 60, 20],
  /** Single medium pulse — customer opened email for the first time */
  emailOpened: [40, 80, 40],
  /** Celebratory triple-burst — customer posted a review */
  reviewPosted: [30, 50, 60, 50, 100],
} as const;

export type HapticPattern = keyof typeof PATTERNS;

function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "vibrate" in navigator &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function canUseNativeHaptics(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function readPref(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function useHaptics() {
  const [hapticEnabled, setHapticEnabledState] = useState<boolean>(readPref);

  // Sync to localStorage whenever the preference changes
  const setHapticEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // ignore storage errors in private mode
    }
    setHapticEnabledState(enabled);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(HAPTIC_PREFERENCE_EVENT));
    }
  }, []);

  // Keep state in sync across hook instances in this tab and across other tabs.
  useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setHapticEnabledState(e.newValue === "true");
      }
    };
    const preferenceHandler = () => setHapticEnabledState(readPref());

    window.addEventListener("storage", storageHandler);
    window.addEventListener(HAPTIC_PREFERENCE_EVENT, preferenceHandler);
    return () => {
      window.removeEventListener("storage", storageHandler);
      window.removeEventListener(HAPTIC_PREFERENCE_EVENT, preferenceHandler);
    };
  }, []);

  const vibrate = useCallback(
    (pattern: HapticPattern) => {
      if (!hapticEnabled || !canVibrate()) return;
      try {
        navigator.vibrate(PATTERNS[pattern]);
      } catch {
        // vibrate can throw in some browsers — ignore
      }
    },
    [hapticEnabled]
  );

  const recoverySuccessHaptic = useCallback(() => {
    if (!hapticEnabled || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (canUseNativeHaptics()) {
      void Haptics.notification({ type: NotificationType.Success }).catch(
        () => undefined
      );
      return;
    }

    vibrate("success");
  }, [hapticEnabled, vibrate]);

  return {
    hapticEnabled,
    setHapticEnabled,
    vibrate,
    // Convenience named methods
    keyPressHaptic: () => vibrate("keyPress"),
    buttonPressHaptic: () => vibrate("buttonPress"),
    successHaptic: () => vibrate("success"),
    emailOpenedHaptic: () => vibrate("emailOpened"),
    reviewPostedHaptic: () => vibrate("reviewPosted"),
    recoverySuccessHaptic,
  };
}
