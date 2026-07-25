import type { ManualAccess, ManualDocument, ManualRole, ManualSection } from "@/content/manuals/types";
import {
  detectTranscriptPdfUnicodeFont,
  fetchPdfFontAsBase64,
  normalizePdfText,
} from "@/lib/transcriptExport";

export type ManualPdfLabels = {
  fullScope: string;
  sectionScope: string;
  scope: string;
  language: string;
  generated: string;
  lastUpdated: string;
  version: string;
  access: Record<ManualAccess, string>;
  steps: string;
  notes: string;
  featurePath: string;
  page: string;
};

export type ManualPdfOptions = {
  role: ManualRole;
  locale: string;
  languageLabel: string;
  generatedAt: Date;
  labels: ManualPdfLabels;
  sectionId?: string;
};

function safeSlug(value: string, fallback: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

export function buildManualPdfFilename(input: { role: ManualRole; locale: string; sectionId?: string }) {
  const role = input.role === "admin" ? "admin-manual" : "user-manual";
  const locale = safeSlug(input.locale, "en");
  const section = input.sectionId ? `-${safeSlug(input.sectionId, "section")}` : "";
  return `get-phame-${role}-${locale}${section}.pdf`;
}

export function getManualPdfSections(manual: ManualDocument, sectionId?: string): ManualSection[] {
  if (!sectionId) return manual.sections;
  const section = manual.sections.find(candidate => candidate.id === sectionId);
  if (!section) throw new Error("The selected Manual section is unavailable.");
  return [section];
}

export async function createManualPdfBlob(manual: ManualDocument, options: ManualPdfOptions) {
  const sections = getManualPdfSections(manual, options.sectionId);
  const scopeTitle = options.sectionId ? sections[0].title : options.labels.fullScope;
  const unicodeFont = detectTranscriptPdfUnicodeFont([
    manual.title,
    manual.introduction,
    options.languageLabel,
    scopeTitle,
    ...sections.flatMap(section => [
      section.title,
      section.summary,
      ...section.topics.flatMap(topic => [topic.title, topic.body, ...topic.steps, ...(topic.notes ?? [])]),
    ]),
  ]);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", unit: "pt", compress: true });

  if (unicodeFont) {
    const fontData = await fetchPdfFontAsBase64(unicodeFont.url);
    pdf.addFileToVFS(unicodeFont.fileName, fontData);
    pdf.addFont(unicodeFont.fileName, unicodeFont.family, "normal");
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const footerY = pageHeight - 28;
  let cursorY = 52;

  const setFont = (weight: "normal" | "bold" = "normal") => {
    pdf.setFont(unicodeFont?.family ?? "helvetica", unicodeFont ? "normal" : weight);
  };
  const addPage = () => {
    pdf.addPage();
    cursorY = 52;
  };
  const ensureSpace = (height: number) => {
    if (cursorY + height > footerY - 12) addPage();
  };
  const write = (value: string, options?: {
    size?: number;
    color?: [number, number, number];
    weight?: "normal" | "bold";
    lineHeight?: number;
    indent?: number;
    gapAfter?: number;
  }) => {
    const size = options?.size ?? 10.5;
    const lineHeight = options?.lineHeight ?? 1.35;
    const indent = options?.indent ?? 0;
    const text = normalizePdfText(value);
    setFont(options?.weight ?? "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...(options?.color ?? [20, 30, 46]));
    const lines = pdf.splitTextToSize(text, contentWidth - indent) as string[];
    const height = Math.max(size * lineHeight, lines.length * size * lineHeight);
    ensureSpace(height + (options?.gapAfter ?? 8));
    pdf.text(lines, margin + indent, cursorY, { lineHeightFactor: lineHeight });
    cursorY += height + (options?.gapAfter ?? 8);
  };

  pdf.setProperties({
    title: normalizePdfText(`GET PHAME - ${manual.title} - ${scopeTitle}`),
    subject: normalizePdfText(scopeTitle),
    author: "Get Phame",
    creator: "Get Phame",
  });

  pdf.setTextColor(6, 17, 31);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("GET PHAME", margin, cursorY);
  cursorY += 25;
  write(manual.title, { size: 15, weight: "bold", gapAfter: 7 });
  write(manual.introduction, { size: 9.5, color: [70, 82, 101], gapAfter: 14 });

  const generated = new Intl.DateTimeFormat(options.locale, { dateStyle: "long", timeStyle: "short" }).format(options.generatedAt);
  const updated = new Intl.DateTimeFormat(options.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${manual.lastUpdated}T00:00:00Z`));
  const metadataRows = [
    `${options.labels.scope}: ${options.sectionId ? options.labels.sectionScope : options.labels.fullScope} - ${scopeTitle}`,
    `${options.labels.language}: ${options.languageLabel}`,
    `${options.labels.generated}: ${generated}`,
    `${options.labels.lastUpdated}: ${updated}`,
    `${options.labels.version}: ${manual.version}`,
  ];
  for (const row of metadataRows) write(row, { size: 8.5, color: [70, 82, 101], gapAfter: 3 });
  cursorY += 10;
  pdf.setDrawColor(212, 166, 54);
  pdf.setLineWidth(1.5);
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 22;

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      ensureSpace(88);
      cursorY += 10;
    }
    write(section.title, { size: 16, weight: "bold", color: [6, 17, 31], gapAfter: 6 });
    if (section.access === "admin") {
      write(options.labels.access.admin, { size: 8.5, weight: "bold", color: [47, 65, 105], gapAfter: 6 });
    }
    write(section.summary, { size: 10, color: [70, 82, 101], gapAfter: 17 });

    section.topics.forEach((topic, topicIndex) => {
      ensureSpace(92);
      write(`${topicIndex + 1}. ${topic.title}`, { size: 12.5, weight: "bold", color: [6, 17, 31], gapAfter: 5 });
      write(options.labels.access[topic.access], { size: 8.5, weight: "bold", color: topic.access === "paid" ? [102, 77, 0] : topic.access === "admin" ? [47, 65, 105] : [21, 94, 63], gapAfter: 7 });
      write(topic.body, { gapAfter: 8 });
      write(options.labels.steps, { size: 9, weight: "bold", color: [70, 82, 101], gapAfter: 5 });
      topic.steps.forEach((step, stepIndex) => write(`${stepIndex + 1}. ${step}`, { indent: 12, gapAfter: 5 }));
      if (topic.notes?.length) {
        write(options.labels.notes, { size: 9, weight: "bold", color: [102, 77, 0], gapAfter: 4 });
        topic.notes.forEach(note => write(note, { indent: 12, color: [77, 59, 0], gapAfter: 5 }));
      }
      if (topic.route) write(`${options.labels.featurePath}: ${topic.route}`, { size: 8.5, color: [70, 82, 101], gapAfter: 13 });
      cursorY += 5;
    });
  });

  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 135);
    pdf.text(
      options.labels.page.replace("{{current}}", String(pageNumber)).replace("{{total}}", String(pageCount)),
      pageWidth - margin,
      footerY,
      { align: "right" },
    );
  }

  return pdf.output("blob");
}

export function downloadManualPdfBlob(blob: Blob, filename: string) {
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
