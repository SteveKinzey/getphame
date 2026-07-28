import {
  getPwaInstallSnapshot,
  subscribeToPwaInstall,
  updatePwaInstallSnapshot,
} from "@/lib/pwaInstall";

export const PREMIUM_FEATURE_KEYS = [
  "send_limit",
  "koalendar",
  "bulk_sender",
  "plans",
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_FEATURE_KEYS)[number];

export type UpgradeModalSnapshot = {
  open: boolean;
  featureKey: PremiumFeatureKey;
};

const SERVER_SNAPSHOT: UpgradeModalSnapshot = {
  open: false,
  featureKey: "plans",
};

let activeFeatureKey: PremiumFeatureKey = "plans";
let snapshot: UpgradeModalSnapshot = SERVER_SNAPSHOT;

function syncSnapshot(): UpgradeModalSnapshot {
  const open = getPwaInstallSnapshot().upgradeVisible;
  if (snapshot.open !== open || snapshot.featureKey !== activeFeatureKey) {
    snapshot = { open, featureKey: activeFeatureKey };
  }
  return snapshot;
}

export function isPremiumFeatureKey(value: string): value is PremiumFeatureKey {
  return PREMIUM_FEATURE_KEYS.includes(value as PremiumFeatureKey);
}

export function normalizePremiumFeatureKey(value: string | null | undefined): PremiumFeatureKey {
  return value && isPremiumFeatureKey(value) ? value : "plans";
}

export function getUpgradeModalSnapshot(): UpgradeModalSnapshot {
  return syncSnapshot();
}

export function getUpgradeModalServerSnapshot(): UpgradeModalSnapshot {
  return SERVER_SNAPSHOT;
}

export function subscribeToUpgradeModal(listener: () => void): () => void {
  return subscribeToPwaInstall(() => {
    syncSnapshot();
    listener();
  });
}

export function openUpgradeModal(featureKey: PremiumFeatureKey): void {
  activeFeatureKey = featureKey;
  snapshot = { open: true, featureKey };
  updatePwaInstallSnapshot({ upgradeVisible: true });
}

export function closeUpgradeModal(): void {
  updatePwaInstallSnapshot({ upgradeVisible: false });
}
