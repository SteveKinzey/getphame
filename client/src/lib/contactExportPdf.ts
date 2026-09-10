import type { RouterOutputs } from "@/lib/trpc";
import {
  detectTranscriptPdfUnicodeFont,
  fetchPdfFontAsBase64,
  normalizePdfText,
} from "@/lib/transcriptExport";

export type ContactExportSnapshot = RouterOutputs["contacts"]["prepareExport"];

export type ContactExportPdfLabels = {
  title: string;
  generated: string;
  contacts: string;
  truncated: string;
  contact: string;
  sourceAndTags: string;
  consent: string;
  sends: string;
  status: string;
  created: string;
  page: string;
};

function formatExportDate(value: string | number, locale: string): string {
  if (value === "" || value === null || value === undefined) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function createContactExportPdfBlob(input: {
  snapshot: ContactExportSnapshot;
  locale: string;
  generatedAt: Date;
  labels: ContactExportPdfLabels;
}) {
  const { snapshot, locale, generatedAt, labels } = input;
  const allText = snapshot.rows.flatMap(row => Object.values(row).map(String));
  const unicodeFont = detectTranscriptPdfUnicodeFont([
    labels.title,
    ...Object.values(labels),
    ...allText,
  ]);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "landscape",
    format: "a4",
    unit: "pt",
    compress: true,
  });

  if (unicodeFont) {
    const fontData = await fetchPdfFontAsBase64(unicodeFont.url);
    pdf.addFileToVFS(unicodeFont.fileName, fontData);
    pdf.addFont(unicodeFont.fileName, unicodeFont.family, "normal");
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const footerY = pageHeight - 22;
  const columnWidths = [185, 140, 110, 115, 80, 140] as const;
  const headers = [
    labels.contact,
    labels.sourceAndTags,
    labels.consent,
    labels.sends,
    labels.status,
    labels.created,
  ];
  let cursorY = 36;

  const setFont = (weight: "normal" | "bold" = "normal") => {
    pdf.setFont(
      unicodeFont?.family ?? "helvetica",
      unicodeFont ? "normal" : weight
    );
  };

  const drawDocumentHeader = () => {
    setFont("bold");
    pdf.setFontSize(17);
    pdf.setTextColor(6, 17, 31);
    pdf.text("GET PHAME", margin, cursorY);
    cursorY += 21;
    pdf.setFontSize(13);
    pdf.text(normalizePdfText(labels.title), margin, cursorY);
    cursorY += 17;
    setFont();
    pdf.setFontSize(8.5);
    pdf.setTextColor(70, 82, 101);
    const generated = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(generatedAt);
    const summary = `${labels.contacts}: ${snapshot.exportedCount} · ${labels.generated}: ${generated}${snapshot.truncated ? ` · ${labels.truncated}` : ""}`;
    pdf.text(normalizePdfText(summary), margin, cursorY);
    cursorY += 15;
    pdf.setDrawColor(212, 166, 54);
    pdf.setLineWidth(1.5);
    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 12;
  };

  const drawTableHeader = () => {
    let cursorX = margin;
    pdf.setFillColor(6, 17, 31);
    pdf.rect(margin, cursorY, pageWidth - margin * 2, 22, "F");
    setFont("bold");
    pdf.setFontSize(8);
    pdf.setTextColor(245, 205, 104);
    headers.forEach((header, index) => {
      pdf.text(normalizePdfText(header), cursorX + 5, cursorY + 14, {
        maxWidth: columnWidths[index] - 10,
      });
      cursorX += columnWidths[index];
    });
    cursorY += 22;
  };

  const addPage = () => {
    pdf.addPage();
    cursorY = 34;
    drawTableHeader();
  };

  drawDocumentHeader();
  drawTableHeader();

  snapshot.rows.forEach((row, rowIndex) => {
    const cells = [
      [row.name, row.email, row.phone].filter(Boolean).join("\n"),
      [row.source, row.tags].filter(Boolean).join("\n"),
      [row.consentStatus, row.consentBasis].filter(Boolean).join("\n"),
      [String(row.totalSent), formatExportDate(row.lastSentAt, locale)]
        .filter(Boolean)
        .join("\n"),
      String(row.suppressionStatus),
      formatExportDate(row.createdAt, locale),
    ].map(normalizePdfText);

    setFont();
    pdf.setFontSize(7.8);
    const splitCells = cells.map(
      (cell, index) =>
        pdf.splitTextToSize(cell || "—", columnWidths[index] - 10) as string[]
    );
    const lineCount = Math.max(...splitCells.map(lines => lines.length));
    const rowHeight = Math.min(52, Math.max(24, lineCount * 9 + 8));
    if (cursorY + rowHeight > footerY - 8) addPage();

    if (rowIndex % 2 === 1) {
      pdf.setFillColor(248, 247, 243);
      pdf.rect(margin, cursorY, pageWidth - margin * 2, rowHeight, "F");
    }
    pdf.setDrawColor(225, 227, 231);
    pdf.line(
      margin,
      cursorY + rowHeight,
      pageWidth - margin,
      cursorY + rowHeight
    );
    pdf.setTextColor(20, 30, 46);

    let cursorX = margin;
    splitCells.forEach((lines, index) => {
      pdf.text(lines.slice(0, 5), cursorX + 5, cursorY + 11, {
        lineHeightFactor: 1.15,
      });
      cursorX += columnWidths[index];
    });
    cursorY += rowHeight;
  });

  pdf.setProperties({
    title: normalizePdfText(`GET PHAME - ${labels.title}`),
    subject: normalizePdfText(labels.title),
    author: "Get Phame",
    creator: "Get Phame",
  });

  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    setFont();
    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 135);
    pdf.text(
      normalizePdfText(
        labels.page
          .replace("{{current}}", String(pageNumber))
          .replace("{{total}}", String(pageCount))
      ),
      pageWidth - margin,
      footerY,
      { align: "right" }
    );
  }

  return pdf.output("blob");
}

export function downloadContactExportBlob(blob: Blob, filename: string) {
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
