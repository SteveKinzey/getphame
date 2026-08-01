import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useIsMutating } from "@tanstack/react-query";

export type UpdateDirtySource = {
  id: string;
  isDirty: () => boolean;
};

export type UpdateCriticalActivity = {
  id: string;
  isActive: () => boolean;
};

type UpdateSafetyContextValue = {
  pendingMutationCount: number;
  registerDirtySource: (source: UpdateDirtySource) => () => void;
  getDirtySourceCount: () => number;
  registerCriticalActivity: (activity: UpdateCriticalActivity) => () => void;
  getCriticalActivityCount: () => number;
};

const UpdateSafetyContext = createContext<UpdateSafetyContextValue | null>(null);

/**
 * Coordinates page-local unsaved-work signals with the global React Query
 * mutation state. It deliberately stores only boolean callbacks—never form
 * values or customer content.
 */
export function UpdateSafetyProvider({ children }: { children: ReactNode }) {
  const sourcesRef = useRef(new Map<string, UpdateDirtySource>());
  const criticalActivitiesRef = useRef(new Map<string, UpdateCriticalActivity>());
  const pendingMutationCount = useIsMutating();

  const registerDirtySource = useCallback((source: UpdateDirtySource) => {
    sourcesRef.current.set(source.id, source);

    return () => {
      const current = sourcesRef.current.get(source.id);
      if (current === source) sourcesRef.current.delete(source.id);
    };
  }, []);

  const getDirtySourceCount = useCallback(() => {
    let dirtyCount = 0;
    for (const source of Array.from(sourcesRef.current.values())) {
      try {
        if (source.isDirty()) dirtyCount += 1;
      } catch {
        // A stale page-unmount callback must never block a safe reload forever.
      }
    }
    return dirtyCount;
  }, []);

  const registerCriticalActivity = useCallback((activity: UpdateCriticalActivity) => {
    criticalActivitiesRef.current.set(activity.id, activity);

    return () => {
      const current = criticalActivitiesRef.current.get(activity.id);
      if (current === activity) criticalActivitiesRef.current.delete(activity.id);
    };
  }, []);

  const getCriticalActivityCount = useCallback(() => {
    let activeCount = 0;
    for (const activity of Array.from(criticalActivitiesRef.current.values())) {
      try {
        if (activity.isActive()) activeCount += 1;
      } catch {
        // An unmounted activity must not prevent a future deliberate reload.
      }
    }
    return activeCount;
  }, []);

  const value = useMemo<UpdateSafetyContextValue>(
    () => ({
      pendingMutationCount,
      registerDirtySource,
      getDirtySourceCount,
      registerCriticalActivity,
      getCriticalActivityCount,
    }),
    [
      getCriticalActivityCount,
      getDirtySourceCount,
      pendingMutationCount,
      registerCriticalActivity,
      registerDirtySource,
    ]
  );

  return (
    <UpdateSafetyContext.Provider value={value}>
      {children}
    </UpdateSafetyContext.Provider>
  );
}

export function useUpdateSafety() {
  const context = useContext(UpdateSafetyContext);
  if (!context) {
    throw new Error("useUpdateSafety must be used inside UpdateSafetyProvider");
  }
  return context;
}

/**
 * Register a lightweight boolean dirty signal without copying form values into
 * shared state. Call this in every high-risk editable surface.
 */
export function useUpdateDirtySource(
  id: string,
  isDirty: boolean
): void {
  const { registerDirtySource } = useUpdateSafety();
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    return registerDirtySource({
      id,
      isDirty: () => isDirtyRef.current,
    });
  }, [id, registerDirtySource]);
}

/**
 * Register a non-React-Query operation that must never be interrupted by a
 * deliberate PWA reload, such as a raw authentication or payment request.
 */
export function useUpdateCriticalActivity(
  id: string,
  isActive: boolean
): void {
  const { registerCriticalActivity } = useUpdateSafety();
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    return registerCriticalActivity({
      id,
      isActive: () => isActiveRef.current,
    });
  }, [id, registerCriticalActivity]);
}
