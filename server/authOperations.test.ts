import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuthDiagnosticEvent: vi.fn(),
  createAuthHealthCheck: vi.fn(),
  getDb: vi.fn(),
  getLatestAuthDiagnosticByTokenFingerprint: vi.fn(),
  pruneAuthOperationsData: vi.fn(),
  testSmtpConnection: vi.fn(),
}));

vi.mock("./db", () => ({
  createAuthDiagnosticEvent: mocks.createAuthDiagnosticEvent,
  createAuthHealthCheck: mocks.createAuthHealthCheck,
  getDb: mocks.getDb,
  getLatestAuthDiagnosticByTokenFingerprint:
    mocks.getLatestAuthDiagnosticByTokenFingerprint,
  pruneAuthOperationsData: mocks.pruneAuthOperationsData,
}));

vi.mock("./smtp", () => ({ testSmtpConnection: mocks.testSmtpConnection }));

import {
  fingerprintAuthValue,
  maskDiagnosticEmail,
  recordAuthLifecycleEvent,
  redactAuthDiagnosticDetail,
  runAuthHealthCheck,
} from "./authOperations";

function stubRequiredEnvironment() {
  vi.stubEnv("DATABASE_URL", "postgres://example.invalid/getphame");
  vi.stubEnv("JWT_SECRET", "diagnostic-test-secret-that-is-long-enough");
  vi.stubEnv("APP_BASE_URL", "https://getphame.app");
  vi.stubEnv("SYSTEM_SMTP_HOST", "smtp.resend.com");
  vi.stubEnv("SYSTEM_SMTP_PORT", "587");
  vi.stubEnv("SYSTEM_SMTP_USER", "resend");
  vi.stubEnv("SYSTEM_SMTP_PASS", "re_test_secret");
  vi.stubEnv("SYSTEM_FROM_EMAIL", "login@getphame.app");
}

describe("authentication operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRequiredEnvironment();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("masks recipients, produces deterministic fingerprints, and redacts secrets", () => {
    expect(maskDiagnosticEmail("  Steve.Builder@Example.com ")).toBe(
      "st******@ex***.com"
    );
    expect(fingerprintAuthValue("email:steve.builder@example.com")).toBe(
      fingerprintAuthValue("email:steve.builder@example.com")
    );

    const detail = redactAuthDiagnosticDetail(
      "Delivery failed for steve@example.com?token=abcdef123456 and bearer very-secret-token"
    );
    expect(detail).not.toContain("steve@example.com");
    expect(detail).not.toContain("abcdef123456");
    expect(detail).not.toContain("very-secret-token");
  });

  it("persists only masked and fingerprinted lifecycle identifiers", async () => {
    mocks.createAuthDiagnosticEvent.mockResolvedValue({ id: 1 });
    await recordAuthLifecycleEvent({
      requestId: "req-1",
      eventType: "provider_accepted",
      outcome: "ok",
      email: "steve@example.com",
      token: "raw-login-token",
      providerMessageId: "provider-123",
    });

    const event = mocks.createAuthDiagnosticEvent.mock.calls[0]?.[0];
    expect(event.emailMasked).toBe("st***@ex***.com");
    expect(event.emailFingerprint).not.toContain("steve@example.com");
    expect(event.tokenFingerprint).not.toContain("raw-login-token");
    expect(JSON.stringify(event)).not.toContain("raw-login-token");
  });

  it("runs every non-destructive production signal and records retention cleanup", async () => {
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    };
    mocks.getDb.mockResolvedValue(database);
    mocks.testSmtpConnection.mockResolvedValue({ ok: true });
    mocks.createAuthHealthCheck.mockResolvedValue({ id: 7 });
    mocks.pruneAuthOperationsData.mockResolvedValue({
      eventsDeleted: 0,
      healthChecksDeleted: 0,
    });

    const result = await runAuthHealthCheck({
      triggerSource: "scheduled",
      scheduleCronTaskUid: "task-auth-health",
      now: 1_700_000_000_000,
    });

    expect(result).toMatchObject({
      overallStatus: "ok",
      configStatus: "ok",
      databaseStatus: "ok",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "ok",
      providerName: "Resend SMTP",
      scheduleCronTaskUid: "task-auth-health",
    });
    expect(database.select).toHaveBeenCalledTimes(2);
    expect(mocks.testSmtpConnection).toHaveBeenCalledTimes(1);
    expect(mocks.createAuthHealthCheck).toHaveBeenCalledWith(
      expect.objectContaining({ overallStatus: "ok" })
    );
    expect(mocks.pruneAuthOperationsData).toHaveBeenCalledWith(
      1_700_000_000_000
    );
  });

  it("records a deterministic failure without sending email when configuration and DB are unavailable", async () => {
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("SYSTEM_SMTP_PASS", "");
    mocks.getDb.mockResolvedValue(null);
    mocks.createAuthHealthCheck.mockResolvedValue({ id: 8 });

    const result = await runAuthHealthCheck({ triggerSource: "manual" });

    expect(result.overallStatus).toBe("fail");
    expect(result.configStatus).toBe("fail");
    expect(result.databaseStatus).toBe("fail");
    expect(result.emailProviderStatus).toBe("fail");
    expect(mocks.testSmtpConnection).not.toHaveBeenCalled();
    expect(mocks.createAuthHealthCheck).toHaveBeenCalledTimes(1);
  });
});
