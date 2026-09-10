import type { FreeQuotaSummary } from "@shared/quota";

type Translate = (
  key: string,
  options?: { defaultValue?: string; date?: string }
) => string;

export function FreeQuotaStatus({
  quota,
  t,
  formatDate = timestamp => new Date(timestamp).toLocaleDateString(),
}: {
  quota?: FreeQuotaSummary | null;
  t: Translate;
  formatDate?: (timestamp: number) => string;
}) {
  const isRolling = quota?.phase === "rolling";

  return (
    <div
      data-testid="free-quota-status"
      data-phase={quota?.phase ?? "initial"}
      data-blocked={quota?.blocked ? "true" : "false"}
      className="relative z-10 mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center"
    >
      <p className="text-xs font-black text-white">
        {isRolling
          ? t("homePage.freeAllowanceMonthly", {
              defaultValue: "Free plan: 5 requests every rolling 30 days",
            })
          : t("homePage.freeAllowanceInitial", {
              defaultValue:
                "Free plan: 10 initial requests, then 5 every rolling 30 days",
            })}
      </p>
      {quota?.blocked && quota.nextAvailableAt && (
        <p className="mt-1 text-[11px] font-semibold text-white/70">
          {t("homePage.nextFreeRequest", {
            defaultValue: "Next request available {{date}}",
            date: formatDate(quota.nextAvailableAt),
          })}
        </p>
      )}
    </div>
  );
}
