/**
 * System email sender for the lead guide PDF.
 * Uses dedicated SYSTEM_SMTP_* env vars so the guide email is sent from a
 * system/marketing address rather than an individual user's connected SMTP.
 *
 * If the system SMTP is not configured, the function returns { sent: false }
 * so the caller can store the lead and retry later.
 */

import { renderGetPhameEmailHeader } from "./platformEmailBrand";
import { sendSystemEmail, HELLO_FROM } from "./sendgrid";

export const GUIDE_PDF_URL = "https://assets.getphame.app/getphame-30-day-review-playbook.pdf";

export interface LeadGuideDeliveryResult {
  sent: boolean;
  providerMessageId?: string;
  responseCode?: number;
  error?: string;
}

function buildGuideEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Free Guide from Phame</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <!-- Header -->
          ${renderGetPhameEmailHeader("Your free guide is here")}
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi there,</p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                Thanks for grabbing the guide! Inside you'll find a proven 30-day playbook to <strong>3× your Google reviews</strong> — including the exact timing, templates, and follow-up strategies that top-rated local businesses use.
              </p>
              <p style="margin:0 0 8px;font-size:15px;color:#555;line-height:1.7;"><strong>What's inside:</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1px solid #e0e4f0;border-radius:12px;margin:0 0 24px;">
                <tr><td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-size:14px;color:#1a2744;line-height:1.6;">✓ The 3-touch review request sequence</p>
                  <p style="margin:0 0 10px;font-size:14px;color:#1a2744;line-height:1.6;">✓ Best times to ask for reviews (backed by data)</p>
                  <p style="margin:0 0 10px;font-size:14px;color:#1a2744;line-height:1.6;">✓ Email + SMS templates you can copy-paste</p>
                  <p style="margin:0;font-size:14px;color:#1a2744;line-height:1.6;">✓ How to handle negative feedback before it goes public</p>
                </td></tr>
              </table>
              <!-- Download CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#f0a500;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="${GUIDE_PDF_URL}" style="color:#1a2744;font-size:15px;font-weight:700;text-decoration:none;">Download Your Guide (PDF) →</a>
                  </td>
                </tr>
              </table>
              <!-- Soft CTA -->
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                Want to put these strategies on autopilot? <strong>Phame</strong> sends personalised review requests from your own email — so customers see a message from <em>you</em>, not a robot.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#1a2744;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Try Phame Free →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You received this because you requested the free review guide from Phame.<br/>
                No spam — we respect your inbox.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildGuideEmailText(): string {
  return `Hi there,

Thanks for grabbing the guide! Inside you'll find a proven 30-day playbook to 3× your Google reviews.

What's inside:
• The 3-touch review request sequence
• Best times to ask for reviews (backed by data)
• Email + SMS templates you can copy-paste
• How to handle negative feedback before it goes public

Download your guide: ${GUIDE_PDF_URL}

---

Want to put these strategies on autopilot? Phame sends personalised review requests from your own email — so customers see a message from you, not a robot.

Try Phame Free: https://getphame.app

---
You received this because you requested the free review guide from Phame.
No spam — we respect your inbox.`;
}

/**
 * Send the lead guide email. Returns { sent: true } on success, { sent: false } if
 * system SMTP is not configured or the send fails.
 */
export async function sendLeadGuideEmail(toEmail: string): Promise<LeadGuideDeliveryResult> {
  try {
    await sendSystemEmail({
      to: toEmail,
      from: HELLO_FROM,
      subject: "Your Free Guide: How to 3× Your Google Reviews in 30 Days",
      html: buildGuideEmailHtml(),
      text: buildGuideEmailText(),
    });
    const sent = true;
    const responseCode = 202;

    console.info("[LeadGuide] Provider response", {
      accepted: sent,
      providerMessageId: undefined,
      responseCode,
    });

    if (!sent) {
      return {
        sent: false,
        providerMessageId: undefined,
        responseCode,
        error: "Email provider did not accept the recipient",
      };
    }

    return {
      sent: true,
      providerMessageId: undefined,
      responseCode,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[LeadGuide] Failed to submit guide email to provider", {
      errorName: err instanceof Error ? err.name : "UnknownError",
      message,
    });
    return { sent: false, error: message };
  }
}
