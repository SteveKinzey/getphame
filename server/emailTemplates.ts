/**
 * Shared email HTML builder for all outbound review request emails.
 * Produces a consistent branded layout: navy header + white body + gold CTA.
 *
 * Design tokens (match app exactly):
 *   Navy  #1a2744  (oklch 0.22 0.09 260)
 *   Gold  #f0a500  (oklch 0.80 0.18 80)
 */

export interface ReviewEmailOptions {
  /** Customer's first name or full name */
  customerName: string;
  /** Business name shown in body copy and footer */
  businessName: string;
  /** Full review URL the CTA button points to */
  reviewUrl: string;
  /** Optional body paragraph(s) — overrides the default copy */
  bodyHtml?: string;
  /** Optional subject override (not used in HTML, just exported for convenience) */
  subject?: string;
  /** Optional product name for WooCommerce purchase context */
  productName?: string | null;
  /** Optional signed unsubscribe URL — if provided, renders a real clickable link in the footer */
  unsubscribeUrl?: string;
}

const NAVY = "#1a2744";
const GOLD = "#f0a500";

/** Shared branded email wrapper — navy header, white body, gold CTA, CAN-SPAM footer */
export function buildReviewRequestEmail(opts: ReviewEmailOptions): string {
  const { customerName, businessName, reviewUrl, bodyHtml, productName, unsubscribeUrl } = opts;

  const defaultBody = productName
    ? `<p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">
        Thank you for your recent purchase of <strong>${productName}</strong>. We hope you love it!
      </p>
      <p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">
        Could you take 30 seconds to leave us a quick review? It helps other customers find us and means the world to our team.
      </p>`
    : `<p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">
        Thank you for choosing <strong>${businessName}</strong>. We hope you had a great experience!
      </p>
      <p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">
        Could you take 30 seconds to leave us a quick review? It helps other customers find us and means the world to our team.
      </p>`;

  const body = bodyHtml ?? defaultBody;

  const footerText = unsubscribeUrl
    ? `You received this email because you are a customer of ${businessName}.<br/>
       <a href="${unsubscribeUrl}" style="color:#aaa;text-decoration:underline;">Unsubscribe</a> to stop receiving these emails.`
    : `You received this email because you are a customer of ${businessName}.<br/>
       To stop receiving these emails, reply with &quot;unsubscribe&quot;.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We'd love your feedback!</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${NAVY};padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${GOLD};">ReviewLink</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">We'd love your feedback! ⭐</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${customerName}!</p>
              ${body}

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
                <tr>
                  <td style="background:${GOLD};border-radius:10px;padding:14px 36px;text-align:center;">
                    <a href="${reviewUrl}" style="color:${NAVY};font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.3px;">⭐ Leave a Review</a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;color:#666;line-height:1.6;">
                Thank you so much!<br/>
                <strong>The ${businessName} team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9ff;padding:18px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
                ${footerText}
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

/** Convenience: build the plain-text fallback for the same email */
export function buildReviewRequestText(opts: ReviewEmailOptions): string {
  const { customerName, businessName, reviewUrl, productName, unsubscribeUrl } = opts;
  const context = productName
    ? `Thank you for your recent purchase of ${productName}. We hope you love it!`
    : `Thank you for choosing ${businessName}. We hope you had a great experience!`;
  const unsubLine = unsubscribeUrl
    ? `To unsubscribe: ${unsubscribeUrl}`
    : `To unsubscribe, reply with "unsubscribe".`;
  return `Hi ${customerName}!\n\n${context}\n\nCould you take 30 seconds to leave us a quick review?\n\n${reviewUrl}\n\nThank you so much!\nThe ${businessName} team\n\n---\nYou received this email because you are a customer of ${businessName}. ${unsubLine}`;
}
