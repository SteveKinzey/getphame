/**
 * useHapticEvents — polls tracking.recentEvents every 30 seconds and fires
 * haptic feedback when a new email open or review click arrives.
 *
 * - "email opened" (type === "open"):  double-pulse (emailOpened pattern)
 * - "review link clicked" (type === "click"): triple-burst (reviewPosted pattern)
 *
 * Respects the hapticEnabled preference from useHaptics().
 * Only active when the user is authenticated.
 */

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useHaptics } from "@/hooks/useHaptics";

export function useHapticEvents(enabled: boolean) {
  const { hapticEnabled, emailOpenedHaptic, reviewPostedHaptic } = useHaptics();

  // Poll every 30 seconds
  const { data: events } = trpc.tracking.recentEvents.useQuery(undefined, {
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // Track the highest event ID we've already processed so we don't re-fire
  const lastSeenIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!events || events.length === 0) return;
    if (!hapticEnabled) return;

    // On first load, just record the current max ID — don't buzz for historical events
    const maxId = Math.max(...events.map(e => e.id));
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = maxId;
      return;
    }

    // Find events newer than what we've seen
    const newEvents = events.filter(e => e.id > lastSeenIdRef.current!);
    if (newEvents.length === 0) return;

    // Update the watermark
    lastSeenIdRef.current = maxId;

    // Determine the "most significant" new event type
    const hasClick = newEvents.some(e => e.type === "click");
    const hasOpen = newEvents.some(e => e.type === "open");

    if (hasClick) {
      // Triple-burst: review link clicked (likely posted a review)
      reviewPostedHaptic();
    } else if (hasOpen) {
      // Double-pulse: email opened for the first time
      emailOpenedHaptic();
    }
  }, [events, hapticEnabled, emailOpenedHaptic, reviewPostedHaptic]);
}
