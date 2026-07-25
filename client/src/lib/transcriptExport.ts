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
  metadata: TranscriptExportMetadata,
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
  const body = cues.map((cue) => `[${formatTranscriptTimestamp(cue.startTime)}] ${cue.text}`);
  return [...header, ...body, ""].join("\n");
}

export function createTranscriptTextBlob(
  cues: readonly ExportTranscriptCue[],
  metadata: TranscriptExportMetadata,
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
  metadata: TranscriptExportMetadata,
) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ format: "a4", unit: "pt", compress: true });
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

  document.setFontSize(14);
  document.text(normalizePdfText(metadata.documentTitle), margin, cursorY);
  cursorY += 26;

  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(70, 82, 101);
  const metadataLines = [
    `${metadata.languageLabel}: ${metadata.languageValue}`,
    `${metadata.generatedLabel}: ${metadata.generatedValue}`,
    `${metadata.sourceLabel}: ${metadata.sourceValue}`,
  ].map(normalizePdfText);
  document.text(metadataLines, margin, cursorY, { lineHeightFactor: 1.45 });
  cursorY += metadataLines.length * 13 + 18;

  document.setDrawColor(212, 166, 54);
  document.setLineWidth(1.5);
  document.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 22;

  document.setFontSize(10.5);
  document.setTextColor(20, 30, 46);
  const lineHeight = 14;

  for (const cue of cues) {
    const cueText = normalizePdfText(`[${formatTranscriptTimestamp(cue.startTime)}] ${cue.text}`);
    const wrappedLines = document.splitTextToSize(cueText, contentWidth) as string[];
    const requiredHeight = Math.max(lineHeight, wrappedLines.length * lineHeight) + 6;
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
    document.text(`${pageNumber} / ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }

  return document.output("blob");
}

export function buildTranscriptFilename(language: string, format: TranscriptExportFormat) {
  const safeLanguage = language.toLowerCase().replace(/[^a-z0-9-]/g, "") || "en";
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
