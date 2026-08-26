import { expect, test } from "@playwright/test";

test("CSV download records a visible Settings export-history entry", async ({ page }) => {
  await page.goto("/__test/settings-data-export");
  await page.getByTestId("settings-profile-data-export-format-csv").click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("settings-profile-data-export-download").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^get-phame-profile-preferences-\d{4}-\d{2}-\d{2}\.csv$/);
  await expect(page.getByTestId("settings-profile-data-export-history")).toContainText(/csv/i);
});

test("Settings export history failure is explicit and retryable", async ({ page }) => {
  await page.goto("/__test/settings-data-export-history-error");

  await expect(page.getByRole("alert")).toContainText("We could not load your download history.");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
