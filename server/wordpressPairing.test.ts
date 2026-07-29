import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createDeveloperApiKey: vi.fn(),
  revokeDeveloperApiKey: vi.fn(),
  getDeveloperApiEnrollmentStatus: vi.fn(),
  createSourceConnection: vi.fn(),
  archiveSourceConnection: vi.fn(),
  encryptPassword: vi.fn(),
  decryptPassword: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./developerApiKeys", () => ({
  createDeveloperApiKey: mocks.createDeveloperApiKey,
  revokeDeveloperApiKey: mocks.revokeDeveloperApiKey,
}));
vi.mock("./developerApiEnrollment", () => ({ getDeveloperApiEnrollmentStatus: mocks.getDeveloperApiEnrollmentStatus }));
vi.mock("./sourceConnections", () => ({
  createSourceConnection: mocks.createSourceConnection,
  archiveSourceConnection: mocks.archiveSourceConnection,
}));
vi.mock("./smtp", () => ({
  encryptPassword: mocks.encryptPassword,
  decryptPassword: mocks.decryptPassword,
}));

import {
  approveWordPressPairing,
  claimWordPressPairing,
  initiateWordPressPairing,
  WordPressPairingError,
} from "./wordpressPairing";
import { sourceConnections, wordpressPairings } from "../drizzle/schema";

type Pairing = Record<string, any>;
type State = {
  pairing: Pairing | null;
  inserted: Pairing | null;
};

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function createDb(state: State) {
  return {
    select: vi.fn(() => {
      let table: unknown;
      const chain: any = {
        from(value: unknown) { table = value; return chain; },
        where() { return chain; },
        limit() {
          if (table === wordpressPairings) return Promise.resolve(state.pairing ? [state.pairing] : []);
          if (table === sourceConnections) return Promise.resolve([{ publicId: "src_wordpress_test" }]);
          return Promise.resolve([]);
        },
      };
      return chain;
    }),
    insert: vi.fn((table: unknown) => {
      const chain: any = {
        values(value: Pairing) {
          if (table === wordpressPairings) {
            state.inserted = { id: 42, ...value };
            state.pairing = state.inserted;
          }
          return chain;
        },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve([{ insertId: 42, affectedRows: 1 }]).then(resolve, reject);
        },
      };
      return chain;
    }),
    update: vi.fn((table: unknown) => {
      let patch: Pairing = {};
      const chain: any = {
        set(value: Pairing) { patch = value; return chain; },
        where() { return chain; },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          if (table === wordpressPairings && state.pairing) Object.assign(state.pairing, patch);
          return Promise.resolve([{ affectedRows: state.pairing ? 1 : 0 }]).then(resolve, reject);
        },
      };
      return chain;
    }),
  };
}

function pendingPairing(overrides: Partial<Pairing> = {}): Pairing {
  const secret = "wps_" + "a".repeat(43);
  return {
    id: 17,
    publicId: "wpb_" + "b".repeat(24),
    secretHash: hashSecret(secret),
    siteUrl: "https://store.example",
    siteHost: "store.example",
    siteLabel: "Store Example",
    status: "pending",
    userId: null,
    apiKeyId: null,
    sourceConnectionId: null,
    encryptedApiKey: null,
    expiresAt: Date.now() + 60_000,
    approvedAt: null,
    claimedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pairingSecret: secret,
    ...overrides,
  };
}

