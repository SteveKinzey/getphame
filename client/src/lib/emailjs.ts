// ReviewRocket — EmailJS Integration
// Uses the official @emailjs/browser SDK (v4) for real email delivery.
// Users configure their own EmailJS credentials in Settings → Email Integration.
//
// Required EmailJS template variables:
//   {{to_name}}       — customer's name
//   {{to_email}}      — customer's email  (set as "To Email" in EmailJS template)
//   {{business_name}} — your business name
//   {{review_link}}   — your Google review URL
//   {{message}}       — the full pre-built message body

import emailjs from '@emailjs/browser';

export interface EmailCredentials {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface SendEmailParams extends EmailCredentials {
  customerName: string;
  customerEmail: string;
  businessName: string;
  reviewLink: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

// ─── Core send function ────────────────────────────────────────────────────────

/**
 * Send a review request email via EmailJS.
 * Initialises the SDK with the user's public key before every call so
 * credentials picked up from Settings are always fresh.
 */
export async function sendReviewEmail(params: SendEmailParams): Promise<SendResult> {
  const { customerName, customerEmail, businessName, reviewLink, serviceId, templateId, publicKey } = params;

  // Guard: all three credentials must be present
  if (!serviceId?.trim() || !templateId?.trim() || !publicKey?.trim()) {
    return {
      success: false,
      error: 'EmailJS is not configured. Open Settings → Email Integration and add your credentials.',
    };
  }

  if (!customerEmail?.trim()) {
    return { success: false, error: 'Customer email address is required.' };
  }

  try {
    // Re-init on every call so credential changes in Settings take effect immediately
    emailjs.init({ publicKey: publicKey.trim() });

    const templateParams = {
      to_name: customerName.trim(),
      to_email: customerEmail.trim(),
      business_name: businessName.trim(),
      review_link: reviewLink.trim(),
      message: buildReviewMessage(customerName.trim(), businessName.trim(), reviewLink.trim()),
    };

    const response = await emailjs.send(serviceId.trim(), templateId.trim(), templateParams);

    if (response.status === 200) {
      return { success: true };
    }
    return { success: false, error: `EmailJS returned status ${response.status}: ${response.text}` };
  } catch (err: any) {
    // EmailJS SDK throws an object with { status, text } on API errors
    const message =
      err?.text ||
      err?.message ||
      (typeof err === 'string' ? err : 'Unknown error while sending email.');
    return { success: false, error: message };
  }
}

// ─── Test-send function ────────────────────────────────────────────────────────

/**
 * Send a test email to the business owner to verify credentials are correct.
 * Uses a simple self-addressed message so the owner can confirm delivery.
 */
export async function sendTestEmail(params: {
  ownerEmail: string;
  businessName: string;
  credentials: EmailCredentials;
}): Promise<SendResult> {
  const { ownerEmail, businessName, credentials } = params;

  if (!credentials.serviceId?.trim() || !credentials.templateId?.trim() || !credentials.publicKey?.trim()) {
    return {
      success: false,
      error: 'Please fill in all three EmailJS fields before sending a test.',
    };
  }

  if (!ownerEmail?.trim()) {
    return { success: false, error: 'Enter your email address to receive the test.' };
  }

  try {
    emailjs.init({ publicKey: credentials.publicKey.trim() });

    const templateParams = {
      to_name: 'Business Owner',
      to_email: ownerEmail.trim(),
      business_name: businessName.trim(),
      review_link: 'https://example.com/review-link-test',
      message: `This is a test email from ReviewRocket. Your EmailJS integration is working correctly! 🚀 When you send a real review request, your customers will receive a message like this with your actual Google Review link.`,
    };

    const response = await emailjs.send(
      credentials.serviceId.trim(),
      credentials.templateId.trim(),
      templateParams,
    );

    if (response.status === 200) {
      return { success: true };
    }
    return { success: false, error: `EmailJS returned status ${response.status}: ${response.text}` };
  } catch (err: any) {
    const message = err?.text || err?.message || (typeof err === 'string' ? err : 'Unknown error.');
    return { success: false, error: message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildReviewMessage(
  customerName: string,
  businessName: string,
  reviewLink: string,
): string {
  return (
    `Hi ${customerName}! Thank you for choosing ${businessName}. ` +
    `We'd love to hear about your experience! Could you take 30 seconds to leave us a quick review? ` +
    `It means the world to us. 👉 ${reviewLink} Thank you so much!`
  );
}

export function isEmailjsConfigured(profile: {
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
} | null): boolean {
  if (!profile) return false;
  return !!(
    profile.emailjsServiceId?.trim() &&
    profile.emailjsTemplateId?.trim() &&
    profile.emailjsPublicKey?.trim()
  );
}

// ─── SMS (demo) ───────────────────────────────────────────────────────────────

/**
 * SMS sending is not yet wired to a real provider.
 * In production, replace this with a Twilio/MessageBird backend call.
 */
export async function sendReviewSMS(params: {
  customerName: string;
  customerPhone: string;
  businessName: string;
  reviewLink: string;
}): Promise<SendResult> {
  const { customerName, customerPhone, businessName, reviewLink } = params;
  const message = buildReviewMessage(customerName, businessName, reviewLink);
  console.log(`[ReviewRocket SMS Demo] To: ${customerPhone}\nMessage: ${message}`);
  await new Promise((r) => setTimeout(r, 800));
  return { success: true };
}
