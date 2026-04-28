// ClientDetailSheet — bottom sheet shown when tapping a client name in the Dashboard activity log
// Shows: sent email subject + body (editable), Update Reminder Email button, Restart Campaign button

import { useState, useEffect } from "react";
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Mail, Pencil, RefreshCw, Send, Loader2, RotateCcw, ChevronDown, ChevronUp, Bell, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

interface ClientDetailSheetProps {
  requestId: number | null;
  onClose: () => void;
}

export default function ClientDetailSheet({ requestId, onClose }: ClientDetailSheetProps) {
  const isOpen = requestId !== null;
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  const { data: request, isLoading } = trpc.requests.getById.useQuery(
    { id: requestId! },
    { enabled: requestId !== null }
  );

  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (request) {
      setEditSubject(request.emailSubject ?? "");
      setEditBody(request.emailBody ?? "");
      setIsEditing(false);
      setShowPreview(true);
    }
  }, [request]);

  const updateEmailMutation = trpc.requests.updateEmail.useMutation({
    onSuccess: () => {
      toast.success("Email updated — will be used for future reminders");
      setIsEditing(false);
      utils.requests.getById.invalidate({ id: requestId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const resendMutation = trpc.requests.resend.useMutation({
    onSuccess: (_, vars) => {
      if (vars.restart) {
        toast.success("Campaign restarted — email sent and reminders reset");
      } else {
        toast.success("Email resent successfully");
      }
      utils.requests.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: reminders } = trpc.reminders.listForRequest.useQuery(
    { requestId: requestId! },
    { enabled: requestId !== null }
  );

  const hasEmail = !!(request?.emailSubject || request?.emailBody);
  const isDirty = editSubject !== (request?.emailSubject ?? "") || editBody !== (request?.emailBody ?? "");

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          background: "oklch(0.975 0.003 100)",
          maxHeight: "90dvh",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "oklch(0.82 0.02 260)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid oklch(0.92 0.02 260)" }}>
          <div className="flex items-center gap-2">
            <Mail size={16} className="rr-text-navy" />
            <div>
              {isLoading ? (
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
              ) : (
                <p className="text-sm font-black rr-text-navy leading-tight">{request?.customerName}</p>
              )}
              {request?.customerEmail && (
                <p className="text-xs rr-text-navy-muted">{request.customerEmail}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rr-text-navy-muted hover:rr-text-navy">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
              <div className="h-32 w-full rounded bg-gray-200 animate-pulse" />
            </div>
          ) : !hasEmail ? (
            <div className="rounded-xl p-4 text-center" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}>
              <p className="text-sm rr-text-navy-muted">No email content stored for this request.</p>
              <p className="text-xs rr-text-navy-muted mt-1">Only requests sent after this update will have stored email content.</p>
            </div>
          ) : (
            <>
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Subject</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ border: "2px solid oklch(0.80 0.18 80)", fontSize: "14px" }}
                  />
                ) : (
                  <p className="text-sm rr-text-navy px-3 py-2 rounded-xl" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}>
                    {editSubject || <span className="rr-text-navy-muted italic">No subject</span>}
                  </p>
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold rr-text-navy-mid">Email Body</label>
                  {!isEditing && (
                    <button
                      onClick={() => setShowPreview((v) => !v)}
                      className="flex items-center gap-0.5 text-xs rr-text-navy-muted"
                    >
                      {showPreview ? <><ChevronUp size={12} /> Hide preview</> : <><ChevronDown size={12} /> Show preview</>}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none font-mono"
                    style={{ border: "2px solid oklch(0.80 0.18 80)", fontSize: "12px" }}
                    placeholder="HTML email body..."
                  />
                ) : showPreview ? (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid oklch(0.90 0.02 260)", maxHeight: "260px", overflowY: "auto" }}
                  >
                    <iframe
                      srcDoc={editBody}
                      title="Email preview"
                      className="w-full"
                      style={{ height: "260px", border: "none" }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : null}
              </div>

              {/* Campaign Timeline */}
              {!isEditing && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}>
                  <p className="text-xs font-black rr-text-navy uppercase tracking-wider">Campaign Timeline</p>

                  {/* Initial send */}
                  {request?.sentAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} style={{ color: "oklch(0.55 0.15 145)", flexShrink: 0 }} />
                      <span className="text-xs rr-text-navy">
                        Email sent — {format(new Date(request.sentAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  )}

                  {/* Reminders */}
                  {reminders && reminders.length > 0 ? (
                    reminders.map((r, i) => {
                      const icon = r.status === "sent"
                        ? <CheckCircle2 size={13} style={{ color: "oklch(0.55 0.15 145)", flexShrink: 0 }} />
                        : r.status === "cancelled"
                        ? <XCircle size={13} style={{ color: "oklch(0.60 0.08 30)", flexShrink: 0 }} />
                        : <Clock size={13} style={{ color: "oklch(0.65 0.14 80)", flexShrink: 0 }} />;
                      const label = r.status === "sent" ? "Sent" : r.status === "cancelled" ? "Cancelled" : "Scheduled";
                      return (
                        <div key={r.id} className="flex items-center gap-2">
                          {icon}
                          <span className="text-xs rr-text-navy">
                            <Bell size={11} className="inline mr-1 opacity-60" />
                            Reminder {i + 1} — {format(new Date(r.scheduledAt), "MMM d, h:mm a")}
                            <span className="ml-1 opacity-60">({label})</span>
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs rr-text-navy-muted">No reminders scheduled.</p>
                  )}
                </div>
              )}

              {/* Edit toggle */}
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl w-full justify-center"
                  style={{ background: "oklch(0.97 0.01 260)", border: "1.5px solid oklch(0.88 0.03 260)", color: "oklch(0.35 0.06 260)" }}
                >
                  <Pencil size={14} />
                  Edit Email
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditSubject(request?.emailSubject ?? ""); setEditBody(request?.emailBody ?? ""); setIsEditing(false); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold border rr-text-navy-mid"
                    style={{ border: "1.5px solid oklch(0.88 0.03 260)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateEmailMutation.mutate({ id: requestId!, emailSubject: editSubject, emailBody: editBody })}
                    disabled={updateEmailMutation.isPending || !isDirty}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold rr-bg-navy rr-text-gold"
                  >
                    {updateEmailMutation.isPending ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    Save Changes
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {hasEmail && !isEditing && (
          <div className="px-5 pb-6 pt-3 shrink-0 space-y-2" style={{ borderTop: "1px solid oklch(0.92 0.02 260)" }}>
            <p className="text-xs rr-text-navy-muted text-center mb-2">
              Changes to the email above will be used in reminder sends.
            </p>
            <button
              onClick={() => resendMutation.mutate({ id: requestId!, emailSubject: editSubject, emailBody: editBody, restart: false })}
              disabled={resendMutation.isPending}
              className="flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-xl w-full justify-center rr-bg-gold rr-text-navy"
            >
              {resendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Resend This Email
            </button>
            <button
              onClick={() => setRestartConfirmOpen(true)}
              disabled={resendMutation.isPending}
              className="flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-xl w-full justify-center"
              style={{ background: "oklch(0.97 0.02 30)", border: "1.5px solid oklch(0.85 0.08 30)", color: "oklch(0.40 0.14 30)" }}
            >
              {resendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Restart Campaign
            </button>

            {/* Restart Campaign confirmation modal */}
            <AlertDialog open={restartConfirmOpen} onOpenChange={setRestartConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restart campaign for {request?.customerName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cancels any pending reminders and sends a fresh review request email. The campaign clock resets to today.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setRestartConfirmOpen(false);
                      resendMutation.mutate({ id: requestId!, emailSubject: editSubject, emailBody: editBody, restart: true });
                    }}
                  >
                    Yes, restart
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </>
  );
}
