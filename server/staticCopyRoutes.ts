import type { Express } from "express";
import { storageGet } from "./storage";

const MAX_STATIC_COPY_BYTES = 512 * 1024;

const STATIC_COPY_SOURCES = {
  es: {
    storageKey: "static-copy/2026-07-28-exact-annual-pricing/getphame-static-copy-es.json",
    fileName: "getphame-static-copy-es.json",
  },
  fr: {
    storageKey: "static-copy/2026-07-28-exact-annual-pricing/getphame-static-copy-fr.json",
    fileName: "getphame-static-copy-fr.json",
  },
  it: {
    storageKey: "static-copy/2026-07-28-exact-annual-pricing/getphame-static-copy-it.json",
    fileName: "getphame-static-copy-it.json",
  },
  th: {
    storageKey: "static-copy/2026-07-28-exact-annual-pricing/getphame-static-copy-th.json",
    fileName: "getphame-static-copy-th.json",
  },
  "zh-CN": {
    storageKey: "static-copy/2026-07-28-exact-annual-pricing/getphame-static-copy-zh-CN.json",
    fileName: "getphame-static-copy-zh-CN.json",
  },
  "zh-TW": {
    storageKey: "static-copy/2026-07-28-exact-annual-pricing/getphame-static-copy-zh-TW.json",
    fileName: "getphame-static-copy-zh-TW.json",
  },
} as const;

export type StaticCopyLocale = keyof typeof STATIC_COPY_SOURCES;

const staticCopyCache = new Map<StaticCopyLocale, Promise<Buffer>>();

export function getStaticCopySource(value: string) {
  return Object.prototype.hasOwnProperty.call(STATIC_COPY_SOURCES, value)
    ? STATIC_COPY_SOURCES[value as StaticCopyLocale]
    : null;
}

export function clearStaticCopyCacheForTests() {
  staticCopyCache.clear();
}

function validateStaticCopy(bytes: Buffer, locale: StaticCopyLocale) {
  const payload = JSON.parse(bytes.toString("utf8")) as {
    locale?: unknown;
    manifest?: unknown;
    translations?: unknown;
  };

  if (
    payload.locale !== locale ||
    !Array.isArray(payload.manifest) ||
    !payload.translations ||
    typeof payload.translations !== "object" ||
    Array.isArray(payload.translations)
  ) {
    throw new Error("Static copy upstream returned an invalid catalog");
  }
}

async function loadStaticCopy(locale: StaticCopyLocale) {
  const cached = staticCopyCache.get(locale);
  if (cached) return cached;

  const source = STATIC_COPY_SOURCES[locale];
  const pending = storageGet(source.storageKey)
    .then(({ url }) => fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    }))
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Static copy upstream returned ${response.status}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_STATIC_COPY_BYTES) {
        throw new Error("Static copy upstream returned an invalid file size");
      }
      validateStaticCopy(bytes, locale);
      return bytes;
    });

  staticCopyCache.set(locale, pending);
  try {
    return await pending;
  } catch (error) {
    if (staticCopyCache.get(locale) === pending) staticCopyCache.delete(locale);
    throw error;
  }
}

export function registerStaticCopyRoutes(app: Express) {
  app.get("/api/assets/static-copy/:locale", async (req, res) => {
    const locale = req.params.locale;
    const source = getStaticCopySource(locale);
    if (!source) {
      return res.status(404).json({ error: "Static localization catalog not found" });
    }

    try {
      const bytes = await loadStaticCopy(locale as StaticCopyLocale);
      res.set({
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${source.fileName}"`,
        "Content-Length": String(bytes.length),
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
      return res.status(200).send(bytes);
    } catch (error) {
      console.warn("[StaticCopy] Failed to load approved localization catalog", {
        locale,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.set("Cache-Control", "no-store");
      return res.status(502).json({ error: "Static localization catalog is temporarily unavailable" });
    }
  });
}
