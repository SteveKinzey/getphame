import { expect, test } from "@playwright/test";

test("opens the captioned Get Phame walkthrough without overflowing the viewport", async ({
  page,
}, testInfo) => {
  await page.goto("/landing?walkthrough-e2e=1");

  await expect(
    page.getByText(
      "Watch the 63-second platform walkthrough — English narration with visible captions",
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
    "/manus-storage/getphame-walkthrough-captioned_d6454fd4.mp4",
  );
  await expect(video).toHaveAttribute(
    "poster",
    "/manus-storage/getphame-walkthrough-poster_98943590.png",
  );
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute(
    "src",
    "/manus-storage/getphame-walkthrough-captioned_0abd96cb.vtt",
  );
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute(
    "label",
    "English captions",
  );

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
