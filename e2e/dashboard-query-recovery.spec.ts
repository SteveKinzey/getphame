import { expect, test } from "@playwright/test";

test("offers Retry only for a recoverable dashboard query failure", async ({ page }) => {
  await page.goto("/__test/dashboard-query-recovery");

  await page.getByTestId("dashboard-query-recovery-trigger").click();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("dashboard-query-recovery-retried")).toHaveText("Safe dashboard reads refreshed");

  await page.getByTestId("dashboard-mutation-recovery-trigger").click();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});
