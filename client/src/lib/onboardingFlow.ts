export type OnboardingFlowStatus = {
  smtpConnected?: boolean;
  hasPlatform?: boolean;
  hasSentRequest?: boolean;
  canAccessConnector?: boolean;
};

export function getOnboardingFlow(status?: OnboardingFlowStatus) {
  const canAccessConnector = status?.canAccessConnector === true;
  const maxStep = canAccessConnector ? 4 : 3;
  const minStep = !status?.smtpConnected
    ? 1
    : !status?.hasPlatform
      ? 2
      : !status?.hasSentRequest || !canAccessConnector
        ? 3
        : 4;

  return { canAccessConnector, maxStep, minStep };
}

export function dismissAndNavigateToSend(options: {
  onDismiss: () => void;
  navigate: (path: string) => void;
}) {
  options.onDismiss();
  options.navigate("/send");
}

export function handoffGuideNavigation(options: {
  path: string;
  dismissWizard: () => void;
  closeGuide: () => void;
  navigate: (path: string) => void;
}) {
  options.dismissWizard();
  options.closeGuide();
  options.navigate(options.path);
}

export function completeSuccessfulRequest(options: {
  requestId?: number | null;
  setSending: (sending: boolean) => void;
  setSent: (sent: boolean) => void;
  setLastRequestId: (requestId: number | null) => void;
  persistDismiss: () => void;
}) {
  options.setSending(false);
  options.setSent(true);
  options.setLastRequestId(options.requestId ?? null);
  options.persistDismiss();
}
