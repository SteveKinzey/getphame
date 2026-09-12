import type { PersonalMailDeliveryState } from "@/lib/mailDeliveryStatus";

export type MailDeliveryNoticeState =
  | PersonalMailDeliveryState
  | "legacy_blocked";

const messages: Record<
  MailDeliveryNoticeState,
  { tone: "success" | "warning" | "neutral"; text: string }
> = {
  active: {
    tone: "success",
    text: "Active for customer review requests",
  },
  bulk_active: {
    tone: "neutral",
    text: "Connected, but your bulk-mail service is active for customer review requests",
  },
  not_selected: {
    tone: "neutral",
    text: "Connected, but not selected for customer review requests",
  },
  needs_attention: {
    tone: "warning",
    text: "Needs attention — update your SMTP details and reconnect before sending customer review requests",
  },
  legacy_blocked: {
    tone: "warning",
    text: "A legacy platform mail connection was found, but it cannot be used for customer outreach. Connect a bulk-mail provider account that you own.",
  },
};

const colors = {
  success: "oklch(0.40 0.13 145)",
  warning: "oklch(0.50 0.12 27)",
  neutral: "oklch(0.48 0.09 260)",
} as const;

export function MailDeliveryStateNotice({
  state,
  translate,
}: {
  state: MailDeliveryNoticeState;
  translate?: (defaultValue: string) => string;
}) {
  const message = messages[state];
  return (
    <p
      className="mt-1 text-xs font-semibold"
      data-mail-delivery-state={state}
      style={{ color: colors[message.tone] }}
    >
      {translate ? translate(message.text) : message.text}
    </p>
  );
}
