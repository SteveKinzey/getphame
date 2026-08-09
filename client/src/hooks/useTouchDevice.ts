import { useEffect, useState } from "react";

/**
 * Returns true when the primary input device has no hover capability
 * (i.e., touch screens, stylus-only tablets).
 * Evaluated once on mount — does not react to device changes at runtime.
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia("(hover: none)").matches);
  }, []);
  return isTouch;
}
