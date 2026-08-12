import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin email preview runtime contract", () => {
  it("imports every React hook used by the signed-in preview page", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(source).toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*["']react["']/s);
    expect(source).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*["']react["']/s);
    expect(source).toMatch(/import\s*\{[^}]*useCallback[^}]*\}\s*from\s*["']react["']/s);
    expect(source).toContain("trpc.admin.emailPreview.useQuery");
    expect(source).toContain("trpc.admin.sendTestEmail.useMutation");
  });

  it("preserves an admin email-preview deep link through sign-in", () => {
    const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const authUrlSource = readFileSync(resolve(process.cwd(), "client/src/const.ts"), "utf8");

    expect(authUrlSource).toContain("returnTo=");
    expect(appSource).toContain('path === "/admin/email-preview"');
    expect(appSource).toContain("authReturnPathStorageKey");
    expect(appSource).toContain("sessionStorage.setItem");
  });
});
