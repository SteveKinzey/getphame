import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";

const projectFile = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const getPath = (value: unknown, dottedPath: string): unknown =>
  dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);

const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

const requiredComposerKeys = [
  "mainForm.previewCustomer",
  "mainForm.subjectRequired",
  "mainForm.subjectTooLong",
  "mainForm.subjectSingleLine",
  "mainForm.bodyRequired",
  "mainForm.bodyTooLong",
  "mainForm.yelpDirectLinkBlocked",
  "mainForm.editMessageTitle",
  "mainForm.editMessageDescription",
  "mainForm.resetToTemplate",
  "mainForm.subjectLabel",
  "mainForm.messageLabel",
  "mainForm.placeholderHelp",
  "mainForm.livePreview",
  "mainForm.previewPlaceholder",
  "mainForm.sendingTo",
  "mainForm.reviewAndSend",
  "mainForm.complianceReminderTitle",
  "mainForm.complianceReminderBody",
  "mainForm.finalPreviewTitle",
  "mainForm.finalPreviewDescription",
  "mainForm.to",
  "mainForm.backToEdit",
  "mainForm.confirmAndSend",
] as const;

describe("individual Send Request composer", () => {
  it("keeps send-time edits local, renders recipient variables, and sends only after final review", () => {
    const source = projectFile("client/src/pages/SendRequest.tsx");

    expect(source).toContain('const [draftSubject, setDraftSubject] = useState("")');
    expect(source).toContain('const [draftBody, setDraftBody] = useState("")');
    expect(source).toContain("renderReviewRequestDraft(draftSubject, draftContext)");
    expect(source).toContain("renderReviewRequestDraft(draftBody, draftContext)");
    expect(source).toContain("containsDirectYelpLink(`${draftSubject}\\n${draftBody}`)");
    expect(source).toContain("handleReviewBeforeSend()");
    expect(source).toContain('data-testid="send-final-preview-dialog"');
    expect(source).toContain("disabled={sending || !allComplianceChecked}");
    expect(source).toContain("handleConfirmedSend()");
    expect(source).toContain("editedSubject: draftSubject.trim()");
    expect(source).toContain("editedBody: draftBody.trim()");
    expect(source).toContain("complianceConfirmed: true");
  });

  it("validates paired edited copy and confirmation on the server, then stores the exact rendered message", () => {
    const source = projectFile("server/routers.ts");

    expect(source).toContain("editedSubject: z.string()");
    expect(source).toContain(".max(MAX_REVIEW_REQUEST_SUBJECT_CHARS)");
    expect(source).toContain(".max(MAX_REVIEW_REQUEST_BODY_CHARS).optional()");
    expect(source).toContain("Edited subject and body must be submitted together");
    expect(source).toContain("Confirm the compliance checklist before sending edited copy");
    expect(source).toContain("subject = renderDraft(input.editedSubject)");
    expect(source).toContain("htmlBody = wrapPlainTextReviewRequestHtml(renderDraft(input.editedBody))");
    expect(source).toContain("emailSubject: subject");
    expect(source).toContain("emailBody: htmlBody");
  });

  it("keeps the template editor preview on the same neutral, Yelp-safe rendering contract", () => {
    const source = projectFile("client/src/pages/EmailTemplates.tsx");

    expect(source).toContain("getFallbackReviewRequestDraft()");
    expect(source).toContain("getReviewPlatformValue(");
    expect(source).toContain("buildSafePlatformLinks(");
  });

  it.each(locales)("provides every composer key in the %s catalog and runtime fallback", (locale) => {
    const catalog = JSON.parse(
      projectFile(`client/public/locales/${locale}/translation.json`),
    ) as Record<string, unknown>;
    const fallback = directKeyFallbackResources[locale] as Record<string, unknown>;

    for (const key of requiredComposerKeys) {
      const maintainedValue = getPath(catalog, key);
      const fallbackValue = getPath(fallback, key);
      expect(maintainedValue, `${locale}:${key}`).toEqual(expect.any(String));
      expect((maintainedValue as string).trim(), `${locale}:${key}`).not.toBe("");
      expect(fallbackValue, `fallback:${locale}:${key}`).toBe(maintainedValue);
    }
  });
});
