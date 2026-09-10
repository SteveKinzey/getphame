import { expect, test } from "@playwright/test";

test("System appearance follows live operating-system color-scheme changes", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/__test/settings-theme-preference");

  await page.getByTestId("settings-theme-system").click();
  await expect(page.getByTestId("settings-theme-system")).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByText("System mode is saved and currently using Dark.")
  ).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(
    page.getByText("System mode is saved and currently using Light.")
  ).toBeVisible();
});

test("resetting appearance returns this device to System mode", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/__test/settings-theme-preference");

  await page.getByTestId("settings-theme-light").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByTestId("settings-theme-reset-system")).toBeVisible();

  await page.getByTestId("settings-theme-reset-system").click();
  await expect(page.getByTestId("settings-theme-system")).toHaveAttribute(
    "aria-checked",
    "true"
  );
  await expect(page.locator("html")).toHaveClass(/dark/);
});
