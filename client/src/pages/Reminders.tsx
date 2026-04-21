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
import { Bell, ChevronLeft, Clock, CheckCircle2, XCircle, Ban, SendHorizonal, Eye, X } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useState } from "react";

type Reminder = {
  id: number;
  customerName: string;
  customerEmail: string;
  scheduledAt: number;
  sentAt: number | null;
  status: string;
  sequenceStep?: number;
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: {
    label: "Scheduled",
    icon: <Clock size={13} />,
    color: "text-blue-600 bg-blue-50",
  },
  sent: {
    label: "Sent",
    icon: <CheckCircle2 size={13} />,
    color: "text-green-600 bg-green-50",
  },
  cancelled: {
    label: "Cancelled",
    icon: <Ban size={13} />,
    color: "text-gray-500 bg-gray-100",
  },
  failed: {
    label: "Failed",
    icon: <XCircle size={13} />,
    color: "text-red-600 bg-red-50",
  },
};

export default function Reminders() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [cancelTarget, setCancelTarget] = useState<Reminder | null>(null);
  const [sendNowTarget, setSendNowTarget] = useState<Reminder | null>(null);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkCancelling, setBulkCancelling] = useState(false);
  const [previewStep, setPreviewStep] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: reminders = [], isLoading } = trpc.reminders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const cancelMutation = trpc.reminders.cancel.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      setCancelTarget(null);
      toast.success("Reminder cancelled.");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendNowMutation = trpc.reminders.sendNow.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      setSendNowTarget(null);
      toast.success("Follow-up reminder sent!");
    },
    onError: (e) => {
      setSendNowTarget(null);
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

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mb-4 text-sm opacity-70 hover:opacity-100 transition-opacity rr-text-gold"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Follow-up Reminders
          </h1>
          <p className="text-sm mt-1 opacity-70 text-white">
            Automatic 3-day follow-up emails for customers who haven't reviewed yet
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          <strong>How it works:</strong> When you send a review request, a follow-up reminder is automatically scheduled for 3 days later. The reminder is sent from your connected email account and uses your business profile. Use <strong>Send Now</strong> to skip the wait.
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => setPreviewStep(1)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors rr-bg-navy rr-text-gold"
            >
              <Eye size={11} /> Preview 1st Follow-up
            </button>
            <button
              onClick={() => setPreviewStep(2)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors rr-bg-navy rr-text-gold"
            >
              <Eye size={11} /> Preview 2nd Follow-up
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No reminders yet</p>
            <p className="text-gray-400 text-sm mt-1">Reminders are created automatically when you send review requests</p>
          </div>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                    Scheduled ({pending.length})
                  </h2>
                  {pending.length > 1 && (
                    <button
                      onClick={() => setBulkCancelOpen(true)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Cancel all
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {pending.map((r) => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      onCancel={() => setCancelTarget(r)}
                      onSendNow={() => setSendNowTarget(r)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                  History ({history.length})
                </h2>
                <div className="space-y-2">
                  {history.map((r) => (
                    <ReminderRow key={r.id} reminder={r} />
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
            <AlertDialogTitle>Send reminder now?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately send the follow-up email to{" "}
              <strong>{sendNowTarget?.customerName}</strong> without waiting for the scheduled date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendNowTarget && sendNowMutation.mutate({ id: sendNowTarget.id })}
              className="rr-bg-navy rr-text-gold"
            >
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Cancel All Confirm */}
      <AlertDialog open={bulkCancelOpen} onOpenChange={(o) => { if (!o && !bulkCancelling) setBulkCancelOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel all {pending.length} reminders?</AlertDialogTitle>
            <AlertDialogDescription>
              All scheduled follow-up reminders will be cancelled and won't be sent. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkCancelling}>Keep them</AlertDialogCancel>
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
                  toast.success(`Cancelled ${pending.length} reminder${pending.length !== 1 ? 's' : ''}.`);
                } catch {
                  toast.error('Some reminders could not be cancelled.');
                } finally {
                  setBulkCancelling(false);
                  setBulkCancelOpen(false);
                }
              }}
            >
              {bulkCancelling ? 'Cancelling…' : `Cancel All ${pending.length}`}
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
                <p className="text-xs font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {previewStep === 2 ? "2nd Follow-up Preview" : "1st Follow-up Preview"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.70 0.04 260)" }}>
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
                <div className="text-center py-8 text-gray-400 text-sm">Loading preview…</div>
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
                1st Follow-up
              </button>
              <button
                onClick={() => setPreviewStep(2)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ background: previewStep === 2 ? "oklch(0.22 0.09 260)" : "oklch(0.95 0.01 260)", color: previewStep === 2 ? "oklch(0.80 0.18 80)" : "oklch(0.40 0.04 260)" }}
              >
                2nd Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              The follow-up reminder for <strong>{cancelTarget?.customerName}</strong> will be cancelled and won't be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Reminder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReminderRow({
  reminder,
  onCancel,
  onSendNow,
}: {
  reminder: Reminder;
  onCancel?: () => void;
  onSendNow?: () => void;
}) {
  const cfg = STATUS_CONFIG[reminder.status] ?? STATUS_CONFIG.pending;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-gray-900 truncate">{reminder.customerName}</p>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: (reminder.sequenceStep ?? 1) === 2 ? 'oklch(0.93 0.08 80)' : 'oklch(0.93 0.06 260)', color: (reminder.sequenceStep ?? 1) === 2 ? 'oklch(0.45 0.12 80)' : 'oklch(0.35 0.08 260)' }}>
              {(reminder.sequenceStep ?? 1) === 2 ? '2nd Follow-up' : '1st Follow-up'}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{reminder.customerEmail}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-xs text-gray-400">
              {reminder.status === "sent" && reminder.sentAt
                ? `Sent ${format(new Date(reminder.sentAt), "MMM d, yyyy")}`
                : `Scheduled ${format(new Date(reminder.scheduledAt), "MMM d, yyyy")}`}
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
                Send Now
              </Button>
            )}
            {onCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                className="text-xs h-7 px-2.5 text-red-500 border-red-200 hover:bg-red-50"
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
