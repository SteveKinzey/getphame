import { expect, test } from "@playwright/test";

test("opens the captioned Get Phame walkthrough without overflowing the viewport", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("rl-pwa-prompt-dismissed", "1");
    localStorage.setItem("getphame-walkthrough-captions", "on");
  });
  await page.goto("/landing?walkthrough-e2e=1");

  await expect(
    page.getByText(
      "Watch the 63-second platform walkthrough — English narration with optional captions",
    ),
  ).toBeVisible();

  const trigger = page.getByRole("button", {
    name: "Play product walkthrough video",
  });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: "Get Phame platform walkthrough",
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close video" })).toBeFocused();

  const video = dialog.locator("video");
  await expect(video).toHaveAttribute(
    "src",
    "/manus-storage/getphame-walkthrough-toggle-ready_4a3636b0.mp4",
  );
  await expect(video).toHaveAttribute(
    "poster",
    "/manus-storage/getphame-walkthrough-toggle-ready-poster_7dfd9fb1.png",
  );
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.en.vtt",
  );
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute(
    "label",
    "English captions",
  );
  await expect(video).not.toHaveAttribute("crossorigin", "anonymous");
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  const captionsToggle = dialog.getByTestId("caption-toggle");
  await expect(captionsToggle).toHaveAccessibleName("Disable captions");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "true");
  await expect(video).toHaveAttribute("data-caption-state", "on");
  await expect
    .poll(() => video.evaluate((element) => element.textTracks[0]?.mode))
    .toBe("showing");

  await captionsToggle.click();
  await expect(captionsToggle).toHaveAccessibleName("Enable captions");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "false");
  await expect(video).toHaveAttribute("data-caption-state", "off");
  await expect
    .poll(() => video.evaluate((element) => element.textTracks[0]?.mode))
    .toBe("disabled");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("getphame-walkthrough-captions"))).toBe("off");

  await captionsToggle.click();
  await expect(captionsToggle).toHaveAccessibleName("Disable captions");
  await expect(video).toHaveAttribute("data-caption-state", "on");
  await expect
    .poll(() => video.evaluate((element) => element.textTracks[0]?.mode))
    .toBe("showing");

  await expect
    .poll(() => video.evaluate((element) => element.readyState))
    .toBeGreaterThanOrEqual(1);
  await expect
    .poll(() => video.evaluate((element) => element.duration))
    .toBeGreaterThan(62);
  await expect
    .poll(() => video.evaluate((element) => element.duration))
    .toBeLessThan(64);
  await video.evaluate((element) => {
    element.pause();
    element.currentTime = 0.25;
  });
  await expect
    .poll(() => video.evaluate((element) => element.currentTime))
    .toBeGreaterThan(0.1);

  const viewport = page.viewportSize();
  const box = await video.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  if (viewport && box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await page.screenshot({
    path: testInfo.outputPath("walkthrough-modal.png"),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("offers recovery controls when the player reports a media error", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rl-pwa-prompt-dismissed", "1");
  });
  await page.goto("/landing?walkthrough-failure-e2e=1");

  await page.getByRole("button", { name: "Play product walkthrough video" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Get Phame platform walkthrough",
  });
  await dialog.locator("video").evaluate((element) => {
    element.src = "/getphame-walkthrough.en.vtt";
    element.load();
  });
  const recovery = dialog.getByRole("alert");
  await expect(recovery).toBeVisible();
  await expect(recovery.getByText("The walkthrough could not load in this browser.")).toBeVisible();
  await expect(recovery.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(recovery.getByRole("link", { name: "Open video directly" })).toHaveAttribute(
    "href",
    "/manus-storage/getphame-walkthrough-toggle-ready_4a3636b0.mp4",
  );
});
