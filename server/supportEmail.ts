import { sendSystemEmail, HELLO_FROM } from "./sendgrid";

export const SUPPORT_FROM_EMAIL = "hello@getphame.app";
export const SUPPORT_TO_EMAIL = "support@getphame.app";

export interface SupportMessageInput {
  name?: string;
  email: string;
  topic: "billing" | "onboarding" | "technical" | "quiet_hours_exception";
  subject: string;
  message: string;
  submissionId?: number;
  attachment?: {
    filename: string;
    url: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function compact(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function topicLabel(topic: SupportMessageInput["topic"]): string {
  if (topic === "billing") return "Billing";
  if (topic === "onboarding") return "Onboarding";
  if (topic === "quiet_hours_exception") return "Quiet-hours exception";
  return "Technical issue";
}

export async function sendSupportMessage(input: SupportMessageInput): Promise<{ sent: boolean }> {
  const safeName = compact(input.name || "Not provided");
  const safeEmail = compact(input.email);
  const safeTopic = topicLabel(input.topic);
  const safeSubject = compact(input.subject);
  const safeMessage = input.message.trim();
  const safeAttachmentName = input.attachment ? compact(input.attachment.filename) : null;
  const safeAttachmentUrl = input.attachment?.url ?? null;
  const reference = input.submissionId ? `#${input.submissionId}` : "Pending record ID";
  const attachmentText = safeAttachmentName && safeAttachmentUrl
    ? `\nScreenshot: ${safeAttachmentName}\n${safeAttachmentUrl}`
    : "";
  const attachmentHtml = safeAttachmentName && safeAttachmentUrl
    ? `<dt style="font-weight:700;margin-top:12px;">Screenshot</dt><dd style="margin:4px 0 0;"><a href="${escapeHtml(safeAttachmentUrl)}">${escapeHtml(safeAttachmentName)}</a></dd>`
    : "";

  try {
    await sendSystemEmail({
      to: SUPPORT_TO_EMAIL,
      from: HELLO_FROM,
      replyTo: safeEmail,
      subject: `[${safeTopic}] Support request: ${safeSubject}`,
      text: `New Get Phame support request ${reference}\n\nTopic: ${safeTopic}\nName: ${safeName}\nEmail: ${safeEmail}\nSubject: ${safeSubject}${attachmentText}\n\nMessage:\n${safeMessage}`,
      html: `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:32px;background:#f4f5f7;color:#101828;font-family:Arial,sans-serif;"><main style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;"><h1 style="margin:0 0 8px;color:#0c1b33;font-size:22px;">New Get Phame support request</h1><p style="margin:0 0 20px;color:#475467;">Reference ${escapeHtml(reference)}</p><dl style="margin:0 0 24px;"><dt style="font-weight:700;margin-top:12px;">Topic</dt><dd style="margin:4px 0 0;">${escapeHtml(safeTopic)}</dd><dt style="font-weight:700;margin-top:12px;">Name</dt><dd style="margin:4px 0 0;">${escapeHtml(safeName)}</dd><dt style="font-weight:700;margin-top:12px;">Email</dt><dd style="margin:4px 0 0;"><a href="mailto:${escapeHtml(safeEmail)}">${escapeHtml(safeEmail)}</a></dd><dt style="font-weight:700;margin-top:12px;">Subject</dt><dd style="margin:4px 0 0;">${escapeHtml(safeSubject)}</dd>${attachmentHtml}</dl><h2 style="margin:0 0 8px;font-size:16px;">Message</h2><p style="margin:0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(safeMessage)}</p></main></body></html>`,
    });
    console.info("[Support] Message submitted to provider", { accepted: true });
    return { sent: true };
  } catch (error) {
    console.error("[Support] Failed to submit message to provider", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { sent: false };
  }
}
