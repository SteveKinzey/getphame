import { sendMailViaSmtp, type SendMailOptions } from "./smtp";

/**
 * The only supported transport for a customer's review request or reminder.
 * The downstream SMTP helper resolves an explicit tenant-owned channel and
 * fails closed when none is selected; platform operational email is excluded.
 */
export async function sendTenantOwnedReviewEmail(
  input: Pick<SendMailOptions, "userId" | "to" | "subject" | "html" | "text">
) {
  return sendMailViaSmtp({
    ...input,
    safetyMode: "review_request",
  });
}
