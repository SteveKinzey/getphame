import { expect, test, type Locator, type Page } from "@playwright/test";

const CAPTIONS_KEY = "getphame-walkthrough-captions";
const LANGUAGE_KEY = "getphame-walkthrough-caption-language";
const SIZE_KEY = "getphame-walkthrough-caption-font-size";
const BACKGROUND_KEY = "getphame-walkthrough-caption-background";
const FONT_FAMILY_KEY = "getphame-walkthrough-caption-font-family";
const TEXT_COLOR_KEY = "getphame-walkthrough-caption-text-color";
const TEXT_OPACITY_KEY = "getphame-walkthrough-caption-text-opacity";

async function selectMenuItem(page: Page, trigger: Locator, testId: string) {
  const menus = page.getByRole("menu");
  if ((await trigger.getAttribute("aria-expanded")) === "true" || (await menus.count()) > 0) {
    await page.keyboard.press("Escape");
    await expect(menus).toHaveCount(0);
  }

  await trigger.click();
  await expect(menus).toHaveCount(1);
  const item = page.getByTestId(testId);
  await expect(item).toBeVisible();
  await item.click();

  if ((await trigger.getAttribute("aria-expanded")) === "true") {
    await page.keyboard.press("Escape");
  }
  await expect(menus).toHaveCount(0);
}

