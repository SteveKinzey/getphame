import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ADAPTIVE_SEND_BURST_CAPS,
  getAdaptiveSendBurstCapForTier,
  getAdaptiveSendVelocityAdvice,
  normalizeAdaptiveSendBurstCaps,
} from "../shared/adaptiveSendLimits";
import {
  processManualMonthlyDiagnosticsSnapshot,
  type ManualMonthlyDiagnosticsProcessorDeps,
} from "./monthlyDiagnosticsSchedule";

const now = Date.parse("2026-09-10T14:30:00.000Z");

describe("adaptive send burst caps policy", () => {
  it("normalizes and bounds caps defensively within safe platform boundaries", () => {
    expect(normalizeAdaptiveSendBurstCaps(null)).toEqual(
      DEFAULT_ADAPTIVE_SEND_BURST_CAPS
    );
    expect(
      normalizeAdaptiveSendBurstCaps({
        free: -5,
        pro: 500,
        annual: 75,
        lifetime: 120,
      })
    ).toEqual({
      free: 1,
      pro: 200,
      annual: 75,
      lifetime: 120,
    });
  });

  it("resolves the configured tier cap and defaults unknown tiers to the free cap", () => {
    const caps = { free: 12, pro: 35, annual: 60, lifetime: 110 };
    expect(getAdaptiveSendBurstCapForTier(caps, "free")).toBe(12);
    expect(getAdaptiveSendBurstCapForTier(caps, "pro")).toBe(35);
    expect(getAdaptiveSendBurstCapForTier(caps, "annual")).toBe(60);
    expect(getAdaptiveSendBurstCapForTier(caps, "lifetime")).toBe(110);
    expect(getAdaptiveSendBurstCapForTier(caps, "enterprise_unknown")).toBe(12);
  });

  it("factors the burst cap into send velocity advice without mutating remaining capacity", () => {
    const advice = getAdaptiveSendVelocityAdvice(50, 40, 25);
    expect(advice).toEqual({
      requestedCount: 50,
      currentRemaining: 25,
      estimatedSendCount: 25,
      estimatedOverCapacityCount: 25,
      maxBurstCap: 25,
      isEstimate: true,
    });
  });
});

describe("manual monthly diagnostics snapshot processor", () => {
  it("creates an idempotent snapshot with the manual hourly key and delivers reports once", async () => {
    const sendReport = vi
      .fn()
      .mockResolvedValue({ provider: "sendgrid", messageId: "message-manual" });
    const finishDelivery = vi.fn().mockResolvedValue(undefined);
    const saveRun = vi.fn().mockResolvedValue(undefined);

    const deps: ManualMonthlyDiagnosticsProcessorDeps = {
      getOrCreateSchedule: vi.fn().mockResolvedValue({ id: 1, enabled: true }),
      getScheduleByTaskUid: vi.fn().mockResolvedValue({ id: 1, enabled: true }),
      snapshotRun: vi.fn().mockResolvedValue({
        run: {
          id: 55,
          scheduleId: 1,
          reportMonthKey: "2026-08",
          snapshotKey: "manual:496924",
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
        },
        created: true,
      }),
      loadSource: vi.fn().mockResolvedValue({
        consent: {
          savedContactsTotal: 15,
          explicitConsentTotal: 11,
          optedOutTotal: 1,
        },
        authRows: [],
        authTotalMatching: 0,
      }),
      saveRun,
      listPending: vi.fn().mockResolvedValue([
        {
          id: 701,
          runId: 55,
          recipientUserId: 1,
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
        id: 701,
        runId: 55,
        recipientUserId: 1,
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
        .mockResolvedValue({ id: 1, email: "admin@example.test" }),
      finishDelivery,
      sendReport,
    };

    const result = await processManualMonthlyDiagnosticsSnapshot(now, deps);
    expect(result).toMatchObject({
      ok: true,
      reportMonthKey: "2026-08",
      summary: { attempted: 1, sent: 1, failed: 0, unavailable: 0 },
    });
    expect(sendReport).toHaveBeenCalledTimes(1);
    expect(finishDelivery).toHaveBeenCalledWith({
      deliveryId: 701,
      state: "sent",
      now,
    });

    const terminalResult = await processManualMonthlyDiagnosticsSnapshot(now, {
      ...deps,
      snapshotRun: vi.fn().mockResolvedValue({
        run: {
          id: 55,
          scheduleId: 1,
          reportMonthKey: "2026-08",
          snapshotKey: "manual:496924",
          snapshotGeneratedAt: now,
          status: "completed",
          savedContactsTotal: 15,
          explicitConsentTotal: 11,
          withoutExplicitConsentTotal: 4,
          optedOutTotal: 1,
          authTotalMatching: 0,
          authExportedRows: 0,
          authTruncated: false,
          consentFilename: "getphame-consent-posture-2026-08.csv",
          authFilename: "getphame-auth-health-2026-08.csv",
          errorCode: null,
          createdAt: now,
          completedAt: now,
        },
        created: false,
      }),
    });

    expect(terminalResult).toEqual({
      ok: true,
      skipped: "snapshot_already_terminal",
      reportMonthKey: "2026-08",
    });
  });
});
