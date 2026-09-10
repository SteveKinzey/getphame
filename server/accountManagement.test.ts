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

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      const canWrap = "().,=:?{}[]<>".includes(character);
      if (canWrap) pattern += "\\s*";
      pattern += escape(character);
      if (canWrap) pattern += "\\s*";
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

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
      message:
        "Your signed-in administrator account must be the account that remains.",
    });
  });
});

describe("duplicate-account data preservation", () => {
  it("keeps table-by-table transfer and conflict protection for every user-owned account-data category", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "server/accountManagement.ts"),
      "utf8"
    );
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
      expect(source).toMatch(
        new RegExp(
          `tx\\s*\\.\\s*update\\(\\s*${table}\\s*\\)\\s*\\.\\s*set\\(\\s*\\{\\s*userId\\s*:\\s*targetUserId\\s*\\}\\s*\\)`,
          "s"
        )
      );
    }
    for (const table of conflictProtectedSingletons) {
      expectSourceContract(source).toContain(
        `assertNoSingletonConflict(tx, ${table}, sourceUserId, targetUserId`
      );
      expect(source).toMatch(
        new RegExp(
          `tx\\s*\\.\\s*update\\(\\s*${table}\\s*\\)\\s*\\.\\s*set\\(\\s*\\{\\s*userId\\s*:\\s*targetUserId\\s*\\}\\s*\\)`,
          "s"
        )
      );
    }
    expectSourceContract(source).toContain(
      "resolveSmtpConflict(tx, sourceUserId, targetUserId)"
    );
    expectSourceContract(source).toContain(
      "tx.update(smtpCredentials).set({ userId: targetUserId })"
    );
    expectSourceContract(source).toContain(
      "tx.delete(smtpCredentials).where(eq(smtpCredentials.id, losingId))"
    );
    expectSourceContract(source).toContain(
      "buildMergedProfileValues(sourceProfile, targetProfile)"
    );
    expectSourceContract(source).toContain(
      "tx.update(notificationPrefs).set({ userId: targetUserId })"
    );
    expectSourceContract(source).toContain(
      "tx.update(accessCodeRedemptions).set({ userId: targetUserId })"
    );
    expectSourceContract(source).toContain(
      "tx.update(referrals).set({ referredUserId: targetUserId })"
    );
    expectSourceContract(source).toContain(
      "tx.update(referrals).set({ referrerUserId: targetUserId })"
    );
    expectSourceContract(source).toContain(
      "tx.update(userIdentityAliases).set({ userId: targetUserId })"
    );
    expectSourceContract(source).toContain(
      "await tx.delete(users).where(eq(users.id, sourceUserId))"
    );
  });

  it("keeps a verified source SMTP connection over an unverified survivor connection", () => {
    expect(chooseSmtpMergeWinner({ verified: 1 }, { verified: 0 })).toBe(
      "source"
    );
  });

  it("keeps a verified survivor SMTP connection over an unverified source connection", () => {
    expect(chooseSmtpMergeWinner({ verified: 0 }, { verified: 1 })).toBe(
      "target"
    );
  });

  it("requires an explicit choice when both SMTP connections are verified", () => {
    expect(chooseSmtpMergeWinner({ verified: 1 }, { verified: 1 })).toBe(
      "conflict"
    );
  });

  it("requires verification or removal when both SMTP connections are unverified", () => {
    expect(chooseSmtpMergeWinner({ verified: 0 }, { verified: 0 })).toBe(
      "conflict"
    );
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
      }
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
      }
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
