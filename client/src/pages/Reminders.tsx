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
import { Bell, ChevronLeft, Clock, CheckCircle2, XCircle, Ban, SendHorizonal } from "lucide-react";
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

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const pending = (reminders as Reminder[]).filter((r) => r.status === "pending");
  const history = (reminders as Reminder[]).filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mb-4 text-sm opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "oklch(0.80 0.18 80)" }}
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
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Scheduled ({pending.length})
                </h2>
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
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              Send Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <p className="font-bold text-gray-900 truncate">{reminder.customerName}</p>
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
                className="text-xs h-7 px-2.5 gap-1"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
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
