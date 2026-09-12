// Get Phame — Branded Page Loader
// Used as the Suspense fallback for lazy-loaded routes.
// Renders a pulsing Get Phame star icon on a navy background.

import { useEffect, useState } from "react";

export default function PageLoader() {
  // Stagger the dots so they animate in sequence
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 3), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="mobile-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "oklch(0.22 0.09 260)" }}
    >
      {/* Animated star icon */}
      <div style={{ animation: "phame-pulse 1.4s ease-in-out infinite" }}>
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Outer star */}
          <path
            d="M28 4L33.09 19.26H49.18L36.55 28.74L41.64 44L28 34.52L14.36 44L19.45 28.74L6.82 19.26H22.91L28 4Z"
            fill="oklch(0.80 0.18 80)"
            opacity="0.25"
          />
          {/* Inner star (slightly smaller, full opacity) */}
          <path
            d="M28 10L32.18 22.64H45.51L35.17 29.86L39.35 42.5L28 35.28L16.65 42.5L20.83 29.86L10.49 22.64H23.82L28 10Z"
            fill="oklch(0.80 0.18 80)"
          />
          {/* Arrow through star */}
          <path
            d="M22 28L26 32L34 24"
            stroke="oklch(0.22 0.09 260)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: dot === i ? 8 : 5,
              height: dot === i ? 8 : 5,
              background:
                dot === i
                  ? "oklch(0.80 0.18 80)"
                  : "oklch(0.80 0.18 80 / 0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
