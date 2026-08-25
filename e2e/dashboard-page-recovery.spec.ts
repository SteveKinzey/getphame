import { expect, test } from "@playwright/test";

test("actual Dashboard query recovery refreshes safe reads through one Retry action", async ({ page }) => {
  let statsCalls = 0;
  await page.route("**/api/trpc/**", async (route) => {
    if (route.request().url().includes("requests.stats")) {
      statsCalls += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify([{ error: { json: { message: "Controlled dashboard read failure" } } }]),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/__test/dashboard-page-query-recovery");

  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(statsCalls).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect.poll(() => statsCalls).toBeGreaterThan(1);
});

test("actual Dashboard mutation recovery stays non-replayable", async ({ page }) => {
  await page.route("**/api/trpc/**", async (route) => {
    if (route.request().url().includes("profile.upsert")) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { json: { message: "Controlled profile save failure" } } }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/__test/dashboard-page-mutation-recovery");

  await page.getByTestId("dashboard-page-mutation-error-trigger").click();
  await expect(page.getByText("We’re reconnecting Get Phame.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});
