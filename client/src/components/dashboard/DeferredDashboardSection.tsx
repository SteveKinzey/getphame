import { Suspense, type ReactNode, useEffect, useRef, useState } from "react";

interface DeferredDashboardSectionProps {
  children: ReactNode;
  loadingLabel: string;
  minHeightClassName?: string;
}

function DashboardAnalyticsSkeleton({ loadingLabel, minHeightClassName = "min-h-[148px]" }: Pick<DeferredDashboardSectionProps, "loadingLabel" | "minHeightClassName">) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ${minHeightClassName}`}
      role="status"
      aria-live="polite"
      aria-label={loadingLabel}
    >
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-full rr-bg-surface animate-pulse" />
        <div className="h-3 w-32 rounded rr-bg-surface animate-pulse" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-xl px-2 py-3 rr-bg-white-card">
            <div className="mx-auto h-3 w-3 rounded-full rr-bg-surface animate-pulse" />
            <div className="mx-auto mt-2 h-5 w-9 rounded rr-bg-surface animate-pulse" />
            <div className="mx-auto mt-2 h-2 w-12 rounded rr-bg-surface animate-pulse" />
          </div>
        ))}
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}

/**
 * Defers non-critical analytics modules until they approach the viewport.
 * The placeholder reserves card space so the dashboard does not shift when
 * the module code and query begin after the initial paint.
 */
export default function DeferredDashboardSection({
  children,
  loadingLabel,
  minHeightClassName,
}: DeferredDashboardSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "280px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} aria-busy={!shouldRender}>
      {shouldRender ? (
        <Suspense fallback={<DashboardAnalyticsSkeleton loadingLabel={loadingLabel} minHeightClassName={minHeightClassName} />}>
          {children}
        </Suspense>
      ) : (
        <DashboardAnalyticsSkeleton loadingLabel={loadingLabel} minHeightClassName={minHeightClassName} />
      )}
    </div>
  );
}
