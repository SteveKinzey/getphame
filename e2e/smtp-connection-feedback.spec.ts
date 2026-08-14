import { expect, test } from "@playwright/test";

test("exercises the Settings SMTP feedback controls through test, save, success, and provider-help states", async ({ page }) => {
  await page.goto("/__test/smtp-connection-feedback?from_webdev=1");
  await expect(page.getByTestId("smtp-feedback-test-harness")).toBeVisible();

  const testButton = page.getByTestId("smtp-test-before-save");
  await expect(testButton).toHaveAccessibleName("Test before saving");
  await testButton.click();
  await expect(testButton).toHaveAccessibleName("Testing your mail server…");
  await expect(page.getByTestId("smtp-candidate-test-result")).toContainText("credentials have not been saved yet");

  const connectButton = page.getByTestId("smtp-connect-and-save");
  await connectButton.click();
  await expect(connectButton).toHaveAccessibleName("Connecting and verifying…");
  await expect(page.getByTestId("smtp-saved-notice")).toContainText("ready for customer outreach");
  await expect(page.getByTestId("bulk-saved-notice")).toContainText("bulk mail server is connected and ready to use");

  await page.getByLabel("Gmail App Password help").focus();
  await expect(page.getByText("Use a 16-character App Password, not your regular Gmail password. Turn on 2-Step Verification first.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Google Workspace App Password help").focus();
  await expect(page.getByText("Your Workspace administrator must allow App Passwords. If this option is unavailable, use your organisation’s approved SMTP or OAuth method.")).toBeVisible();
});
