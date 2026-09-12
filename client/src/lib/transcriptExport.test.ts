import { describe, expect, it } from "vitest";
import {
  buildTranscriptDocument,
  buildTranscriptFilename,
  createTranscriptPdfBlob,
  createTranscriptTextBlob,
  detectTranscriptPdfUnicodeFont,
  formatTranscriptTimestamp,
  normalizePdfText,
  type TranscriptExportMetadata,
} from "./transcriptExport";

const metadata: TranscriptExportMetadata = {
  brand: "GET PHAME",
  documentTitle: "Platform walkthrough transcript",
  languageLabel: "Language",
  languageValue: "English",
  generatedLabel: "Generated",
  generatedValue: "July 25, 2026",
  sourceLabel: "Source",
  sourceValue: "https://getphame.app",
};

const cues = [
  {
    startTime: 0,
    text: "Great service does not always become a public review.",
  },
  { startTime: 65.5, text: "A second line with a deterministic timestamp." },
];

describe("transcript export", () => {
  it("formats safe timestamps, filenames, and UTF-8 text content deterministically", async () => {
    expect(formatTranscriptTimestamp(0)).toBe("0:00");
    expect(formatTranscriptTimestamp(65.5)).toBe("1:05");
    expect(formatTranscriptTimestamp(3661)).toBe("1:01:01");
    expect(buildTranscriptFilename("pt-BR", "text")).toBe(
      "get-phame-walkthrough-transcript-pt-br.txt"
    );
    expect(buildTranscriptFilename("../../", "pdf")).toBe(
      "get-phame-walkthrough-transcript-en.pdf"
    );

    const document = buildTranscriptDocument(cues, metadata);
    expect(document).toContain("GET PHAME");
    expect(document).toContain("Language: English");
    expect(document).toContain("Source: https://getphame.app");
    expect(document).toContain(
      "[0:00] Great service does not always become a public review."
    );
    expect(document).toContain(
      "[1:05] A second line with a deterministic timestamp."
    );

    const textBlob = createTranscriptTextBlob(cues, metadata);
    expect(textBlob.type).toBe("text/plain;charset=utf-8");
    const textBytes = new Uint8Array(await textBlob.arrayBuffer());
    expect(Array.from(textBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(textBytes)).toContain("GET PHAME");
  });

  it("normalizes unsupported punctuation and generates a valid PDF blob", async () => {
    expect(normalizePdfText("“Hello”—wait…")).toBe('"Hello"-wait...');
    const pdfBlob = await createTranscriptPdfBlob(cues, metadata);
    const prefix = new TextDecoder().decode(
      (await pdfBlob.arrayBuffer()).slice(0, 5)
    );
    expect(pdfBlob.type).toBe("application/pdf");
    expect(prefix).toBe("%PDF-");
  });

  it("selects bounded Unicode font subsets only for Chinese and Thai PDF metadata", () => {
    expect(
      detectTranscriptPdfUnicodeFont(["平台導覽轉錄文字", "語言"])
    ).toMatchObject({
      family: "NotoSansTranscriptCjk",
      url: "/api/assets/transcript-font/cjk",
    });
    expect(
      detectTranscriptPdfUnicodeFont(["บทถอดเสียงวิดีโอแนะนำแพลตฟอร์ม", "ภาษา"])
    ).toMatchObject({
      family: "NotoSansTranscriptThai",
      url: "/api/assets/transcript-font/thai",
    });
    expect(
      detectTranscriptPdfUnicodeFont([
        "Platform walkthrough transcript",
        "Language",
      ])
    ).toBeNull();
  });
});
