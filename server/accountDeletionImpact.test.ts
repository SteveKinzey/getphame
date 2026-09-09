import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("account deletion impact preview", () => {
  it("uses an authenticated aggregate-only preview and a shared cleanup scope", () => {
    const helper = read("server/accountDeletionImpact.ts");
    const router = read("server/routers.ts");

    expect(helper).toContain("getAccountDeletionImpact(userId: number)");
    expect(helper).toContain("deleteAccountOwnedData(userId: number)");
    expect(helper).toContain("categories.reduce((total, category) => total + category.count, 0)");
    expect(helper).toContain('key: "developerConnections"');
    expect(helper).toContain('key: "securitySettings"');
    expect(helper).toContain("db.delete(sourceConnections).where(eq(sourceConnections.userId, userId))");
    expect(helper).toContain("db.delete(contactConsentEvidence).where(eq(contactConsentEvidence.userId, userId))");
    expect(helper).toContain("db.delete(emailTemplateRevisions).where(eq(emailTemplateRevisions.userId, userId))");
    expect(helper).not.toContain("label:");
    expect(helper).not.toContain("encryptedPass");
    expect(helper).not.toContain("select({ apiKey:");
    expect(helper).not.toContain("select({ encryptedApiKey:");
    expect(router).toContain("previewDeletion: protectedProcedure.query");
    expect(router).toContain("getAccountDeletionImpact(ctx.user.id)");
    expect(router).toContain("await deleteAccountOwnedData(uid)");
  });

  it("keeps user-facing deletion category names localized on the client", () => {
    const settings = read("client/src/pages/Settings.tsx");
    const fallback = read("client/src/lib/i18nCompleteFallbackResources.json");

    expect(settings).toContain("settings.deleteAccount.previewCategories.${category.key}");
    for (const locale of ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const catalog = read(`client/public/locales/${locale}/translation.json`);
      expect(catalog).toContain('"previewCategories"');
      expect(catalog).toContain('"mailConnections"');
      expect(catalog).toContain('"developerConnections"');
      expect(catalog).toContain('"securitySettings"');
    }
    expect(fallback).toContain('"previewCategories"');
  });
});
