export const SUPPORT_TOPICS = [
  "billing",
  "onboarding",
  "technical",
  "quiet_hours_exception",
] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_SUBMISSION_STATUSES = [
  "open",
  "in_progress",
  "resolved",
] as const;
export type SupportSubmissionStatus =
  (typeof SUPPORT_SUBMISSION_STATUSES)[number];

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_TICKET_ALERT_TYPES = [
  "assignment",
  "escalation",
  "mention",
  "sla_breach",
] as const;
export type SupportTicketAlertType =
  (typeof SUPPORT_TICKET_ALERT_TYPES)[number];

export const SUPPORT_QUEUE_ASSIGNEE_SCOPES = [
  "any",
  "unassigned",
  "specific",
] as const;
export type SupportQueueAssigneeScope =
  (typeof SUPPORT_QUEUE_ASSIGNEE_SCOPES)[number];

export const SUPPORT_QUEUE_SLA_WINDOWS = [
  "overdue",
  "next_4_hours",
  "next_24_hours",
] as const;
export type SupportQueueSlaWindow = (typeof SUPPORT_QUEUE_SLA_WINDOWS)[number];

export const SUPPORT_QUEUE_SORTS = [
  "newest",
  "oldest",
  "priority",
  "assignee",
  "sla_soonest",
  "due_soonest",
] as const;
export type SupportQueueSort = (typeof SUPPORT_QUEUE_SORTS)[number];

export const SUPPORT_QUEUE_VIEW_VISIBILITIES = ["private", "team"] as const;
export type SupportQueueViewVisibility =
  (typeof SUPPORT_QUEUE_VIEW_VISIBILITIES)[number];

export const MAX_SUPPORT_SAVED_QUEUE_VIEWS = 20;
export const MAX_SUPPORT_SAVED_QUEUE_VIEW_NAME_CHARS = 80;
export const MAX_SUPPORT_EXPORT_RANGE_DAYS = 366;
export const MAX_SUPPORT_ESCALATION_THRESHOLD_MINUTES = 7 * 24 * 60;
export const SUPPORT_ESCALATION_POLICY_KEY = "urgent_sla_breach";

export function normalizeSupportQueueViewName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export const SUPPORT_SLA_DURATION_MS: Record<SupportPriority, number> = {
  low: 72 * 60 * 60 * 1000,
  normal: 24 * 60 * 60 * 1000,
  high: 8 * 60 * 60 * 1000,
  urgent: 2 * 60 * 60 * 1000,
};

export const MAX_SUPPORT_INTERNAL_NOTE_CHARS = 4_000;
export const MAX_SUPPORT_INTERNAL_NOTE_MENTIONS = 12;
export const MAX_SUPPORT_DUE_DATE_FUTURE_DAYS = 365;
export const SUPPORT_TICKET_ALERT_DEDUP_WINDOW_MS = 5 * 60 * 1000;

export const SUPPORT_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type SupportAttachmentMimeType =
  (typeof SUPPORT_ATTACHMENT_MIME_TYPES)[number];

export const MAX_SUPPORT_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function getSupportSlaTargetAt(
  priority: SupportPriority,
  startedAt = new Date()
): Date {
  return new Date(startedAt.getTime() + SUPPORT_SLA_DURATION_MS[priority]);
}

export function isSupportEscalation(
  previous: SupportPriority,
  next: SupportPriority
): boolean {
  return (
    SUPPORT_PRIORITIES.indexOf(next) > SUPPORT_PRIORITIES.indexOf(previous)
  );
}

function escapeSupportNoteHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSupportNoteInline(value: string): string {
  let rendered = escapeSupportNoteHtml(value);
  // Only tags generated after escaping are rendered, so user-provided HTML never becomes executable markup.
  rendered = rendered.replace(/`([^`\n]{1,500})`/g, "<code>$1</code>");
  rendered = rendered.replace(
    /\*\*([^*\n]{1,1500})\*\*/g,
    "<strong>$1</strong>"
  );
  rendered = rendered.replace(/_([^_\n]{1,1500})_/g, "<em>$1</em>");
  rendered = rendered.replace(/~~([^~\n]{1,1500})~~/g, "<s>$1</s>");
  return rendered;
}

/**
 * Converts a deliberately small Markdown subset into safe presentation HTML.
 * The source is escaped before formatter tokens are applied; never accept arbitrary HTML for internal notes.
 */
export function renderSupportInternalNoteHtml(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const chunks: string[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0) {
      chunks.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  for (const line of lines) {
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(`<li>${renderSupportNoteInline(listMatch[1])}</li>`);
      continue;
    }

    flushList();
    if (!line.trim()) {
      chunks.push("<br />");
    } else {
      chunks.push(`<p>${renderSupportNoteInline(line)}</p>`);
    }
  }
  flushList();
  return chunks.join("");
}

/** Plain-text derivative used for accessible fallbacks and internal reporting/search. */
export function getSupportInternalNotePlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/(\*\*|~~|`|_)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const attachmentExtensions: Record<SupportAttachmentMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isValidSupportScreenshot(
  data: Buffer,
  mimeType: SupportAttachmentMimeType
): boolean {
  if (mimeType === "image/jpeg") {
    return (
      data.length >= 3 &&
      data[0] === 0xff &&
      data[1] === 0xd8 &&
      data[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    return (
      data.length >= 8 &&
      data
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  return (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function getSupportAttachmentExtension(
  mimeType: SupportAttachmentMimeType
): string {
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
