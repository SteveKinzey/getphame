import { describe, expect, it, vi } from "vitest";
import {
  MONTHLY_DIAGNOSTICS_ADMIN_CONTROLLABLE,
  MONTHLY_DIAGNOSTICS_CRON,
  isValidRecipientEmail,
  processMonthlyDiagnosticsExport,
  type MonthlyDiagnosticsProcessorDeps,
} from "./monthlyDiagnosticsSchedule";

const now = Date.parse("2026-09-01T08:10:00.000Z");
const run = {
  id: 41,
  scheduleId: 1,
  reportMonthKey: "2026-08",
  snapshotGeneratedAt: now,
  status: "preparing",
  savedContactsTotal: 0,
  explicitConsentTotal: 0,
  withoutExplicitConsentTotal: 0,
  optedOutTotal: 0,
  authTotalMatching: 0,
  authExportedRows: 0,
  authTruncated: false,
  consentFilename: null,
  authFilename: null,
  errorCode: null,
  createdAt: now,
  completedAt: null,
};

function deps(overrides: Partial<MonthlyDiagnosticsProcessorDeps> = {}) {
  return {
    getScheduleByTaskUid: vi.fn().mockResolvedValue({ id: 1, enabled: true }),
    snapshotRun: vi.fn().mockResolvedValue({ run: { ...run }, created: true }),
    loadSource: vi.fn().mockResolvedValue({
      consent: {
        savedContactsTotal: 10,
        explicitConsentTotal: 7,
        optedOutTotal: 2,
      },
      authRows: [],
      authTotalMatching: 0,
    }),
    saveRun: vi.fn().mockResolvedValue(undefined),
    listPending: vi.fn().mockResolvedValue([
      {
        id: 91,
        runId: 41,
        recipientUserId: 5,
        state: "pending",
        attemptCount: 0,
        attemptedAt: null,
        sentAt: null,
        errorCode: null,
        createdAt: now,
        updatedAt: now,
      },
    ]),
    claimDelivery: vi.fn().mockResolvedValue({
      id: 91,
      runId: 41,
      recipientUserId: 5,
      state: "attempted",
      attemptCount: 1,
      attemptedAt: now,
      sentAt: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
    }),
    resolveRecipient: vi
      .fn()
      .mockResolvedValue({ id: 5, email: "admin@example.test" }),
    finishDelivery: vi.fn().mockResolvedValue(undefined),
    sendReport: vi
      .fn()
      .mockResolvedValue({ provider: "sendgrid", messageId: "message-1" }),
    ...overrides,
  } as MonthlyDiagnosticsProcessorDeps;
}

describe("monthly diagnostics processor", () => {
  it("keeps a future admin schedule control and the authorized monthly cron", () => {
    expect(MONTHLY_DIAGNOSTICS_ADMIN_CONTROLLABLE).toBe(true);
    expect(MONTHLY_DIAGNOSTICS_CRON).toBe("0 10 8 1 * *");
  });

  it("accepts only syntactically valid nonempty recipient addresses", () => {
    expect(isValidRecipientEmail("admin@example.test")).toBe(true);
    expect(isValidRecipientEmail(" ")).toBe(false);
    expect(isValidRecipientEmail("invalid-address")).toBe(false);
    expect(
      isValidRecipientEmail("admin@example.test\r\nBcc: attacker@test")
    ).toBe(false);
  });

  it("atomically claims pending delivery before sending and never sends an unclaimed row", async () => {
    const dependencies = deps();
    const result = await processMonthlyDiagnosticsExport(
      "owned-task",
      now,
      dependencies
    );
    expect(result).toMatchObject({
      ok: true,
      reportMonthKey: "2026-08",
      summary: { attempted: 1, sent: 1, failed: 0, unavailable: 0 },
    });
    expect(dependencies.claimDelivery).toHaveBeenCalledWith(91, now);
    expect(dependencies.sendReport).toHaveBeenCalledTimes(1);
    expect(dependencies.finishDelivery).toHaveBeenCalledWith({
      deliveryId: 91,
      state: "sent",
      now,
    });

    const noClaim = deps({ claimDelivery: vi.fn().mockResolvedValue(null) });
    await processMonthlyDiagnosticsExport("owned-task", now, noClaim);
    expect(noClaim.sendReport).not.toHaveBeenCalled();
  });

  it("records recipient_unavailable after current role/email revalidation and does not send", async () => {
    const dependencies = deps({
      resolveRecipient: vi.fn().mockResolvedValue(null),
    });
    const result = await processMonthlyDiagnosticsExport(
      "owned-task",
      now,
      dependencies
    );
    expect(result).toMatchObject({
      summary: { attempted: 1, sent: 0, failed: 0, unavailable: 1 },
    });
    expect(dependencies.sendReport).not.toHaveBeenCalled();
    expect(dependencies.finishDelivery).toHaveBeenCalledWith({
      deliveryId: 91,
      state: "recipient_unavailable",
      errorCode: "recipient_unavailable",
      now,
    });
  });

  it("treats a provider error as terminal failed and does not auto-retry a terminal month", async () => {
    let currentStatus = "preparing";
    const sendReport = vi
      .fn()
      .mockRejectedValue(new Error("ambiguous provider"));
    const dependencies = deps({
      snapshotRun: vi.fn().mockImplementation(async () => ({
        run: { ...run, status: currentStatus },
        created: currentStatus === "preparing",
      })),
      saveRun: vi.fn().mockImplementation(async input => {
        currentStatus = input.status;
      }),
      sendReport,
    });

    await processMonthlyDiagnosticsExport("owned-task", now, dependencies);
    await processMonthlyDiagnosticsExport(
      "owned-task",
      now + 10_000,
      dependencies
    );

    expect(sendReport).toHaveBeenCalledTimes(1);
    expect(dependencies.finishDelivery).toHaveBeenCalledWith({
      deliveryId: 91,
      state: "failed",
      errorCode: "delivery_failed",
      now,
    });
  });
});
