import type { Express } from "express";

const MAX_TRANSCRIPT_FONT_BYTES = 512 * 1024;

const TRANSCRIPT_FONT_SOURCES = {
  cjk: {
    sourceUrl:
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/FCIDueKyaTSGIKCT.ttf",
    fileName: "noto-sans-tc-transcript.ttf",
  },
  thai: {
    sourceUrl:
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/sQOWzOguQuhquYWJ.ttf",
    fileName: "noto-sans-thai-transcript-v2.ttf",
  },
} as const;

export type TranscriptFontKey = keyof typeof TRANSCRIPT_FONT_SOURCES;

const fontCache = new Map<TranscriptFontKey, Promise<Buffer>>();

export function getTranscriptFontSource(value: string) {
  return Object.prototype.hasOwnProperty.call(TRANSCRIPT_FONT_SOURCES, value)
    ? TRANSCRIPT_FONT_SOURCES[value as TranscriptFontKey]
    : null;
}

export function clearTranscriptFontCacheForTests() {
  fontCache.clear();
}

async function loadTranscriptFont(key: TranscriptFontKey) {
  const cached = fontCache.get(key);
  if (cached) return cached;

  const source = TRANSCRIPT_FONT_SOURCES[key];
  const pending = fetch(source.sourceUrl, {
    headers: { Accept: "font/ttf,application/octet-stream;q=0.9" },
    signal: AbortSignal.timeout(10_000),
  }).then(async response => {
    if (!response.ok) {
      throw new Error(`Transcript font upstream returned ${response.status}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_TRANSCRIPT_FONT_BYTES) {
      throw new Error("Transcript font upstream returned an invalid file size");
    }
    return bytes;
  });

  fontCache.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    if (fontCache.get(key) === pending) fontCache.delete(key);
    throw error;
  }
}

export function registerTranscriptFontRoutes(app: Express) {
  app.get("/api/assets/transcript-font/:font", async (req, res) => {
    const key = req.params.font;
    const source = getTranscriptFontSource(key);
    if (!source) {
      return res.status(404).json({ error: "Transcript font not found" });
    }

    try {
      const bytes = await loadTranscriptFont(key as TranscriptFontKey);
      res.set({
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${source.fileName}"`,
        "Content-Length": String(bytes.length),
        "Content-Type": "font/ttf",
        "X-Content-Type-Options": "nosniff",
      });
      return res.status(200).send(bytes);
    } catch (error) {
      console.warn("[TranscriptFont] Failed to load approved font subset", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.set("Cache-Control", "no-store");
      return res
        .status(502)
        .json({ error: "Transcript font is temporarily unavailable" });
    }
  });
}
