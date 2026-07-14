import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildMergedProfileValues,
  buildMergedUserValues,
  chooseSmtpMergeWinner,
  combineAccountsAsAdmin,
  deleteAccountAsAdmin,
} from "./accountManagement";

describe("administrative account-management safeguards", () => {
  it("prevents an administrator from deleting their own signed-in account", async () => {
    await expect(deleteAccountAsAdmin(7, 7)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "You cannot delete your own administrator account.",
    });
  });

  it("requires two different accounts and keeps the signed-in administrator as the survivor", async () => {
    await expect(combineAccountsAsAdmin(7, 9, 9)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Choose two different accounts.",
    });
    await expect(combineAccountsAsAdmin(7, 7, 9)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Your signed-in administrator account must be the account that remains.",
    });
  });
});

describe("duplicate-account data preservation", () => {
  it("keeps table-by-table transfer and conflict protection for every user-owned account-data category", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/accountManagement.ts"), "utf8");
    const transferredTables = [
      "customerRequests",
      "savedContacts",
      "emailTemplates",
      "reviewPlatforms",
      "followUpReminders",
      "emailEvents",
      "wooCustomers",
      "wooSyncLogs",
      "wooPendingImports",
      "apiKeys",
      "apiImportEvents",
      "webhookConfigs",
      "webhookDeliveryLogs",
      "clientReviews",
      "churnSurveys",
      "pageEvents",
    ];
    const conflictProtectedSingletons = [
      "gmailTokens",
      "wooCredentials",
      "bulkSenderCredentials",
      "stripeSubscriptions",
    ];

    for (const table of transferredTables) {
      expect(source).toContain(`tx.update(${table}).set({ userId: targetUserId })`);
    }
    for (const table of conflictProtectedSingletons) {
      expect(source).toContain(`assertNoSingletonConflict(tx, ${table}, sourceUserId, targetUserId`);
      expect(source).toContain(`tx.update(${table}).set({ userId: targetUserId })`);
    }
    expect(source).toContain("resolveSmtpConflict(tx, sourceUserId, targetUserId)");
    expect(source).toContain("tx.update(smtpCredentials).set({ userId: targetUserId })");
    expect(source).toContain("tx.delete(smtpCredentials).where(eq(smtpCredentials.id, losingId))");
    expect(source).toContain("buildMergedProfileValues(sourceProfile, targetProfile)");
    expect(source).toContain("tx.update(notificationPrefs).set({ userId: targetUserId })");
    expect(source).toContain("tx.update(accessCodeRedemptions).set({ userId: targetUserId })");
    expect(source).toContain("tx.update(referrals).set({ referredUserId: targetUserId })");
    expect(source).toContain("tx.update(referrals).set({ referrerUserId: targetUserId })");
    expect(source).toContain("tx.update(userIdentityAliases).set({ userId: targetUserId })");
    expect(source).toContain("await tx.delete(users).where(eq(users.id, sourceUserId))");
  });

  it("keeps a verified source SMTP connection over an unverified survivor connection", () => {
    expect(chooseSmtpMergeWinner({ verified: 1 }, { verified: 0 })).toBe("source");
  });

  it("keeps a verified survivor SMTP connection over an unverified source connection", () => {
    expect(chooseSmtpMergeWinner({ verified: 0 }, { verified: 1 })).toBe("target");
  });

  it("requires an explicit choice when both SMTP connections are verified", () => {
    expect(chooseSmtpMergeWinner({ verified: 1 }, { verified: 1 })).toBe("conflict");
  });

  it("requires verification or removal when both SMTP connections are unverified", () => {
    expect(chooseSmtpMergeWinner({ verified: 0 }, { verified: 0 })).toBe("conflict");
  });

  it("keeps the survivor's preferred profile fields while preserving the strongest plan and accumulated usage", () => {
    const merged = buildMergedProfileValues(
      {
        businessName: "Source Company",
        reviewLink: "https://source.example.test/review",
        tier: "lifetime",
        planExpiresAt: null,
        monthlyCount: 6,
        onboardingDismissed: 1,
        reviewGoal: 25,
        stripeCustomerId: "cus_source",
        fromName: "Source Sender",
        replyTo: "source@example.test",
      },
      {
        businessName: "Surviving Company",
        reviewLink: "https://target.example.test/review",
        tier: "free",
        planExpiresAt: 1_800_000_000_000,
        monthlyCount: 4,
        onboardingDismissed: 0,
        reviewGoal: 10,
        stripeCustomerId: null,
        fromName: null,
        replyTo: "target@example.test",
      },
    );

    expect(merged).toEqual({
      businessName: "Surviving Company",
      reviewLink: "https://target.example.test/review",
      tier: "lifetime",
      planExpiresAt: null,
      monthlyCount: 10,
      onboardingDismissed: 1,
      reviewGoal: 25,
      stripeCustomerId: "cus_source",
      fromName: "Source Sender",
      replyTo: "target@example.test",
    });
  });

  it("preserves administrator access but retains the chosen survivor's login-facing identity fields", () => {
    const merged = buildMergedUserValues(
      {
        role: "admin",
        name: "Duplicate Admin",
        email: "duplicate@example.test",
        defaultFromEmail: "duplicate-sender@example.test",
        defaultFromName: "Duplicate Sender",
      },
      {
        role: "user",
        name: "Surviving User",
        email: "survivor@example.test",
        defaultFromEmail: null,
        defaultFromName: "Survivor Sender",
      },
    );

    expect(merged).toEqual({
      role: "admin",
      name: "Surviving User",
      email: "survivor@example.test",
      defaultFromEmail: "duplicate-sender@example.test",
      defaultFromName: "Survivor Sender",
    });
    expect(merged).not.toHaveProperty("openId");
  });
});
