import { expect, test } from "@playwright/test";

test("shows the actual dashboard loading state and a sanitized API recovery toast", async ({ page }) => {
  await page.goto("/__test/dashboard-feedback?from_webdev=1");

  await expect(page.getByTestId("dashboard-loading")).toHaveAttribute("role", "status");
  await expect(page.getByTestId("dashboard-loading")).toHaveAccessibleName("Loading your dashboard");
  await expect(page.getByText("Loading your dashboard…")).toBeVisible();

  await page.getByTestId("dashboard-feedback-preview-trigger").click();

  await expect(page.getByText("We’re reconnecting Get Phame.")).toBeVisible();
  await expect(page.getByText("The service is taking a little longer than expected. Your work is safe; try again when you’re ready.")).toBeVisible();
  await expect(page.getByText(/raw server error/i)).toHaveCount(0);
});
