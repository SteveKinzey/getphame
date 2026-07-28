import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));

import {
  decodeTrackingToken,
  encodeTrackingToken,
  handleClickRedirect,
  wrapClickUrl,
} from "./emailTracking";

const TRACKING_SECRET = "tracking-test-key-with-more-than-thirty-two-characters";
const SAFE_FALLBACK = "https://getphame.app";

function clickRequest(token: string, url?: string): Request {
  return {
    params: { token },
    query: url === undefined ? {} : { url },
    headers: {},
    ip: "127.0.0.1",
    get: vi.fn().mockReturnValue(undefined),
  } as unknown as Request;
}

function clickResponse() {
  const redirect = vi.fn();
  return {
    response: { redirect } as unknown as Response,
    redirect,
  };
}

beforeEach(() => {
  vi.stubEnv("EMAIL_TRACKING_SECRET", TRACKING_SECRET);
  vi.stubEnv("JWT_SECRET", "legacy-session-key-with-more-than-thirty-two-characters");
  mocks.getDb.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("email click-tracking destination binding", () => {
  it("round-trips a signed open token with a full-length signature", () => {
    const token = encodeTrackingToken(101, 22, 9);
    expect(token.split(".")[1].length).toBeGreaterThanOrEqual(40);
    expect(decodeTrackingToken(token)).toEqual({ requestId: 101, userId: 22, templateId: 9 });
  });

  it("redirects a valid destination-bound click token", async () => {
    const openToken = encodeTrackingToken(101, 22, 9);
    const wrapped = new URL(wrapClickUrl("https://reviews.example.test/r/101?source=email", openToken, "https://getphame.app"));
    const clickToken = wrapped.pathname.split("/").at(-1)!;
    const destination = wrapped.searchParams.get("url")!;
    const { response, redirect } = clickResponse();

    await handleClickRedirect(clickRequest(clickToken, destination), response);

    expect(redirect).toHaveBeenCalledWith(302, destination);
  });

  it("falls back safely when an attacker changes a signed destination", async () => {
    const openToken = encodeTrackingToken(102, 22, null);
    const wrapped = new URL(wrapClickUrl("https://reviews.example.test/original", openToken, "https://getphame.app"));
    const clickToken = wrapped.pathname.split("/").at(-1)!;
    const { response, redirect } = clickResponse();

    await handleClickRedirect(clickRequest(clickToken, "https://attacker.example/phish"), response);

    expect(redirect).toHaveBeenCalledWith(302, SAFE_FALLBACK);
  });

  it.each([
    ["missing destination", undefined],
    ["malformed destination", "not-a-url"],
    ["unsafe protocol", "javascript:alert(1)"],
  ])("falls back safely for a %s", async (_label, destination) => {
    const token = encodeTrackingToken(103, 22, null);
    const { response, redirect } = clickResponse();

    await handleClickRedirect(clickRequest(token, destination), response);

    expect(redirect).toHaveBeenCalledWith(302, SAFE_FALLBACK);
  });

  it("falls back safely for a malformed token", async () => {
    const { response, redirect } = clickResponse();
    await handleClickRedirect(clickRequest("not-a-valid-token", "https://reviews.example.test"), response);
    expect(redirect).toHaveBeenCalledWith(302, SAFE_FALLBACK);
  });

  it("refuses to issue tokens without the dedicated tracking secret", () => {
    vi.stubEnv("EMAIL_TRACKING_SECRET", "");
    expect(() => encodeTrackingToken(104, 22, null)).toThrow("EMAIL_TRACKING_SECRET");
  });
});
