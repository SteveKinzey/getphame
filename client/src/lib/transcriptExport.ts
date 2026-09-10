export type ExportTranscriptCue = {
  startTime: number;
  text: string;
};

export type TranscriptExportMetadata = {
  brand: string;
  documentTitle: string;
  languageLabel: string;
  languageValue: string;
  generatedLabel: string;
  generatedValue: string;
  sourceLabel: string;
  sourceValue: string;
};

export type TranscriptExportFormat = "text" | "pdf";

export type PdfUnicodeFont = {
  family: string;
  fileName: string;
  url: string;
};

const PDF_UNICODE_FONTS = {
  cjk: {
    family: "NotoSansTranscriptCjk",
    fileName: "noto-sans-tc-transcript.ttf",
    url: "/api/assets/transcript-font/cjk",
  },
  thai: {
    family: "NotoSansTranscriptThai",
    fileName: "noto-sans-thai-transcript-v2.ttf",
    url: "/api/assets/transcript-font/thai",
  },
} satisfies Record<string, PdfUnicodeFont>;

const pdfFontDataCache = new Map<string, Promise<string>>();

export function detectTranscriptPdfUnicodeFont(
  values: readonly string[]
): PdfUnicodeFont | null {
  const content = values.join("\n");
  if (/[\u0e00-\u0e7f]/.test(content)) return PDF_UNICODE_FONTS.thai;
  if (/[\u3400-\u9fff\uf900-\ufaff]/.test(content))
    return PDF_UNICODE_FONTS.cjk;
  return null;
}

export async function fetchPdfFontAsBase64(url: string) {
  const cached = pdfFontDataCache.get(url);
  if (cached) return cached;

  const request = fetch(url, { credentials: "same-origin" }).then(
    async response => {
      if (!response.ok) {
        throw new Error(
          `Transcript PDF font request failed with status ${response.status}`
        );
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        const limit = Math.min(offset + 0x8000, bytes.length);
        for (let index = offset; index < limit; index += 1) {
          binary += String.fromCharCode(bytes[index]);
        }
      }
      return window.btoa(binary);
    }
  );

  pdfFontDataCache.set(url, request);
  try {
    return await request;
  } catch (error) {
    pdfFontDataCache.delete(url);
    throw error;
  }
}

export function formatTranscriptTimestamp(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function buildTranscriptDocument(
  cues: readonly ExportTranscriptCue[],
  metadata: TranscriptExportMetadata
) {
  const header = [
    metadata.brand,
    metadata.documentTitle,
    "",
    `${metadata.languageLabel}: ${metadata.languageValue}`,
    `${metadata.generatedLabel}: ${metadata.generatedValue}`,
    `${metadata.sourceLabel}: ${metadata.sourceValue}`,
    "",
    "—".repeat(36),
    "",
  ];
  const body = cues.map(
    cue => `[${formatTranscriptTimestamp(cue.startTime)}] ${cue.text}`
  );
  return [...header, ...body, ""].join("\n");
}

export function createTranscriptTextBlob(
  cues: readonly ExportTranscriptCue[],
  metadata: TranscriptExportMetadata
) {
  return new Blob(["\uFEFF", buildTranscriptDocument(cues, metadata)], {
    type: "text/plain;charset=utf-8",
  });
}

export function normalizePdfText(value: string) {
  return value
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[\u00a0\u202f]/g, " ");
}

export async function createTranscriptPdfBlob(
  cues: readonly ExportTranscriptCue[],
  metadata: TranscriptExportMetadata
) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ format: "a4", unit: "pt", compress: true });
  const unicodeFont = detectTranscriptPdfUnicodeFont([
    metadata.documentTitle,
    metadata.languageLabel,
    metadata.languageValue,
    metadata.generatedLabel,
    metadata.generatedValue,
    metadata.sourceLabel,
  ]);
  if (unicodeFont) {
    const fontData = await fetchPdfFontAsBase64(unicodeFont.url);
    document.addFileToVFS(unicodeFont.fileName, fontData);
    document.addFont(unicodeFont.fileName, unicodeFont.family, "normal");
  }
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 28;
  let cursorY = 52;

  document.setProperties({
    title: normalizePdfText(`${metadata.brand} — ${metadata.documentTitle}`),
    subject: normalizePdfText(metadata.documentTitle),
    author: metadata.brand,
    creator: metadata.brand,
  });

  document.setTextColor(6, 17, 31);
  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text(normalizePdfText(metadata.brand), margin, cursorY);
  cursorY += 24;

  if (unicodeFont) document.setFont(unicodeFont.family, "normal");
  document.setFontSize(14);
  document.text(normalizePdfText(metadata.documentTitle), margin, cursorY);
  cursorY += 26;

  document.setFontSize(9);
  document.setTextColor(70, 82, 101);
  const metadataRows = [
    { label: metadata.languageLabel, value: metadata.languageValue },
    { label: metadata.generatedLabel, value: metadata.generatedValue },
    { label: metadata.sourceLabel, value: metadata.sourceValue },
  ];
  for (const row of metadataRows) {
    const label = normalizePdfText(`${row.label}: `);
    const value = normalizePdfText(row.value);
    document.setFont(unicodeFont?.family ?? "helvetica", "normal");
    document.text(label, margin, cursorY);
    const valueX = margin + document.getTextWidth(label);
    const valueUnicodeFont = detectTranscriptPdfUnicodeFont([value]);
    document.setFont(
      unicodeFont && valueUnicodeFont?.family === unicodeFont.family
        ? unicodeFont.family
        : "helvetica",
      "normal"
    );
    document.text(value, valueX, cursorY);
    cursorY += 13;
  }
  cursorY += 18;

  document.setDrawColor(212, 166, 54);
  document.setLineWidth(1.5);
  document.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 22;

  document.setFont("helvetica", "normal");
  document.setFontSize(10.5);
  document.setTextColor(20, 30, 46);
  const lineHeight = 14;

  for (const cue of cues) {
    const cueText = normalizePdfText(
      `[${formatTranscriptTimestamp(cue.startTime)}] ${cue.text}`
    );
    const wrappedLines = document.splitTextToSize(
      cueText,
      contentWidth
    ) as string[];
    const requiredHeight =
      Math.max(lineHeight, wrappedLines.length * lineHeight) + 6;
    if (cursorY + requiredHeight > footerY) {
      document.addPage();
      cursorY = 52;
    }
    document.text(wrappedLines, margin, cursorY, { lineHeightFactor: 1.35 });
    cursorY += requiredHeight;
  }

  const pageCount = document.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    document.setPage(pageNumber);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(110, 120, 135);
    document.text(`${pageNumber} / ${pageCount}`, pageWidth - margin, footerY, {
      align: "right",
    });
  }

  return document.output("blob");
}

export function buildTranscriptFilename(
  language: string,
  format: TranscriptExportFormat
) {
  const safeLanguage =
    language.toLowerCase().replace(/[^a-z0-9-]/g, "") || "en";
  const extension = format === "text" ? "txt" : "pdf";
  return `get-phame-walkthrough-transcript-${safeLanguage}.${extension}`;
}

export function downloadTranscriptBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
