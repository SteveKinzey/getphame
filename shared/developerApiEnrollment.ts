export const DEVELOPER_API_TERMS_VERSION = "2026-07-22";
export const DEVELOPER_API_ACCEPTABLE_USE_VERSION = "2026-07-22";
export const DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY = 5_000;

export const DEVELOPER_SEND_SCOPE_STATUSES = [
  "not_requested",
  "pending_review",
  "approved",
  "denied",
] as const;

export type DeveloperSendScopeStatus = (typeof DEVELOPER_SEND_SCOPE_STATUSES)[number];

export function normalizeDeveloperSendScopeStatus(value: string | null | undefined): DeveloperSendScopeStatus {
  return DEVELOPER_SEND_SCOPE_STATUSES.includes(value as DeveloperSendScopeStatus)
    ? value as DeveloperSendScopeStatus
    : "not_requested";
}

export function isCurrentDeveloperApiTermsAcceptance(input: {
  termsVersion: string | null | undefined;
  acceptableUseVersion: string | null | undefined;
  termsAcceptedAt: number | null | undefined;
}) {
  return Boolean(
    input.termsAcceptedAt
      && input.termsVersion === DEVELOPER_API_TERMS_VERSION
      && input.acceptableUseVersion === DEVELOPER_API_ACCEPTABLE_USE_VERSION,
  );
}

export function classifyDeveloperSendScopeRequest(expectedMonthlySendVolume: number) {
  return expectedMonthlySendVolume <= DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY
    ? "standard" as const
    : "high_volume" as const;
}
