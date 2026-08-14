import { expect, test } from "@playwright/test";

test("the Settings provider selector updates credential, sender verification, and documentation guidance", async ({ page }) => {
  await page.goto("/__test/provider-discovery");

  await expect(page.getByTestId("provider-verification-note")).toContainText("Sender Authentication");
  await expect(page.getByTestId("provider-credential-note")).toContainText("Mail Send permission");
  await expect(page.getByRole("link", { name: /SendGrid \(your account\) setup guide/i })).toHaveAttribute("href", /twilio\.com\/docs\/sendgrid/);

  await page.selectOption("#bulk-sender-provider", "mailgun");

  await expect(page.getByTestId("provider-verification-note")).toContainText("required DNS records");
  await expect(page.getByTestId("provider-credential-note")).toContainText("sending domain");
  await expect(page.getByRole("link", { name: /Mailgun setup guide/i })).toHaveAttribute("href", /documentation\.mailgun\.com/);

  await page.fill("#bulk-sender-provider-search", "postmark");
  await expect(page.locator("#bulk-sender-provider")).toHaveValue("mailgun");
  await expect(page.locator("#bulk-sender-provider option:checked")).toHaveText("Mailgun");
});
