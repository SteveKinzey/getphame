import { describe, expect, it, vi } from "vitest";
import {
  completeSuccessfulRequest,
  dismissAndNavigateToSend,
  getOnboardingFlow,
  handoffGuideNavigation,
} from "./onboardingFlow";

describe("onboarding flow", () => {
  it("keeps the WordPress connector outside the free-user setup path", () => {
    expect(
      getOnboardingFlow({
        smtpConnected: true,
        hasPlatform: true,
        hasSentRequest: false,
        canAccessConnector: false,
      })
    ).toEqual({ canAccessConnector: false, maxStep: 3, minStep: 3 });
  });

  it("makes the optional connector available to paid or admin users", () => {
    expect(
      getOnboardingFlow({
        smtpConnected: true,
        hasPlatform: true,
        hasSentRequest: true,
        canAccessConnector: true,
      })
    ).toEqual({ canAccessConnector: true, maxStep: 4, minStep: 4 });
  });

  it("dismisses the overlay before navigating without prematurely persisting dismissal", () => {
    const order: string[] = [];
    dismissAndNavigateToSend({
      onDismiss: vi.fn(() => order.push("dismiss")),
      navigate: vi.fn(path => order.push(`navigate:${path}`)),
    });

    expect(order).toEqual(["dismiss", "navigate:/send"]);
  });

  it("persists onboarding dismissal only when a request succeeds", () => {
    const order: string[] = [];
    completeSuccessfulRequest({
      requestId: 42,
      setSending: vi.fn(value => order.push(`sending:${value}`)),
      setSent: vi.fn(value => order.push(`sent:${value}`)),
      setLastRequestId: vi.fn(value => order.push(`request:${value}`)),
      persistDismiss: vi.fn(() => order.push("persist")),
    });

    expect(order).toEqual([
      "sending:false",
      "sent:true",
      "request:42",
      "persist",
    ]);
  });

  it("dismisses the underlying wizard before the setup guide navigates", () => {
    const order: string[] = [];
    handoffGuideNavigation({
      path: "/send",
      dismissWizard: vi.fn(() => order.push("dismiss-wizard")),
      closeGuide: vi.fn(() => order.push("close-guide")),
      navigate: vi.fn(path => order.push(`navigate:${path}`)),
    });

    expect(order).toEqual(["dismiss-wizard", "close-guide", "navigate:/send"]);
  });
});
