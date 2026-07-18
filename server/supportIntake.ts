export const SUPPORT_TOPICS = ["billing", "onboarding", "technical"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_SUBMISSION_STATUSES = ["open", "in_progress", "resolved"] as const;
export type SupportSubmissionStatus = (typeof SUPPORT_SUBMISSION_STATUSES)[number];

export const SUPPORT_ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type SupportAttachmentMimeType = (typeof SUPPORT_ATTACHMENT_MIME_TYPES)[number];

export const MAX_SUPPORT_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const attachmentExtensions: Record<SupportAttachmentMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isValidSupportScreenshot(data: Buffer, mimeType: SupportAttachmentMimeType): boolean {
  if (mimeType === "image/jpeg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
}

export function getSupportAttachmentExtension(mimeType: SupportAttachmentMimeType): string {
  return attachmentExtensions[mimeType];
}

export function sanitizeSupportAttachmentFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\\/]+/g, " ")
    .replace(/[^a-zA-Z0-9._() -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return cleaned || "screenshot";
}
