export type PersonalMailDeliveryState =
  | "needs_attention"
  | "active"
  | "bulk_active"
  | "not_selected";

export function getPersonalMailDeliveryState(status: {
  verified?: boolean | null;
  lastHealthStatus?: string | null;
  selectedForOutreach?: boolean | null;
  activeDeliveryChannel?: string | null;
}): PersonalMailDeliveryState {
  if (!status.verified || status.lastHealthStatus === "failed")
    return "needs_attention";
  if (status.selectedForOutreach) return "active";
  if (status.activeDeliveryChannel === "bulk") return "bulk_active";
  return "not_selected";
}
