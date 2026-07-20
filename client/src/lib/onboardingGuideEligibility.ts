export const GUIDE_SEEN_KEY = "rl_guide_seen";

export type OnboardingGuideStatus = {
  dismissed: boolean;
  allDone: boolean;
  hasSentRequest: boolean;
};

export type OnboardingGuideEligibility = {
  isAuthenticated: boolean;
  userId?: string | number | null;
  onboardingStatus?: OnboardingGuideStatus;
};

export function getOnboardingGuideSeenKey(userId: string | number) {
  return `${GUIDE_SEEN_KEY}:${userId}`;
}

export function shouldAutoShowOnboardingGuide(
  { isAuthenticated, userId, onboardingStatus }: OnboardingGuideEligibility,
  storage: Pick<Storage, "getItem">,
) {
  if (!isAuthenticated || userId == null || !onboardingStatus) return false;
  if (
    onboardingStatus.dismissed ||
    onboardingStatus.allDone ||
    onboardingStatus.hasSentRequest
  ) return false;
  return !storage.getItem(getOnboardingGuideSeenKey(userId));
}