test("controls multilingual captions, appearance, keyboard safety, and persistence without viewport overflow", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const captionLanguageEvents: string[] = [];
  await page.route("**/api/trpc/analytics.trackCaptionLanguage**", async (route) => {
    const payload = route.request().postDataJSON() as Record<string, { json?: { language?: string } }>;
    const language = Object.values(payload)[0]?.json?.language;
    if (language) captionLanguageEvents.push(language);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { json: { ok: true } } } }]),
    });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "de-DE"] });
    Object.defineProperty(navigator, "language", { get: () => "pt-BR" });
    localStorage.setItem("rl-pwa-prompt-dismissed", "1");
    if (localStorage.getItem("getphame-walkthrough-captions") === null) {
      localStorage.setItem("getphame-walkthrough-captions", "on");
    }
    if (localStorage.getItem("getphame-walkthrough-caption-language") === null) {
      localStorage.setItem("getphame-walkthrough-caption-language", "en");
    }
    if (localStorage.getItem("getphame-walkthrough-caption-font-size") === null) {
      localStorage.setItem("getphame-walkthrough-caption-font-size", "medium");
    }
    if (localStorage.getItem("getphame-walkthrough-caption-background") === null) {
      localStorage.setItem("getphame-walkthrough-caption-background", "navy");
    }
    if (localStorage.getItem("getphame-walkthrough-caption-font-family") === null) {
      localStorage.setItem("getphame-walkthrough-caption-font-family", "sans");
    }
    if (localStorage.getItem("getphame-walkthrough-caption-text-color") === null) {
      localStorage.setItem("getphame-walkthrough-caption-text-color", "white");
    }
    if (localStorage.getItem("getphame-walkthrough-caption-text-opacity") === null) {
      localStorage.setItem("getphame-walkthrough-caption-text-opacity", "solid");
    }
  });
  await page.goto("/landing?walkthrough-e2e=1");

  await expect(
    page.getByText(
      "Watch the 63-second platform walkthrough — English narration with optional captions",
    ),
  ).toBeVisible({ timeout: 20_000 });

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

  let video = dialog.locator("video");
  await expect(video).toHaveAttribute(
    "src",
    "/manus-storage/getphame-walkthrough-toggle-ready_4a3636b0.mp4",
  );
  await expect(video).toHaveAttribute(
    "poster",
    "/manus-storage/getphame-walkthrough-toggle-ready-poster_7dfd9fb1.png",
  );
  await expect(video.locator('track[kind="captions"]')).toHaveCount(6);
  await expect(video.locator('track[srclang="en"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.en.vtt",
  );
  await expect(video.locator('track[srclang="es"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.es.vtt",
  );
  await expect(video.locator('track[srclang="fr"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.fr.vtt",
  );
  await expect(video.locator('track[srclang="it"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.it.vtt",
  );
  await expect(video.locator('track[srclang="de"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.de.vtt",
  );
  await expect(video.locator('track[srclang="pt"]')).toHaveAttribute(
    "src",
    "/getphame-walkthrough.pt.vtt",
  );
  await expect(video).not.toHaveAttribute("crossorigin", "anonymous");
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  const captionsToggle = dialog.getByTestId("caption-toggle");
  await expect(dialog.locator("[data-testid]").first()).toHaveAttribute(
    "data-testid",
    "caption-toggle",
  );
  await expect(captionsToggle).toHaveAccessibleName("Disable captions");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "true");
  await expect(captionsToggle).toHaveAttribute("aria-keyshortcuts", "C");
  await captionsToggle.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Current caption language: English");
  await captionsToggle.evaluate((element) => element.blur());
  await expect(page.getByRole("tooltip")).toBeHidden();
  await expect(video).toHaveAttribute("data-caption-state", "on");
  await expect
    .poll(() =>
      video.evaluate((element) =>
        Array.from(element.textTracks).map((track) => [track.language, track.mode]),
      ),
    )
    .toEqual([
      ["en", "showing"],
      ["es", "disabled"],
      ["fr", "disabled"],
      ["it", "disabled"],
      ["de", "disabled"],
      ["pt", "disabled"],
    ]);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe("en");
  expect(captionLanguageEvents).toEqual([]);

  await captionsToggle.click();
  await expect(captionsToggle).toHaveAccessibleName("Enable captions");
  await expect(video).toHaveAttribute("data-caption-state", "off");
  await captionsToggle.click();
  await expect(captionsToggle).toHaveAccessibleName("Disable captions");
  await expect(video).toHaveAttribute("data-caption-state", "on");
  expect(captionLanguageEvents).toEqual([]);

  await page.keyboard.press("Control+c");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "true");

  await dialog.evaluate((element) => {
    const preventedEvent = new KeyboardEvent("keydown", {
      key: "c",
      bubbles: true,
      cancelable: true,
    });
    preventedEvent.preventDefault();
    element.dispatchEvent(preventedEvent);
  });
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "true");

  await dialog.evaluate((element) => {
    const textbox = document.createElement("div");
    textbox.id = "caption-e2e-textbox";
    textbox.setAttribute("role", "textbox");
    textbox.tabIndex = 0;
    element.appendChild(textbox);
    textbox.focus();
  });
  await page.keyboard.press("c");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "true");
  await page.locator("#caption-e2e-textbox").evaluate((element) => element.remove());

  await page.keyboard.press("c");
  await expect(captionsToggle).toHaveAccessibleName("Enable captions");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "false");
  await expect(video).toHaveAttribute("data-caption-state", "off");
  await expect
    .poll(() =>
      video.evaluate((element) => Array.from(element.textTracks).map((track) => track.mode)),
    )
    .toEqual(["disabled", "disabled", "disabled", "disabled", "disabled", "disabled"]);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), CAPTIONS_KEY)).toBe("off");

  await page.keyboard.press("c");
  await expect(captionsToggle).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      video.evaluate((element) =>
        Array.from(element.textTracks).map((track) => [track.language, track.mode]),
      ),
    )
    .toEqual([
      ["en", "showing"],
      ["es", "disabled"],
      ["fr", "disabled"],
      ["it", "disabled"],
      ["de", "disabled"],
      ["pt", "disabled"],
    ]);

  const languageTrigger = dialog.getByTestId("caption-language-trigger");
  const captionLanguages = ["en", "es", "fr", "it", "de", "pt"] as const;
  const selectedLanguages = ["es", "fr", "it", "de", "pt"] as const;
  for (const [selectionIndex, language] of selectedLanguages.entries()) {
    await selectMenuItem(page, languageTrigger, `caption-language-${language}`);
    await expect(video).toHaveAttribute("data-caption-language", language);
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY))
      .toBe(language);
    await expect
      .poll(() =>
        video.evaluate(
          (element, selectedLanguage) =>
            Array.from(element.textTracks).map((track) => [
              track.language,
              track.mode,
              track.language === selectedLanguage,
            ]),
          language,
        ),
      )
      .toEqual(
        captionLanguages.map((trackLanguage) => [
          trackLanguage,
          trackLanguage === language ? "showing" : "disabled",
          trackLanguage === language,
        ]),
      );
    await expect.poll(() => [...captionLanguageEvents]).toEqual(
      selectedLanguages.slice(0, selectionIndex + 1),
    );
    if (language === "it") {
      await captionsToggle.focus();
      await expect(page.getByRole("tooltip")).toHaveText("Current caption language: Italian");
      await captionsToggle.evaluate((element) => element.blur());
      await expect(page.getByRole("tooltip")).toBeHidden();
    }
  }

  const settingsTrigger = dialog.getByTestId("caption-settings-trigger");
  await settingsTrigger.click();
  const livePreview = page.getByTestId("caption-live-preview");
  await expect(livePreview).toBeVisible();
  await expect(livePreview).toHaveAttribute("data-caption-size", "medium");
  await expect(livePreview).toHaveAttribute("data-caption-background", "navy");
  await expect(livePreview).toHaveAttribute("data-caption-font-family", "sans");
  await expect(livePreview).toHaveAttribute("data-caption-text-color", "white");
  await expect(livePreview).toHaveAttribute("data-caption-text-opacity", "solid");

  await page.getByTestId("caption-size-large").click();
  await expect(video).toHaveAttribute("data-caption-size", "large");
  await expect(livePreview).toHaveAttribute("data-caption-size", "large");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SIZE_KEY)).toBe("large");

  await page.getByTestId("caption-background-translucent").click();
  await expect(video).toHaveAttribute("data-caption-background", "translucent");
  await expect(livePreview).toHaveAttribute("data-caption-background", "translucent");
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), BACKGROUND_KEY))
    .toBe("translucent");

  await page.getByTestId("caption-font-family-serif").click();
  await expect(video).toHaveAttribute("data-caption-font-family", "serif");
  await expect(livePreview).toHaveAttribute("data-caption-font-family", "serif");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), FONT_FAMILY_KEY)).toBe("serif");

  await page.getByTestId("caption-text-color-gold").click();
  await expect(video).toHaveAttribute("data-caption-text-color", "gold");
  await expect(livePreview).toHaveAttribute("data-caption-text-color", "gold");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), TEXT_COLOR_KEY)).toBe("gold");

  await page.getByTestId("caption-text-opacity-high").click();
  await expect(video).toHaveAttribute("data-caption-text-opacity", "high");
  await expect(livePreview).toHaveAttribute("data-caption-text-opacity", "high");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), TEXT_OPACITY_KEY)).toBe("high");
  await page.screenshot({
    path: testInfo.outputPath("caption-settings-live-preview.png"),
    fullPage: false,
  });
  await expect(page.getByRole("menu")).toHaveCount(1);
  await page.keyboard.press("Escape");

  await selectMenuItem(page, settingsTrigger, "caption-settings-reset");
  await expect(video).toHaveAttribute("data-caption-size", "medium");
  await expect(video).toHaveAttribute("data-caption-background", "navy");
  await expect(video).toHaveAttribute("data-caption-font-family", "sans");
  await expect(video).toHaveAttribute("data-caption-text-color", "white");
  await expect(video).toHaveAttribute("data-caption-text-opacity", "solid");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), SIZE_KEY)).toBe("medium");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), BACKGROUND_KEY)).toBe("navy");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), FONT_FAMILY_KEY)).toBe("sans");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), TEXT_COLOR_KEY)).toBe("white");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), TEXT_OPACITY_KEY)).toBe("solid");

  await settingsTrigger.click();
  await expect(page.getByTestId("caption-settings-reset")).toHaveAttribute("data-disabled", "");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await settingsTrigger.click();
  await page.getByTestId("caption-size-large").click();
  await page.getByTestId("caption-background-translucent").click();
  await page.getByTestId("caption-font-family-mono").click();
  await page.getByTestId("caption-text-color-cyan").click();
  await page.getByTestId("caption-text-opacity-soft").click();
  await page.keyboard.press("Escape");

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

  const transcriptPanel = dialog.getByTestId("transcript-panel");
  await expect(transcriptPanel).toBeVisible();
  const transcriptCues = transcriptPanel.locator('button[data-testid^="transcript-cue-"]');
  await expect(transcriptCues).toHaveCount(11);
  const firstCue = dialog.getByTestId("transcript-cue-0");
  await expect(firstCue).toHaveAttribute("aria-current", "true");
  const thirdCue = dialog.getByTestId("transcript-cue-2");
  const thirdCueStart = Number(await thirdCue.getAttribute("data-start-time"));
  await thirdCue.click();
  await expect(thirdCue).toHaveAttribute("aria-current", "true");
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(thirdCueStart);

  const viewport = page.viewportSize();
  const box = await dialog.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  if (viewport && box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await page.screenshot({
    path: testInfo.outputPath("walkthrough-multilingual-controls.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: "Close video" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  video = dialog.locator("video");
  await expect(video).toHaveAttribute("data-caption-state", "on");
  await expect(video).toHaveAttribute("data-caption-language", "pt");
  await expect(video).toHaveAttribute("data-caption-size", "large");
  await expect(video).toHaveAttribute("data-caption-background", "translucent");
  await expect(video).toHaveAttribute("data-caption-font-family", "mono");
  await expect(video).toHaveAttribute("data-caption-text-color", "cyan");
  await expect(video).toHaveAttribute("data-caption-text-opacity", "soft");
  await expect
    .poll(() =>
      video.evaluate((element) =>
        Array.from(element.textTracks).map((track) => [track.language, track.mode]),
      ),
    )
    .toEqual([
      ["en", "disabled"],
      ["es", "disabled"],
      ["fr", "disabled"],
      ["it", "disabled"],
      ["de", "disabled"],
      ["pt", "showing"],
    ]);
  expect(captionLanguageEvents).toEqual(["es", "fr", "it", "de", "pt"]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.reload();
  await trigger.click();
  await expect(dialog).toBeVisible();
  video = dialog.locator("video");
  await expect(video).toHaveAttribute("data-caption-language", "pt");
  await expect(video).toHaveAttribute("data-caption-size", "large");
  await expect(video).toHaveAttribute("data-caption-background", "translucent");
  await expect(video).toHaveAttribute("data-caption-font-family", "mono");
  await expect(video).toHaveAttribute("data-caption-text-color", "cyan");
  await expect(video).toHaveAttribute("data-caption-text-opacity", "soft");
  expect(captionLanguageEvents).toEqual(["es", "fr", "it", "de", "pt"]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("auto-detects the first supported browser caption language when no saved choice exists", async ({
  page,
}) => {
  const captionLanguageEvents: string[] = [];
  await page.route("**/api/trpc/analytics.trackCaptionLanguage**", async (route) => {
    captionLanguageEvents.push(route.request().postData() || "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { json: { ok: true } } } }]),
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", {
      get: () => ["ja-JP", "it-IT", "pt-BR"],
    });
    Object.defineProperty(navigator, "language", { get: () => "ja-JP" });
    localStorage.setItem("rl-pwa-prompt-dismissed", "1");
    localStorage.removeItem("getphame-walkthrough-caption-language");
  });
  await page.goto("/landing?walkthrough-language-detection-e2e=1");
  await page.getByRole("button", { name: "Play product walkthrough video" }).click();

  const dialog = page.getByRole("dialog", { name: "Get Phame platform walkthrough" });
  const video = dialog.locator("video");
  const captionsToggle = dialog.getByTestId("caption-toggle");
  await expect(video).toHaveAttribute("data-caption-language", "it");
  await expect(dialog.getByTestId("caption-language-trigger")).toHaveAccessibleName(
    "Caption language: Italian",
  );
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), LANGUAGE_KEY)).toBe("it");
  await expect
    .poll(() =>
      video.evaluate((element) =>
        Array.from(element.textTracks).map((track) => [track.language, track.mode]),
      ),
    )
    .toEqual([
      ["en", "disabled"],
      ["es", "disabled"],
      ["fr", "disabled"],
      ["it", "showing"],
      ["de", "disabled"],
      ["pt", "disabled"],
    ]);
  await captionsToggle.hover();
  await expect
    .poll(() => captionsToggle.evaluate((element) => getComputedStyle(element).transitionProperty))
    .toBe("none");
  await expect(page.getByRole("tooltip")).toHaveText("Current caption language: Italian");
  expect(captionLanguageEvents).toEqual([]);
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
