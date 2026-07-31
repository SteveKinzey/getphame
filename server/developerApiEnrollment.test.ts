import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEVELOPER_API_ACCEPTABLE_USE_VERSION,
  DEVELOPER_API_TERMS_VERSION,
  DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY,
  classifyDeveloperSendScopeRequest,
  isCurrentDeveloperApiTermsAcceptance,
  normalizeDeveloperSendScopeStatus,
} from "../shared/developerApiEnrollment";

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

describe("developer API enrollment policy", () => {
  it("requires the exact current Terms and Acceptable Use versions", () => {
    expect(DEVELOPER_API_TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(DEVELOPER_API_ACCEPTABLE_USE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      isCurrentDeveloperApiTermsAcceptance({
        termsVersion: DEVELOPER_API_TERMS_VERSION,
        acceptableUseVersion: DEVELOPER_API_ACCEPTABLE_USE_VERSION,
        termsAcceptedAt: 1_750_000_000_000,
      })
    ).toBe(true);
    expect(
      isCurrentDeveloperApiTermsAcceptance({
        termsVersion: "obsolete",
        acceptableUseVersion: DEVELOPER_API_ACCEPTABLE_USE_VERSION,
        termsAcceptedAt: 1_750_000_000_000,
      })
    ).toBe(false);
    expect(
      isCurrentDeveloperApiTermsAcceptance({
        termsVersion: DEVELOPER_API_TERMS_VERSION,
        acceptableUseVersion: DEVELOPER_API_ACCEPTABLE_USE_VERSION,
        termsAcceptedAt: null,
      })
    ).toBe(false);
  });

  it("keeps import-only access as the default and sends higher volume to manual review", () => {
    expect(normalizeDeveloperSendScopeStatus(undefined)).toBe("not_requested");
    expect(normalizeDeveloperSendScopeStatus("unexpected")).toBe(
      "not_requested"
    );
    expect(
      classifyDeveloperSendScopeRequest(
        DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY
      )
    ).toBe("standard");
    expect(
      classifyDeveloperSendScopeRequest(
        DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY + 1
      )
    ).toBe("high_volume");
  });
});

describe("developer API enrollment persistence and authorization", () => {
  it("uses an additive one-row-per-user enrollment model with review evidence", () => {
    const schema = readProjectFile("../drizzle/schema.ts");
    const migration = readProjectFile("../drizzle/0025_old_morgan_stark.sql");

    expect(schema).toContain("export const developerApiEnrollments");
    expect(schema).toContain('userId: integer("userId").notNull().unique()');
    expect(schema).toContain('termsVersion: varchar("termsVersion"');
    expect(schema).toContain(
      'acceptableUseVersion: varchar("acceptableUseVersion"'
    );
    expect(schema).toContain(
      'acceptanceFingerprint: varchar("acceptanceFingerprint"'
    );
    expect(schema).toContain(
      'sendScopeReviewedByUserId: integer("sendScopeReviewedByUserId")'
    );
    expect(migration).toContain("developer_api_enrollments");
    expect(migration.toUpperCase()).not.toContain("DROP TABLE");
    expect(migration.toUpperCase()).not.toContain("DROP COLUMN");
  });

  it("enforces enrollment in the key service and strips revoked send permission at authentication", () => {
    const keys = readProjectFile("./developerApiKeys.ts");
    const enrollment = readProjectFile("./developerApiEnrollment.ts");

    expect(keys).toContain(
      "assertDeveloperApiKeyScopesAllowed(params.userId, scopes)"
    );
    expect(keys).toContain(
      "removeUnapprovedDeveloperSendScope(row.userId, parseDeveloperApiScopes(row.scopes))"
    );
    expect(enrollment).toContain('scopes.includes("review_requests:send")');
    expect(enrollment).toContain(
      'scopes.filter((scope) => scope !== "review_requests:send")'
    );
    expect(enrollment).toContain('sendScopeStatus === "approved"');
    expect(enrollment).toContain(
      'riskClass === "standard" ? "approved" : "pending_review"'
    );
  });

  it("records privacy-safe acceptance evidence and reserves high-volume decisions for administrators", () => {
    const router = readProjectFile("./routers.ts");

    expect(router).toContain("acceptTerms: protectedProcedure");
    expect(router).toContain("termsAccepted: z.literal(true)");
    expect(router).toContain("acceptableUseAccepted: z.literal(true)");
    expect(router).toMatch(
      /fingerprintAuthValue\(\s*`developer-api-enrollment:\$\{clientIp\}:\$\{userAgent\}`\s*\)/
    );
    expect(router).toContain("reviewSendScope: adminProcedure");
    expect(router).toContain('status: z.enum(["approved", "denied"])');
    expect(router).toContain("confirmsExistingCustomersOnly: z.literal(true)");
    expect(router).toContain(
      "confirmsNoPurchasedOrScrapedLists: z.literal(true)"
    );
    expect(router).toContain(
      "confirmsIndividualCustomerActions: z.literal(true)"
    );
    expect(router).not.toContain("acceptanceIp:");
    expect(router).not.toContain("acceptanceUserAgent:");
  });
});

describe("developer API enrollment customer experience", () => {
  it("gates key creation and the optional send scope while preserving one-time secret handling", () => {
    const page = readProjectFile(
      "../client/src/pages/DeveloperIntegrations.tsx"
    );
    const panel = readProjectFile(
      "../client/src/components/DeveloperApiEnrollmentPanel.tsx"
    );
    const onboarding = readProjectFile(
      "../client/src/components/OnboardingWizard.tsx"
    );

    expect(page).toContain("<DeveloperApiEnrollmentPanel />");
    expect(page).toContain(
      'scope === "review_requests:send" && !enrollmentQuery.data?.sendScopeApproved'
    );
    expect(page).toContain("!enrollmentQuery.data?.termsAccepted");
    expect(page).toContain('data-testid="revealed-api-key"');
    expect(panel).toContain('href="/terms-of-service"');
    expect(panel).toContain('href="/compliance"');
    expect(panel).toContain("confirmsNoPurchasedOrScrapedLists: true");
    expect(panel).toContain("DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY");
    expect(onboarding).toContain("trpc.apiKey.acceptTerms.useMutation");
    expect(onboarding).toContain("trpc.apiKey.enrollment.useQuery");
    expect(onboarding).toContain('scopes: ["contacts:write"]');
    expect(onboarding).not.toContain('scopes: ["review_requests:send"]');
  });

  it("keeps every enrollment message available in all seven supported locales", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
    const requiredPaths = [
      "developerEnrollment.loading",
      "developerEnrollment.title",
      "developerEnrollment.description",
      "developerEnrollment.terms.title",
      "developerEnrollment.terms.description",
      "developerEnrollment.terms.current",
      "developerEnrollment.terms.termsLabel",
      "developerEnrollment.terms.readTerms",
      "developerEnrollment.terms.aupLabel",
      "developerEnrollment.terms.readGuide",
      "developerEnrollment.terms.accept",
      "developerEnrollment.terms.acceptedToast",
      "developerEnrollment.terms.requiredForKey",
      "developerEnrollment.terms.onboardingTitle",
      "developerEnrollment.send.title",
      "developerEnrollment.send.description",
      "developerEnrollment.send.approvedToast",
      "developerEnrollment.send.pendingToast",
      "developerEnrollment.send.acceptFirst",
      "developerEnrollment.send.approved",
      "developerEnrollment.send.pending",
      "developerEnrollment.send.pendingDetail",
      "developerEnrollment.send.businessName",
      "developerEnrollment.send.website",
      "developerEnrollment.send.useCase",
      "developerEnrollment.send.useCasePlaceholder",
      "developerEnrollment.send.monthlyVolume",
      "developerEnrollment.send.reviewThreshold",
      "developerEnrollment.send.consentProcess",
      "developerEnrollment.send.consentPlaceholder",
      "developerEnrollment.send.confirmCustomers",
      "developerEnrollment.send.confirmLists",
      "developerEnrollment.send.confirmActions",
      "developerEnrollment.send.resubmit",
      "developerEnrollment.send.request",
      "developerEnrollment.send.completeRequired",
      "developerEnrollment.send.requiredForScope",
      "developerEnrollment.send.scopeLocked",
    ] as const;

    for (const locale of locales) {
      const bundle = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      );
      for (const path of requiredPaths) {
        const value = getByPath(bundle, path);
        expect(value, `${locale} is missing ${path}`).toEqual(
          expect.any(String)
        );
        expect(
          (value as string).trim(),
          `${locale} has an empty ${path}`
        ).not.toBe("");
      }
    }
  });
});
