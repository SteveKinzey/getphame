import {
  getPersonalMailDeliveryState,
  type PersonalMailDeliveryState,
} from "@/lib/mailDeliveryStatus";
import {
  MailDeliveryStateNotice,
  type MailDeliveryNoticeState,
} from "./MailDeliveryStateNotice";

type Translate = (key: string, options: { defaultValue: string }) => string;

type PersonalConnectionStatus = {
  verified?: boolean | null;
  lastHealthStatus?: string | null;
  selectedForOutreach?: boolean | null;
  activeDeliveryChannel?: string | null;
};

type BulkConnectionStatus = {
  legacyPlatformConnection?: boolean | null;
  selectedForOutreach?: boolean | null;
};

const personalTranslationKeys: Record<PersonalMailDeliveryState, string> = {
  needs_attention: "smtp.deliveryStatus.needsAttention",
  active: "smtp.deliveryStatus.active",
  bulk_active: "smtp.deliveryStatus.bulkActive",
  not_selected: "smtp.deliveryStatus.notSelected",
};

export function SettingsPersonalMailConnectionStatus({
  status,
  translate,
}: {
  status: PersonalConnectionStatus;
  translate: Translate;
}) {
  const state = getPersonalMailDeliveryState(status);
  return (
    <MailDeliveryStateNotice
      state={state}
      translate={(defaultValue) => translate(personalTranslationKeys[state], { defaultValue })}
    />
  );
}

export function SettingsBulkMailConnectionStatus({
  status,
  translate,
}: {
  status: BulkConnectionStatus;
  translate: Translate;
}) {
  const state: MailDeliveryNoticeState = status.legacyPlatformConnection
    ? "legacy_blocked"
    : status.selectedForOutreach
    ? "active"
    : "not_selected";
  const key = state === "legacy_blocked"
    ? "settings.bulkSender.legacyPlatformNotice"
    : state === "active"
    ? "settings.bulkSender.activeOutreach"
    : "settings.bulkSender.notActive";
  return <MailDeliveryStateNotice state={state} translate={(defaultValue) => translate(key, { defaultValue })} />;
}
