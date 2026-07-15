export const GET_PHAME_EMAIL_LOGO_URL =
  "https://assets.getphame.app/getphame-email-logo.svg";

/**
 * Shared header for Get Phame-owned platform emails.
 *
 * The brand mark is the approved P-star artwork. The GET PHAME wordmark remains
 * live text so it is never replaced with a generated or alternate logo image.
 */
export function renderGetPhameEmailHeader(title?: string): string {
  const titleHtml = title
    ? `<h1 style="margin:18px 0 0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.25;">${title}</h1>`
    : "";

  return `<tr>
    <td style="background:#0F1B2D;padding:28px 40px;text-align:center;">
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;">
            <img src="${GET_PHAME_EMAIL_LOGO_URL}" width="48" height="48" alt="Get Phame logo" style="display:block;width:48px;height:48px;border:0;border-radius:10px;" />
          </td>
          <td style="vertical-align:middle;text-align:left;">
            <span style="font-family:Syne,'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:1.5px;color:#ffffff;white-space:nowrap;">GET <span style="color:#D4A017;">PHAME</span></span>
          </td>
        </tr>
      </table>
      ${titleHtml}
    </td>
  </tr>`;
}
