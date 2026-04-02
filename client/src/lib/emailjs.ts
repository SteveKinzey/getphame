// ReviewRocket — EmailJS Integration
// Sends review request emails via EmailJS (no backend needed)
// Users configure their own EmailJS credentials in Settings

export interface SendEmailParams {
  customerName: string;
  customerEmail: string;
  businessName: string;
  reviewLink: string;
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Send a review request email via EmailJS
 * Requires the user to have set up an EmailJS account and configured:
 * - Service ID (from EmailJS dashboard)
 * - Template ID (with variables: to_name, to_email, business_name, review_link)
 * - Public Key (from EmailJS account settings)
 */
export async function sendReviewEmail(params: SendEmailParams): Promise<SendResult> {
  const { customerName, customerEmail, businessName, reviewLink, serviceId, templateId, publicKey } = params;

  if (!serviceId || !templateId || !publicKey) {
    return {
      success: false,
      error: 'EmailJS not configured. Add your EmailJS credentials in Settings.',
    };
  }

  try {
    // Dynamically load EmailJS SDK
    const emailjs = await loadEmailJS();
    emailjs.init(publicKey);

    const templateParams = {
      to_name: customerName,
      to_email: customerEmail,
      business_name: businessName,
      review_link: reviewLink,
      message: buildReviewMessage(customerName, businessName, reviewLink),
    };

    const result = await emailjs.send(serviceId, templateId, templateParams);

    if (result.status === 200) {
      return { success: true };
    } else {
      return { success: false, error: `EmailJS error: ${result.text}` };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send email' };
  }
}

async function loadEmailJS(): Promise<any> {
  if ((window as any).emailjs) return (window as any).emailjs;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => resolve((window as any).emailjs);
    script.onerror = () => reject(new Error('Failed to load EmailJS'));
    document.head.appendChild(script);
  });
}

export function buildReviewMessage(customerName: string, businessName: string, reviewLink: string): string {
  return `Hi ${customerName}! Thank you for choosing ${businessName}. We'd love to hear about your experience! Could you take 30 seconds to leave us a quick review? It means the world to us. 👉 ${reviewLink} Thank you so much!`;
}

/**
 * Simulate SMS sending (in production, integrate Twilio or similar)
 * For demo purposes, this logs the message and returns success
 */
export async function sendReviewSMS(params: {
  customerName: string;
  customerPhone: string;
  businessName: string;
  reviewLink: string;
}): Promise<SendResult> {
  const { customerName, customerPhone, businessName, reviewLink } = params;
  
  // In a real app, you'd call a backend API that uses Twilio/MessageBird
  // For demo: log the message that would be sent
  const message = buildReviewMessage(customerName, businessName, reviewLink);
  console.log(`[ReviewRocket SMS Demo] To: ${customerPhone}\nMessage: ${message}`);
  
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800));
  
  return { success: true };
}
