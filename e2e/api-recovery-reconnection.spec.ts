import { expect, test } from "@playwright/test";

test("recovers from an offline readiness failure and confirms the reconnection", async ({
  page,
}) => {
  let serviceReady = false;

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
  });
  await page.route("**/api/health", async route => {
    await route.fulfill({
      status: serviceReady ? 200 : 503,
      contentType: "application/json",
      body: JSON.stringify(
        serviceReady
          ? { ok: true, status: "ready" }
          : { ok: false, status: "not-ready" }
      ),
    });
  });

  await page.goto("/__test/api-recovery?from_webdev=1");
  await expect(
    page.getByTestId("api-recovery-offline-illustration")
  ).toBeVisible();
  await expect(page.getByTestId("api-recovery-retry-now")).toHaveAccessibleName(
    "Retry Connection"
  );

  serviceReady = true;
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    window.dispatchEvent(new Event("online"));
  });

  await expect(page.locator(".api-recovery-reconnect-toast")).toBeVisible();
  await expect(page.getByTestId("api-recovery-test-ready")).toBeVisible();
});

test("Retry Connection forces an immediate readiness check from offline guidance", async ({
  page,
}) => {
  let serviceReady = false;

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
  });
  await page.route("**/api/health", async route => {
    await route.fulfill({
      status: serviceReady ? 200 : 503,
      contentType: "application/json",
      body: JSON.stringify(
        serviceReady
          ? { ok: true, status: "ready" }
          : { ok: false, status: "not-ready" }
      ),
    });
  });

  await page.goto("/__test/api-recovery?from_webdev=1");
  await expect(page.getByTestId("api-recovery-retry-now")).toHaveAccessibleName(
    "Retry Connection"
  );

  serviceReady = true;
  await page.getByTestId("api-recovery-retry-now").click();

  await expect(page.locator(".api-recovery-reconnect-toast")).toBeVisible();
  await expect(page.getByTestId("api-recovery-test-ready")).toBeVisible();
});
