import { useState } from "react";
import { CalendarDays, Check, Clock, Copy, Loader2, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { openUpgradeModal } from "@/lib/upgradeModal";
import ProBadge from "@/components/ProBadge";

type KoalendarSettingsCardProps = {
  hasPaidAccess: boolean;
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Scheduled", className: "bg-amber-50 text-amber-800" },
  processing: { label: "Importing", className: "bg-blue-50 text-blue-800" },
  imported: { label: "Imported", className: "bg-emerald-50 text-emerald-800" },
  canceled: { label: "Canceled", className: "bg-slate-100 text-slate-600" },
  blocked: { label: "Plan required", className: "bg-orange-50 text-orange-800" },
  failed: { label: "Needs attention", className: "bg-red-50 text-red-800" },
};

function formatDate(value: number | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function KoalendarSettingsCard({ hasPaidAccess }: KoalendarSettingsCardProps) {
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState(false);
  const statusQuery = trpc.koalendar.status.useQuery(undefined, {
    enabled: hasPaidAccess,
    retry: false,
  });

  const refresh = () => utils.koalendar.status.invalidate();
  const connect = trpc.koalendar.connect.useMutation({
    onSuccess: () => { void refresh(); toast.success("Koalendar webhook URL saved successfully."); },
    onError: (error) => toast.error(error.message),
  });
  const rotate = trpc.koalendar.rotateWebhook.useMutation({
    onSuccess: () => { void refresh(); toast.success("Koalendar webhook URL updated successfully."); },
    onError: (error) => toast.error(error.message),
  });
  const disconnect = trpc.koalendar.disconnect.useMutation({
    onSuccess: () => { refresh(); toast.success("Koalendar disconnected."); },
    onError: (error) => toast.error(error.message),
  });

  const status = statusQuery.data;
  const busy = connect.isPending || rotate.isPending || disconnect.isPending;

  const copyWebhook = async () => {
    if (!status?.webhookUrl) return;
    await navigator.clipboard.writeText(status.webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied.");
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm" aria-labelledby="koalendar-heading">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center rr-bg-gold" aria-hidden="true">
            <CalendarDays size={18} className="rr-text-navy" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="koalendar-heading" className="text-base font-black rr-text-navy">Koalendar</h2>
              {!hasPaidAccess && <ProBadge variant="locked" size="sm" />}
            </div>
            <p className="text-xs rr-text-navy-muted">Import completed bookings as contacts after each meeting ends.</p>
          </div>
        </div>
        {status?.connected && status.enabled ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800">
            <Check size={12} aria-hidden="true" /> Connected
          </span>
        ) : null}
      </div>

      {!hasPaidAccess ? (
        <div className="rounded-xl p-4 rr-bg-surface-darker">
          <p className="text-sm font-bold rr-text-navy">Available on paid plans</p>
          <p className="text-xs mt-1 mb-3 rr-text-navy-muted">
            Upgrade to connect Koalendar and automatically add eligible invitees to Saved Contacts.
          </p>
          <button
            type="button"
            onClick={() => openUpgradeModal("koalendar")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black rr-bg-navy rr-text-gold active:scale-[0.97] transition-transform"
          >
            <span>View paid plans</span>
            <ProBadge variant="locked" size="sm" />
          </button>
        </div>
      ) : statusQuery.isLoading ? (
        <div className="flex items-center justify-center py-8" role="status">
          <Loader2 size={20} className="animate-spin rr-text-navy-muted" aria-hidden="true" />
          <span className="sr-only">Loading Koalendar settings</span>
        </div>
      ) : statusQuery.isError ? (
        <div className="rounded-xl p-4 bg-red-50 text-red-800 text-sm">
          Unable to load Koalendar settings. Please refresh and try again.
        </div>
      ) : !status?.connected ? (
        <div className="rounded-xl p-4 rr-bg-surface-darker">
          <p className="text-xs rr-text-navy-muted mb-3">
            Create a private per-account webhook URL, then add it to Koalendar for booking created, rescheduled, and canceled events.
          </p>
          <button
            type="button"
            disabled={connect.isPending}
            onClick={() => connect.mutate()}
            aria-busy={connect.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black rr-bg-navy text-white disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            {connect.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CalendarDays size={15} aria-hidden="true" />}
            <span>{connect.isPending ? "Saving webhook URL…" : "Connect Koalendar"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl p-4 rr-bg-surface-darker">
            <label className="block text-xs font-black rr-text-navy mb-1" htmlFor="koalendar-webhook-url">Your private webhook URL</label>
            <p className="text-[11px] rr-text-navy-muted mb-2">Keep this URL private. Rotating it immediately invalidates the old URL.</p>
            <div className="flex items-stretch gap-2">
              <input
                id="koalendar-webhook-url"
                readOnly
                value={status.webhookUrl ?? ""}
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs font-mono rr-text-navy bg-white"
                aria-label="Koalendar webhook URL"
              />
              <button
                type="button"
                onClick={copyWebhook}
                className="shrink-0 rounded-xl px-3 rr-bg-navy text-white"
                aria-label="Copy Koalendar webhook URL"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <ol className="mt-3 space-y-1 text-xs rr-text-navy-muted list-decimal pl-4">
              <li>Open Koalendar and create a webhook automation.</li>
              <li>Paste this URL and enable created, rescheduled, and canceled events.</li>
              <li>Get Phame imports non-canceled invitees after the scheduled end time.</li>
            </ol>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => rotate.mutate()}
                aria-busy={rotate.isPending}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold rr-text-navy rr-bg-surface disabled:opacity-60"
              >
                {rotate.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
                <span>{rotate.isPending ? "Updating URL…" : "Rotate URL"}</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => disconnect.mutate()}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-800 disabled:opacity-60"
              >
                {disconnect.isPending ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
                Disconnect
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider rr-text-navy-muted">Recent bookings</h3>
              <span className="text-[11px] rr-text-navy-muted">Last event: {formatDate(status.lastEventAt)}</span>
            </div>
            {status.recentBookings.length === 0 ? (
              <div className="rounded-xl px-3 py-4 text-center text-xs rr-bg-surface-darker rr-text-navy-muted">
                No Koalendar events received yet.
              </div>
            ) : (
              <div className="space-y-2">
                {status.recentBookings.map((booking) => {
                  const badge = STATUS_STYLES[booking.status] ?? { label: booking.status, className: "bg-slate-100 text-slate-700" };
                  return (
                    <div key={booking.id} className="rounded-xl p-3 rr-bg-surface-darker">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold rr-text-navy truncate">{booking.inviteeName}</p>
                          <p className="text-xs rr-text-navy-muted truncate">{booking.inviteeEmail}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-[11px] rr-text-navy-muted">
                        <Clock size={11} aria-hidden="true" /> Ends {formatDate(booking.endsAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
