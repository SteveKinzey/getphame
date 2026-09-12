import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  processDueSourceAutomationEvents,
  type SourceAutomationProcessorDeps,
} from "./sourceAutomationProcessor";

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    userId: 7,
    sourceConnectionId: 5,
    sourceEventId: "order-1001",
    preferredLocale: "en",
    templateId: 3,
    platformId: 2,
    attemptCount: 1,
    ...overrides,
  } as any;
}

function context(overrides: Record<string, unknown> = {}) {
  return {
    event: event(),
    contact: {
      id: 9,
      name: "Customer",
      email: "customer@example.com",
      optedOut: 0,
    },
    source: {
      automationEnabled: true,
      automationMode: "review_request",
      pausedAt: null,
      dryRun: false,
    },
    ...overrides,
  } as any;
}

function createDeps(): SourceAutomationProcessorDeps {
  return {
    claimDue: vi.fn(),
    getContext: vi.fn(),
    complete: vi.fn(),
    retryOrFail: vi.fn(),
    deliver: vi.fn(),
  };
}

describe("source automation scheduled processor", () => {
  let deps: SourceAutomationProcessorDeps;

  beforeEach(() => {
    deps = createDeps();
    vi.mocked(deps.claimDue)
      .mockResolvedValueOnce(event())
      .mockResolvedValue(null);
    vi.mocked(deps.getContext).mockResolvedValue(context());
    vi.mocked(deps.complete).mockResolvedValue(undefined);
    vi.mocked(deps.retryOrFail).mockResolvedValue({
      failed: false,
      scheduledAt: 301_000,
    });
    vi.mocked(deps.deliver).mockResolvedValue({
      requestId: 44,
      delivery: "sent",
      scheduledAt: null,
      preferredLocale: "en",
      templateRevisionId: 20,
      englishTemplateRevisionId: 20,
      platformId: 2,
      sendLimitStatus: null,
    });
  });

  it("delivers one claimed event and records the immutable delivery snapshots", async () => {
    await expect(
      processDueSourceAutomationEvents(1_000, deps)
    ).resolves.toEqual({
      checked: 1,
      sent: 1,
      queued: 0,
      suppressed: 0,
      dryRun: 0,
      retried: 0,
      failed: 0,
    });
    expect(deps.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceConnectionId: 5,
        sourceEventId: "order-1001",
        contactId: 9,
        templateId: 3,
        platformId: 2,
      })
    );
    expect(deps.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        customerRequestId: 44,
      })
    );
  });

  it("suppresses an opted-out contact without calling delivery", async () => {
    vi.mocked(deps.getContext).mockResolvedValue(
      context({
        contact: {
          id: 9,
          name: "Customer",
          email: "customer@example.com",
          optedOut: 1,
        },
      })
    );
    const result = await processDueSourceAutomationEvents(1_000, deps);
    expect(result.suppressed).toBe(1);
    expect(deps.deliver).not.toHaveBeenCalled();
    expect(deps.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "suppressed",
        errorCode: "CONTACT_SUPPRESSED",
      })
    );
  });

  it("honors a source dry run without sending", async () => {
    vi.mocked(deps.getContext).mockResolvedValue(
      context({
        source: {
          automationEnabled: true,
          automationMode: "review_request",
          pausedAt: null,
          dryRun: true,
        },
      })
    );
    const result = await processDueSourceAutomationEvents(1_000, deps);
    expect(result.dryRun).toBe(1);
    expect(deps.deliver).not.toHaveBeenCalled();
    expect(deps.complete).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dry_run" })
    );
  });

  it("retries a transient delivery failure with a stable error code", async () => {
    vi.mocked(deps.deliver).mockRejectedValue(
      new Error("SMTP not configured. Connect email.")
    );
    const result = await processDueSourceAutomationEvents(1_000, deps);
    expect(result.retried).toBe(1);
    expect(deps.retryOrFail).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "SMTP_NOT_READY",
        attemptCount: 1,
        now: 1_000,
      })
    );
  });

  it("caps each run at 25 events", async () => {
    vi.mocked(deps.claimDue).mockReset();
    vi.mocked(deps.claimDue).mockResolvedValue(event());
    const result = await processDueSourceAutomationEvents(1_000, deps);
    expect(result.checked).toBe(25);
    expect(deps.claimDue).toHaveBeenCalledTimes(25);
  });
});