describe("WordPress self-service pairing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T00:00:00.000Z"));
    vi.clearAllMocks();
    mocks.getDeveloperApiEnrollmentStatus.mockResolvedValue({ termsAccepted: true });
    mocks.createDeveloperApiKey.mockResolvedValue({ id: 71, rawKey: "gp_live_test_wordpress_key" });
    mocks.createSourceConnection.mockResolvedValue({ id: 81 });
    mocks.encryptPassword.mockImplementation((value: string) => `encrypted:${value}`);
    mocks.decryptPassword.mockImplementation((value: string) => value.replace("encrypted:", ""));
  });

  afterEach(() => vi.useRealTimers());

  it("creates a short-lived pairing with a normalized site URL and no account credentials", async () => {
    const state: State = { pairing: null, inserted: null };
    mocks.getDb.mockResolvedValue(createDb(state));

    const result = await initiateWordPressPairing({ siteUrl: "HTTPS://Store.Example/path/", siteLabel: "  Main Store  " });

    expect(result).toMatchObject({
      pairingId: expect.stringMatching(/^wpb_/),
      pairingSecret: expect.stringMatching(/^wps_/),
      approvalUrl: expect.stringContaining("/developer?wordpress_pairing=wpb_"),
      pollAfterSeconds: 4,
    });
    expect(state.inserted).toMatchObject({
      siteUrl: "https://store.example/path",
      siteHost: "store.example",
      siteLabel: "Main Store",
      status: "pending",
      secretHash: hashSecret(result.pairingSecret),
    });
    expect(state.inserted).not.toHaveProperty("apiKey");
  });

  it("requires API terms before authorizing a WordPress site", async () => {
    const state: State = { pairing: pendingPairing(), inserted: null };
    mocks.getDb.mockResolvedValue(createDb(state));
    mocks.getDeveloperApiEnrollmentStatus.mockResolvedValue({ termsAccepted: false });

    await expect(approveWordPressPairing({ userId: 9, pairingId: state.pairing!.publicId }))
      .rejects.toMatchObject<Partial<WordPressPairingError>>({ code: "TERMS_REQUIRED" });
    expect(mocks.createDeveloperApiKey).not.toHaveBeenCalled();
    expect(state.pairing?.status).toBe("pending");
  });

  it("creates a least-privilege key and source, then allows the site to claim credentials only once", async () => {
    const state: State = { pairing: pendingPairing(), inserted: null };
    mocks.getDb.mockResolvedValue(createDb(state));

    const approved = await approveWordPressPairing({ userId: 9, pairingId: state.pairing!.publicId });
    expect(approved).toMatchObject({ status: "approved", siteHost: "store.example" });
    expect(mocks.createDeveloperApiKey).toHaveBeenCalledWith(expect.objectContaining({
      userId: 9,
      scopes: ["contacts:write"],
    }));
    expect(mocks.createSourceConnection).toHaveBeenCalledWith(expect.objectContaining({
      userId: 9,
      apiKeyId: 71,
      provider: "woocommerce",
    }));
    expect(state.pairing).toMatchObject({
      status: "approved",
      userId: 9,
      apiKeyId: 71,
      sourceConnectionId: 81,
      encryptedApiKey: "encrypted:gp_live_test_wordpress_key",
    });

    const claimed = await claimWordPressPairing({
      pairingId: state.pairing!.publicId,
      pairingSecret: state.pairing!.pairingSecret,
    });
    expect(claimed).toEqual({
      apiKey: "gp_live_test_wordpress_key",
      sourceId: "src_wordpress_test",
      siteHost: "store.example",
    });
    expect(state.pairing).toMatchObject({ status: "claimed", encryptedApiKey: null });

    await expect(claimWordPressPairing({
      pairingId: state.pairing!.publicId,
      pairingSecret: state.pairing!.pairingSecret,
    })).rejects.toMatchObject<Partial<WordPressPairingError>>({ code: "ALREADY_CLAIMED" });
  });

  it("does not reveal connection state for a wrong pairing secret", async () => {
    const state: State = { pairing: pendingPairing(), inserted: null };
    mocks.getDb.mockResolvedValue(createDb(state));

    await expect(claimWordPressPairing({
      pairingId: state.pairing!.publicId,
      pairingSecret: "wps_" + "z".repeat(43),
    })).rejects.toMatchObject<Partial<WordPressPairingError>>({ code: "NOT_FOUND" });
  });
});
