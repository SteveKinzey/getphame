import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  GET_PHAME_EMAIL_LOGO_URL,
  renderGetPhameEmailHeader,
} from "./platformEmailBrand";

const projectRoot = process.cwd();

describe("Get Phame platform email branding", () => {
  it("renders the approved P-star mark with a live-text wordmark", () => {
    const html = renderGetPhameEmailHeader("Welcome aboard");

    expect(GET_PHAME_EMAIL_LOGO_URL).toBe(
      "https://assets.getphame.app/getphame-email-logo.svg",
    );
    expect(html).toContain(`src="${GET_PHAME_EMAIL_LOGO_URL}"`);
    expect(html).toContain('alt="Get Phame logo"');
    expect(html).toContain("GET <span");
    expect(html).toContain(">PHAME</span>");
    expect(html).toContain("#0F1B2D");
    expect(html).toContain("#D4A017");
    expect(html).toContain("Welcome aboard");
  });

  it("is used by every Get Phame-owned end-user email surface", () => {
    const platformEmailModules = [
      "accountDeletionEmail.ts",
      "auth-email.ts",
      "magicAuth.ts",
      "leadGuideEmail.ts",
      "smtp.ts",
    ];

    for (const file of platformEmailModules) {
      const source = readFileSync(join(projectRoot, "server", file), "utf8");
      expect(source, file).toContain("renderGetPhameEmailHeader");
    }
  });

  it("does not inject platform branding into customer review-request templates", () => {
    const customerTemplateSource = readFileSync(
      join(projectRoot, "server", "emailTemplates.ts"),
      "utf8",
    );

    expect(customerTemplateSource).not.toContain("renderGetPhameEmailHeader");
    expect(customerTemplateSource).not.toContain(GET_PHAME_EMAIL_LOGO_URL);
  });
});
