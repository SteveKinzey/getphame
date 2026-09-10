import { expect, test } from "@playwright/test";

test("keeps login and SMTP identity fields browser-autofill ready with immediate format feedback", async ({
  page,
}) => {
  await page.route("**/api/auth/magic-link", async route => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, email: "owner@example.com" }),
    });
  });
  await page.goto("/__test/form-autofill?from_webdev=1");
  await expect(page.getByTestId("form-autofill-test-harness")).toBeVisible();

  const loginEmail = page.locator("#autofill-login-email");
  await expect(loginEmail).toHaveAttribute("name", "autofill-login-email");
  await expect(loginEmail).toHaveAttribute("autocomplete", "email");
  await expect(loginEmail).toHaveAttribute("aria-invalid", "false");
  await loginEmail.fill("not-an-email");
  await expect(loginEmail).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByTestId("autofill-login-email-validation")
  ).toContainText("Enter a valid email address.");
  await loginEmail.fill("owner@example.com");
  await expect(loginEmail).toHaveAttribute("aria-invalid", "false");
  await expect(
    page.getByTestId("autofill-login-email-validation")
  ).toContainText("Email format looks good.");
  await page.getByRole("button", { name: "Send Magic Link" }).click();
  await expect(page.getByTestId("magic-link-confirmation")).toContainText(
    "Check your inbox"
  );
  await expect(page.locator("[data-sonner-toast]")).toContainText(
    "Check your inbox"
  );

  const smtpEmail = page.locator("#autofill-smtp-email");
  await expect(smtpEmail).toHaveAttribute("autocomplete", "email");
  const smtpUsername = page.locator("#autofill-smtp-username");
  const smtpPassword = page.locator("#autofill-smtp-password");
  await expect(smtpUsername).toHaveAttribute("autocomplete", "username");
  await expect(smtpPassword).toHaveAttribute(
    "autocomplete",
    "current-password"
  );
  await smtpEmail.fill("smtp@invalid");
  await expect(smtpEmail).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("autofill-smtp-feedback")).toContainText(
    "Enter a valid email address."
  );
  await smtpEmail.fill("smtp@example.com");
  await expect(smtpEmail).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByTestId("autofill-smtp-feedback")).toContainText(
    "Email format looks good."
  );
  await smtpUsername.fill("smtp-user");
  await expect(smtpUsername).toHaveAttribute("aria-invalid", "false");
  await expect(
    page.getByTestId("autofill-smtp-username-feedback")
  ).toContainText("Looks good.");
  await expect(smtpPassword).toHaveAttribute("type", "password");
  await page.getByTestId("autofill-smtp-password-toggle").click();
  await expect(smtpPassword).toHaveAttribute("type", "text");
  await expect(
    page.getByTestId("autofill-smtp-password-toggle")
  ).toHaveAttribute("aria-pressed", "true");
  await smtpPassword.fill("app-password");
  await expect(smtpPassword).toHaveAttribute("aria-invalid", "false");
  await expect(
    page.getByTestId("autofill-smtp-password-feedback")
  ).toContainText("Password entered.");
});
