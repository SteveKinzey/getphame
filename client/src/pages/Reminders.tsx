/**
 * Reminders — view and manage scheduled 3-day follow-up reminder emails.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Bell, ChevronLeft, Clock, CheckCircle2, XCircle, Ban, SendHorizonal, Eye, X, Crown, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import PaywallModal from "@/components/PaywallModal";

type Reminder = {
  id: number;
  customerName: string;
  customerEmail: string;
  scheduledAt: number;
  sentAt: number | null;
  status: string;
  sequenceStep?: number;
};

export default function Reminders() {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [cancelTarget, setCancelTarget] = useState<Reminder | null>(null);
  const [sendNowTarget, setSendNowTarget] = useState<Reminder | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkCancelling, setBulkCancelling] = useState(false);
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const isFree = !profile?.tier || profile.tier === "free";
  const { data: reminders = [], isLoading } = trpc.reminders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const cancelMutation = trpc.reminders.cancel.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      setCancelTarget(null);
      toast.success(t("toastMessages.reminderCancelled"));
    },
    onError: (e) => toast.error(e.message),
  });

  const sendNowMutation = trpc.reminders.sendNow.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      setSendNowTarget(null);
      toast.success(t("toastMessages.followUpReminderSent"));
    },
    onError: (e) => {
      setSendNowTarget(null);
      if (e.message.includes("10003")) { setPaywallOpen(true); return; }
      toast.error(e.message);
    },
  });

  const { data: previewData, isLoading: previewLoading } = trpc.reminders.previewEmail.useQuery(
    { step: previewStep ?? 1 },
    { enabled: previewStep !== null && isAuthenticated }
  );

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const pending = (reminders as Reminder[]).filter((r) => r.status === "pending");
  const history = (reminders as Reminder[]).filter((r) => r.status !== "pending");

  const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pending: {
      label: t("reminderRow.status.pending"),
      icon: <Clock size={13} />,
      color: "text-blue-600 bg-blue-50",
    },
    sent: {
      label: t("reminderRow.status.sent"),
      icon: <CheckCircle2 size={13} />,
      color: "text-green-600 bg-green-50",
    },
    cancelled: {
      label: t("reminderRow.status.cancelled"),
      icon: <Ban size={13} />,
      color: "text-gray-500 bg-gray-100",
    },
    failed: {
      label: t("reminderRow.status.failed"),
      icon: <XCircle size={13} />,
      color: "text-red-600 bg-red-50",
    },
  };

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mb-4 text-base font-bold rr-text-gold transition-opacity"
        >
          <ChevronLeft size={16} /> {t("header.back")}
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Follow-up Reminders
            </h1>
            {isFree && (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}>
                <Crown size={9} /> PRO
              </span>
            )}
          </div>
          <p className="text-base font-bold mt-1 text-white">
            {t("header.subtitle")}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm font-bold text-blue-900">
          <strong>{t("infoBanner.howItWorks")}</strong> {t("infoBanner.description")}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => setPreviewStep(1)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-black transition-colors rr-bg-navy rr-text-gold"
            >
              <Eye size={11} /> {t("infoBanner.preview1stFollowUp")}
            </button>
            <button
              onClick={() => setPreviewStep(2)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-black transition-colors rr-bg-navy rr-text-gold"
            >
              <Eye size={11} /> {t("infoBanner.preview2ndFollowUp")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">{t("emptyState.loading")}</div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">{t("emptyState.noRemindersYet")}</p>
            <p className="text-gray-400 text-sm mt-1">{t("emptyState.remindersCreatedAutomatically")}</p>
          </div>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                    {t("sections.scheduled", { count: pending.length })}
                  </h2>
                  {pending.length > 1 && (
                    <button
                      onClick={() => setBulkCancelOpen(true)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      {t("sections.cancelAll")}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {pending.map((r) => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      statusConfig={STATUS_CONFIG}
                      onCancel={() => setCancelTarget(r)}
                      onSendNow={() => setSendNowTarget(r)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {t("sections.history", { count: history.length })}
                </h2>
                <div className="space-y-2">
                  {history.map((r) => (
                    <ReminderRow key={r.id} reminder={r} statusConfig={STATUS_CONFIG} t={t} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Send Now Confirm */}
      <AlertDialog open={!!sendNowTarget} onOpenChange={(o) => { if (!o) setSendNowTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sendNowConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sendNowConfirm.description", { customerName: sendNowTarget?.customerName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sendNowConfirm.notYet")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendNowTarget && sendNowMutation.mutate({ id: sendNowTarget.id })}
              className="rr-bg-navy rr-text-gold"
            >
              {t("sendNowConfirm.sendNow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Cancel All Confirm */}
      <AlertDialog open={bulkCancelOpen} onOpenChange={(o) => { if (!o && !bulkCancelling) setBulkCancelOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulkCancelConfirm.title", { count: pending.length })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bulkCancelConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkCancelling}>{t("bulkCancelConfirm.keepThem")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async (e) => {
                e.preventDefault();
                setBulkCancelling(true);
                try {
                  for (const r of pending) {
                    await cancelMutation.mutateAsync({ id: r.id });
                  }
                  utils.reminders.list.invalidate();
                  toast.success(t("bulkCancelConfirm.successMessage", { count: pending.length, plural: pending.length !== 1 ? 's' : '' }));
                } catch {
                  toast.error(t("bulkCancelConfirm.errorMessage"));
                } finally {
                  setBulkCancelling(false);
                  setBulkCancelOpen(false);
                }
              }}
            >
              {bulkCancelling ? t("bulkCancelConfirm.cancelling") : t("bulkCancelConfirm.cancelAll", { count: pending.length })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Preview Modal */}
      {previewStep !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setPreviewStep(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl overflow-hidden bg-white" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 rr-bg-navy" style={{ borderBottom: "1px solid oklch(0.30 0.08 260)" }}>
              <div>
                <p className="text-sm font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {previewStep === 2 ? t("reminderRow.2ndFollowUp") : t("reminderRow.1stFollowUp")} Preview
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "oklch(0.85 0.04 260)" }}>
                  Subject: {previewStep === 2 ? "One last nudge — we'd love your review!" : "Just checking in — have you had a chance to leave us a review?"}
                </p>
              </div>
              <button onClick={() => setPreviewStep(null)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                <X size={18} className="rr-text-gold" />
              </button>
            </div>
            {/* Email body */}
            <div className="flex-1 overflow-y-auto p-4">
              {previewLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">{t("emptyState.loading")}</div>
              ) : (
                <div
                  className="text-sm text-gray-700 leading-relaxed"
                  style={{ fontFamily: "Arial, sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: previewData?.html ?? "" }}
                />
              )}
            </div>
            {/* Step switcher */}
            <div className="flex gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid oklch(0.93 0.02 260)" }}>
              <button
                onClick={() => setPreviewStep(1)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ background: previewStep === 1 ? "oklch(0.22 0.09 260)" : "oklch(0.95 0.01 260)", color: previewStep === 1 ? "oklch(0.80 0.18 80)" : "oklch(0.40 0.04 260)" }}
              >
                {t("reminderRow.1stFollowUp")}
              </button>
              <button
                onClick={() => setPreviewStep(2)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ background: previewStep === 2 ? "oklch(0.22 0.09 260)" : "oklch(0.95 0.01 260)", color: previewStep === 2 ? "oklch(0.80 0.18 80)" : "oklch(0.40 0.04 260)" }}
              >
                {t("reminderRow.2ndFollowUp")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelConfirm.description", { customerName: cancelTarget?.customerName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelConfirm.keepIt")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("cancelConfirm.cancelReminder")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature="Follow-up Reminders" />
    </div>
  );
}

