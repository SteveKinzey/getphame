export type PwaInstallPlatform = "ios" | "android" | "other";

export interface PwaInstallSnapshot {
  eligible: boolean;
  installed: boolean;
  platform: PwaInstallPlatform;
  promptAvailable: boolean;
  installGuideVisible: boolean;
  welcomeVisible: boolean;
}

const DEFAULT_SNAPSHOT: PwaInstallSnapshot = {
  eligible: false,
  installed: false,
  platform: "other",
  promptAvailable: false,
  installGuideVisible: false,
  welcomeVisible: false,
};

let snapshot = DEFAULT_SNAPSHOT;
let installRequestHandler: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  return snapshot;
}

export function getPwaInstallServerSnapshot(): PwaInstallSnapshot {
  return DEFAULT_SNAPSHOT;
}

export function subscribeToPwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updatePwaInstallSnapshot(next: Partial<PwaInstallSnapshot>): void {
  const coordinatedNext = { ...next };
  if (coordinatedNext.installGuideVisible === true) {
    coordinatedNext.welcomeVisible = false;
  } else if (coordinatedNext.welcomeVisible === true) {
    coordinatedNext.installGuideVisible = false;
  }
  snapshot = { ...snapshot, ...coordinatedNext };
  listeners.forEach((listener) => listener());
}

export function registerPwaInstallRequest(handler: () => Promise<void>): () => void {
  installRequestHandler = handler;
  return () => {
    if (installRequestHandler === handler) installRequestHandler = null;
  };
}

export async function requestPwaInstall(): Promise<void> {
  await installRequestHandler?.();
}
