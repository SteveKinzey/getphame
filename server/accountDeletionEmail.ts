/**
 * Sends a data-deletion confirmation email to the user after their account is deleted.
 * Uses the system SMTP (SYSTEM_SMTP_* env vars) so it works even though the user's
 * own SMTP credentials have already been wiped.
 *
 * If system SMTP is not configured the function returns { sent: false } — non-fatal.
 */
import { renderGetPhameEmailHeader } from "./platformEmailBrand";
import { sendSystemEmail, NOREPLY_FROM } from "./sendgrid";

function buildDeletionEmailHtml(name: string): string {
  const firstName = name?.split(" ")[0] ?? "there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your GetPhame Account Has Been Deleted</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          ${renderGetPhameEmailHeader()}
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f1f3d;">
                Your account has been deleted
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
                We've permanently deleted your GetPhame account and all associated data as requested. This includes:
              </p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#4a5568;line-height:2;">
                <li>Your account profile and login credentials</li>
                <li>All saved contacts and customer records</li>
                <li>All review request history and email tracking data</li>
                <li>Your connected email (SMTP) credentials</li>
                <li>All email templates and review platform links</li>
                <li>Any subscription or billing records</li>
              </ul>
              <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
                <strong>No further data is retained.</strong> We do not sell your data and never have.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.6;">
                If you deleted your account by mistake or have questions, please email us at
                <a href="mailto:support@getphame.app" style="color:#0f1f3d;font-weight:700;">support@getphame.app</a>
                within 7 days — after that, recovery is not possible.
              </p>
              <p style="margin:0;font-size:14px;color:#718096;">
                Thank you for using GetPhame.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fb;padding:24px 40px;border-top:1px solid #e8ecf0;">
              <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;line-height:1.6;">
                GetPhame · <a href="https://getphame.app/privacy-policy" style="color:#a0aec0;">Privacy Policy</a> · <a href="https://getphame.app/data-usage" style="color:#a0aec0;">Data Usage</a>
                <br />This email was sent because you requested account deletion.
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

export async function sendAccountDeletionEmail(
  toEmail: string,
  name: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    await sendSystemEmail({
      to: toEmail,
      subject: "Your GetPhame account has been deleted",
      html: buildDeletionEmailHtml(name),
      text: `Hi ${name?.split(" ")[0] ?? "there"},\n\nYour GetPhame account and all associated data has been permanently deleted as requested.\n\nIf you have questions, contact support@getphame.app.\n\nGetPhame`,
      from: NOREPLY_FROM,
    });
    return { sent: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[AccountDeletion] Failed to send confirmation email:",
      message
    );
    return { sent: false, error: message };
  }
}