function ReminderRow({
  reminder,
  statusConfig,
  onCancel,
  onSendNow,
  t,
}: {
  reminder: Reminder;
  statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }>;
  onCancel?: () => void;
  onSendNow?: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const cfg = statusConfig[reminder.status] ?? statusConfig.pending;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-gray-900 truncate">{reminder.customerName}</p>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: (reminder.sequenceStep ?? 1) === 2 ? 'oklch(0.93 0.08 80)' : 'oklch(0.93 0.06 260)', color: (reminder.sequenceStep ?? 1) === 2 ? 'oklch(0.45 0.12 80)' : 'oklch(0.35 0.08 260)' }}>
              {(reminder.sequenceStep ?? 1) === 2 ? t("reminderRow.2ndFollowUp") : t("reminderRow.1stFollowUp")}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{reminder.customerEmail}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-xs text-gray-400">
              {reminder.status === "sent" && reminder.sentAt
                ? t("reminderRow.sentAt", { date: format(new Date(reminder.sentAt), "MMM d, yyyy") })
                : t("reminderRow.scheduledAt", { date: format(new Date(reminder.scheduledAt), "MMM d, yyyy") })}
            </span>
          </div>
        </div>
        {reminder.status === "pending" && (
          <div className="flex flex-col gap-1.5 shrink-0">
            {onSendNow && (
              <Button
                size="sm"
                onClick={onSendNow}
                className="text-xs h-7 px-2.5 gap-1 rr-bg-navy rr-text-gold"
              >
                <SendHorizonal size={11} />
                {t("reminderRow.sendNow")}
              </Button>
            )}
            {onCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                className="text-xs h-7 px-2.5 text-red-500 border-red-200 hover:bg-red-50"
              >
                {t("reminderRow.cancel")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
