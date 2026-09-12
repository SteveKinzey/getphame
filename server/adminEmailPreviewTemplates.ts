import { renderGetPhameEmailHeader } from "./platformEmailBrand";

export const ADMIN_EMAIL_PREVIEW_TEMPLATES = [
  "magic-link",
  "welcome",
  "upgrade-receipt-pro",
  "upgrade-receipt-annual",
  "upgrade-receipt-lifetime",
  "account-deletion",
] as const;

export type AdminEmailPreviewTemplate =
  (typeof ADMIN_EMAIL_PREVIEW_TEMPLATES)[number];

export const ADMIN_EMAIL_PREVIEW_LABELS: Record<
  AdminEmailPreviewTemplate,
  string
> = {
  "magic-link": "Magic Link (Sign-in)",
  welcome: "Welcome Email",
  "upgrade-receipt-pro": "Upgrade Receipt — Pro Monthly",
  "upgrade-receipt-annual": "Upgrade Receipt — Pro Annual",
  "upgrade-receipt-lifetime": "Upgrade Receipt — Lifetime",
  "account-deletion": "Account Deletion Confirmation",
};

type PreviewTemplateOptions = {
  template: AdminEmailPreviewTemplate;
  recipientName?: string;
  magicLinkUrl?: string;
};

export function buildAdminEmailPreviewTemplate({
  template,
  recipientName = "Alex",
  magicLinkUrl = "https://getphame.app/login?returnTo=%2Fadmin%2Femail-preview",
}: PreviewTemplateOptions): string {
  const wrapEmail = (
    headTitle: string,
    bodyHtml: string,
    footerHtml: string
  ) => {
    const headerHtml = renderGetPhameEmailHeader(headTitle);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${headTitle}</title><style>@media only screen and (max-width:600px){.email-wrapper{padding:16px 0!important}.email-card{border-radius:0!important;width:100%!important}.email-body{padding:28px 20px!important}.email-footer{padding:16px 20px!important}.cta-btn{padding:16px 24px!important;font-size:15px!important}}</style></head><body style="margin:0;padding:0;background:#eef0f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="email-wrapper" style="background:#eef0f4;padding:40px 0;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" role="presentation" class="email-card" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);max-width:560px;width:100%;">${headerHtml}<tr><td class="email-body" style="padding:40px 40px 32px;">${bodyHtml}</td></tr><tr><td class="email-footer" style="background:#f8f9fb;padding:20px 40px;text-align:center;border-top:1px solid #e8ecf0;">${footerHtml}</td></tr></table></td></tr></table></body></html>`;
  };
  const goldCta = (href: string, label: string) =>
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 8px;"><tr><td style="background:#C9A84C;border-radius:12px;padding:16px 40px;mso-padding-alt:0;"><a href="${href}" class="cta-btn" style="color:#0F1B2D;font-size:16px;font-weight:800;text-decoration:none;display:inline-block;">${label}</a></td></tr></table>`;
  const footer = (extra = "") =>
    `<p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">Get Phame · <a href="https://getphame.app" style="color:#888;text-decoration:none;">getphame.app</a>${extra}</p>`;

  if (template === "magic-link") {
    const body = `<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F1B2D;">Magic Link Preview</p><p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">This preview opens the standard Get Phame sign-in page. Real magic links are generated only for a sign-in request and expire after 15 minutes.</p><table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px;"><tr><td style="background:#C9A84C;border-radius:12px;padding:18px 48px;mso-padding-alt:0;"><a href="${magicLinkUrl}" class="cta-btn" style="color:#0F1B2D;font-size:17px;font-weight:800;text-decoration:none;display:inline-block;">Open Get Phame sign-in</a></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff8e6;border:1px solid #e8d08a;border-radius:10px;margin:0 0 20px;"><tr><td style="padding:14px 18px;"><p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#7a5c00;text-transform:uppercase;letter-spacing:.8px;">Security notice</p><p style="margin:0;font-size:13px;color:#6b5200;line-height:1.5;">Live magic links are single-use and are delivered only when a sign-in is requested.</p></td></tr></table>`;
    return wrapEmail(
      "Your secure sign-in link",
      body,
      footer(
        "<br/>You received this because a sign-in was requested for this email address."
      )
    );
  }

  if (template === "welcome") {
    const steps: [string, string][] = [
      ["Connect your email account in Settings", "1"],
      ["Add your Google review link", "2"],
      ["Send your first review request — under 30 seconds", "3"],
    ];
    const stepsHtml = steps
      .map(
        ([text, number]) =>
          `<p style="margin:0 0 12px;font-size:14px;color:#1a2744;line-height:1.6;"><span style="display:inline-block;background:#C9A84C;color:#0F1B2D;font-weight:800;font-size:12px;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;margin-right:8px;">${number}</span>${text}</p>`
      )
      .join("");
    const body = `<p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0F1B2D;">Hi ${recipientName},</p><p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">Welcome to Get Phame! You're now set up to send personalised review request emails directly from your own email account.</p><p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#0F1B2D;text-transform:uppercase;letter-spacing:.8px;">Get started in 3 steps</p><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6ff;border:1px solid #dde3f5;border-radius:12px;margin:0 0 28px;"><tr><td style="padding:20px 24px;">${stepsHtml}</td></tr></table>${goldCta("https://getphame.app", "Get Started →")}`;
    return wrapEmail(
      "Welcome aboard",
      body,
      footer(
        "<br/><a href='https://getphame.app/settings' style='color:#888;text-decoration:none;'>Manage your settings</a>"
      )
    );
  }

  const tiers: Record<string, { label: string; perks: string[] }> = {
    "upgrade-receipt-pro": {
      label: "Pro Monthly",
      perks: [
        "Unlimited review requests",
        "Automated follow-up reminders",
        "Priority support",
      ],
    },
    "upgrade-receipt-annual": {
      label: "Pro Annual",
      perks: [
        "Everything in Pro Monthly",
        "2 months free vs monthly billing",
        "Priority support",
      ],
    },
    "upgrade-receipt-lifetime": {
      label: "Lifetime",
      perks: [
        "Everything in Pro Annual",
        "Never pay again — one-time fee",
        "Lifetime updates included",
      ],
    },
  };
  if (template in tiers) {
    const { label, perks } = tiers[template]!;
    const perksHtml = perks
      .map(
        perk =>
          `<li style="margin:0 0 10px;font-size:14px;color:#1a2744;line-height:1.6;"><span style="display:inline-block;background:#C9A84C;color:#0F1B2D;font-weight:800;font-size:11px;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;margin-right:8px;">✓</span>${perk}</li>`
      )
      .join("");
    const body = `<p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0F1B2D;">Hi ${recipientName},</p><p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7;">Your Get Phame account has been upgraded to <strong style="color:#0F1B2D;">${label}</strong>. Here's what you now have access to:</p><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6ff;border:1px solid #dde3f5;border-radius:12px;margin:0 0 28px;"><tr><td style="padding:20px 24px;"><ul style="margin:0;padding:0;list-style:none;">${perksHtml}</ul></td></tr></table>${goldCta("https://getphame.app/send", "Start Sending Reviews →")}`;
    return wrapEmail(
      `You're on ${label}!`,
      body,
      footer(
        "<br/>Questions? Reply to this email or visit <a href='https://getphame.app/settings' style='color:#888;text-decoration:none;'>your settings</a>."
      )
    );
  }

  const body = `<p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0F1B2D;">Hi ${recipientName},</p><p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">Your Get Phame account and all associated data have been permanently deleted as requested.</p><p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">If you change your mind, you're always welcome to create a new account at <a href="https://getphame.app" style="color:#C9A84C;">getphame.app</a>.</p>`;
  return wrapEmail("Your account has been deleted", body, footer());
}
