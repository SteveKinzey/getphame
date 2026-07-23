import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

const requiredSignInKeys = [
  "title",
  "description",
  "emailLabel",
  "emailPlaceholder",
  "button",
  "inProgress",
  "preparing",
  "verifying",
  "invalidEmail",
  "unsupported",
  "unavailable",
] as const;

const requiredSecurityKeys = [
  "title",
  "description",
  "unsupported",
  "newNameLabel",
  "newNameHelp",
  "namePlaceholder",
  "create",
  "creating",
  "preparing",
  "verifying",
  "defaultName",
  "createSuccess",
  "createError",
  "savedTitle",
  "loading",
  "loadError",
  "empty",
  "nameLabel",
  "saveName",
  "cancelRename",
  "rename",
  "renameSuccess",
  "renameError",
  "created",
  "lastUsed",
  "synced",
  "remove",
  "removeConfirm",
  "confirmRemove",
  "cancel",
  "removeSuccess",
  "removeError",
] as const;

describe("passkey locale bundles", () => {
  for (const locale of locales) {
    it(`${locale} contains every passkey UI key`, () => {
      const path = join(process.cwd(), "client", "public", "locales", locale, "translation.json");
      const bundle = JSON.parse(readFileSync(path, "utf8")) as {
        passkeys?: {
          signIn?: Record<string, unknown>;
          security?: Record<string, unknown>;
        };
      };

      expect(bundle.passkeys?.signIn).toBeDefined();
      expect(bundle.passkeys?.security).toBeDefined();

      for (const key of requiredSignInKeys) {
        expect(bundle.passkeys?.signIn?.[key], `${locale}.passkeys.signIn.${key}`).toEqual(expect.any(String));
      }

      for (const key of requiredSecurityKeys) {
        expect(bundle.passkeys?.security?.[key], `${locale}.passkeys.security.${key}`).toEqual(expect.any(String));
      }
    });
  }
});
