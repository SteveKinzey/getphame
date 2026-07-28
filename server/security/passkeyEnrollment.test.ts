import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  resolveWebauthnEnvironment: vi.fn(),
}));

vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  generateRegistrationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
}));
vi.mock("./webauthnEnvironment", () => ({ resolveWebauthnEnvironment: mocks.resolveWebauthnEnvironment }));
vi.mock("./passkeySessions", () => ({ hashSecurityValue: (value: string) => `hash:${value}`, issuePasskeySession: vi.fn() }));

import { beginPasskeyAuthentication } from "./passkeys";

function limitedResult<T>(rows: T[]) {
  return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => rows) })) })) };
}

function directResult<T>(rows: T[]) {
  return { from: vi.fn(() => ({ where: vi.fn(async () => rows) })) };
}

describe("guided passkey authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveWebauthnEnvironment.mockReturnValue({ rpID: "getphame.com", rpName: "Get Phame", origin: "https://getphame.com" });
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "challenge-123", rpId: "getphame.com" });
  });

  it("returns the same neutral state for an unknown account", async () => {
    const db = { select: vi.fn(() => limitedResult([])) };
    mocks.getDb.mockResolvedValue(db);
    await expect(beginPasskeyAuthentication("unknown@example.test", {} as never)).resolves.toEqual({ state: "enrollment_required" });
    expect(mocks.generateAuthenticationOptions).not.toHaveBeenCalled();
  });

  it("returns the same neutral state for an existing account without an active credential", async () => {
    const db = { select: vi.fn().mockReturnValueOnce(limitedResult([{ id: 42 }])).mockReturnValueOnce(directResult([])) };
    mocks.getDb.mockResolvedValue(db);
    await expect(beginPasskeyAuthentication("Member@Example.Test", {} as never)).resolves.toEqual({ state: "enrollment_required" });
    expect(mocks.generateAuthenticationOptions).not.toHaveBeenCalled();
  });

  it("starts the unchanged WebAuthn ceremony when an active credential exists", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(limitedResult([{ id: 42 }]))
        .mockReturnValueOnce(directResult([{ credentialId: "credential-1", transportsJson: '["internal"]' }])),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    mocks.getDb.mockResolvedValue(db);

    const result = await beginPasskeyAuthentication("member@example.test", {} as never);
    expect(result.state).toBe("authentication_ready");
    expect(result).toHaveProperty("ceremonyId");
    expect(mocks.generateAuthenticationOptions).toHaveBeenCalledWith(expect.objectContaining({
      rpID: "getphame.com",
      userVerification: "required",
      allowCredentials: [{ id: "credential-1", transports: ["internal"] }],
    }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, purpose: "authentication" }));
  });
});
