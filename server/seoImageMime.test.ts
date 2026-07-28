import { describe, expect, it } from "vitest";
import { getSocialImageMimeType } from "../client/src/components/landing/SEOHead";

describe("social image MIME metadata", () => {
  it.each([
    ["https://cdn.example/social.webp?version=4", "image/webp"],
    ["/social/photo.jpg#card", "image/jpeg"],
    ["/social/photo.jpeg", "image/jpeg"],
    ["/social/animation.gif", "image/gif"],
    ["/social/card.avif", "image/avif"],
    ["https://assets.getphame.app/getphame-og-image.png?v=4", "image/png"],
    ["/social/image-without-extension", "image/png"],
  ])("maps %s to %s", (url, expected) => {
    expect(getSocialImageMimeType(url)).toBe(expected);
  });
});
