import { expect, test } from "@playwright/test";

import { readFile } from "node:fs/promises";

test("CSV download records a visible Settings export-history entry", async ({
  page,
}) => {
  await page.goto("/__test/settings-data-export");
  await page.getByTestId("settings-profile-data-export-format-csv").click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("settings-profile-data-export-download").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^get-phame-profile-preferences-\d{4}-\d{2}-\d{2}\.csv$/
  );
  await expect(
    page.getByTestId("settings-profile-data-export-history")
  ).toContainText(/csv/i);
});

test("Settings export history failure is explicit and retryable", async ({
  page,
}) => {
  await page.goto("/__test/settings-data-export-history-error");

  await expect(page.getByRole("alert")).toContainText(
    "We could not load your download history."
  );
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("Settings export history applies and clears a date filter", async ({
  page,
}) => {
  await page.goto("/__test/settings-data-export");

  await page
    .getByTestId("settings-profile-data-export-date-start")
    .fill("2026-08-01");
  await page
    .getByTestId("settings-profile-data-export-date-end")
    .fill("2026-08-31");

  const history = page.getByTestId("settings-profile-data-export-history");
  await expect(history).toContainText("json");
  await expect(history).not.toContainText("csv");
  await page.getByRole("button", { name: "Clear dates" }).click();
  await expect(history).toContainText("json");
  await expect(history).toContainText("csv");
});

test("Settings export receipt downloads metadata without profile values", async ({
  page,
}, testInfo) => {
  await page.goto("/__test/settings-data-export");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("settings-profile-data-export-receipt-801").click();
  const download = await downloadPromise;
  const outputPath = testInfo.outputPath("export-receipt.txt");
  await download.saveAs(outputPath);
  const receipt = await readFile(outputPath, "utf8");

  expect(download.suggestedFilename()).toBe(
    "get-phame-export-receipt-2026-08-12.txt"
  );
  expect(receipt).toContain("Receipt ID: 801");
  expect(receipt).toContain("Export format: JSON");
  expect(receipt).not.toContain("owner@example.test");
  expect(receipt).not.toContain("Preview Owner");
});

test("Settings deletion preview is aggregate-only and remains confirmation-gated", async ({
  page,
}) => {
  await page.goto("/__test/settings-account-deletion-preview");
  await page.getByRole("button", { name: "Delete Account" }).click();

  const preview = page.getByTestId("settings-account-deletion-preview");
  await expect(preview).toContainText(
    "19 records are currently scheduled for permanent deletion."
  );
  await expect(preview).toContainText("Account identity");
  await expect(preview).toContainText("Contacts");
  await expect(preview).not.toContainText("owner@example.test");
  await expect(
    page.getByRole("button", { name: "Delete Forever" })
  ).toBeDisabled();
});
