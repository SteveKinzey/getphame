import { expect, test } from "@playwright/test";

test("keeps login and SMTP identity fields browser-autofill ready with immediate format feedback", async ({ page }) => {
  await page.goto("/__test/form-autofill?from_webdev=1");
  await expect(page.getByTestId("form-autofill-test-harness")).toBeVisible();

  const loginEmail = page.locator("#autofill-login-email");
  await expect(loginEmail).toHaveAttribute("name", "autofill-login-email");
  await expect(loginEmail).toHaveAttribute("autocomplete", "email");
  await expect(loginEmail).toHaveAttribute("aria-invalid", "false");
  await loginEmail.fill("not-an-email");
  await expect(loginEmail).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("autofill-login-email-validation")).toContainText("Enter a valid email address.");
  await loginEmail.fill("owner@example.com");
  await expect(loginEmail).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByTestId("autofill-login-email-validation")).toContainText("Email format looks good.");

  const smtpEmail = page.locator("#autofill-smtp-email");
  await expect(smtpEmail).toHaveAttribute("autocomplete", "email");
  await expect(page.locator("#autofill-smtp-username")).toHaveAttribute("autocomplete", "username");
  await expect(page.locator("#autofill-smtp-password")).toHaveAttribute("autocomplete", "current-password");
  await smtpEmail.fill("smtp@invalid");
  await expect(smtpEmail).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("autofill-smtp-feedback")).toContainText("Enter a valid email address.");
  await smtpEmail.fill("smtp@example.com");
  await expect(smtpEmail).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByTestId("autofill-smtp-feedback")).toContainText("Email format looks good.");
});
