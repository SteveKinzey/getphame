import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, Bold, CalendarClock, CheckCircle2, Clock3, Code2, ExternalLink, Flag, Inbox, Italic, List, Loader2, MessageSquareText, Paperclip, RefreshCw, SendHorizontal, StickyNote, Strikethrough, UserRoundCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type SupportStatus = "open" | "in_progress" | "resolved";
type SupportPriority = "low" | "normal" | "high" | "urgent";
type StatusFilter = SupportStatus | "all";
type TopicFilter = "billing" | "onboarding" | "technical" | "all";
type PriorityFilter = SupportPriority | "all";
type AssigneeFilter = "all" | "unassigned" | `${number}`;
type SlaDeadlineFilter = "all" | "overdue" | "next_4_hours" | "next_24_hours";
type TicketSort = "newest" | "oldest" | "priority" | "assignee" | "sla_soonest" | "due_soonest";
type AdminListInput = {
  status?: SupportStatus;
  topic?: Exclude<TopicFilter, "all">;
  priority?: SupportPriority;
  assigneeScope?: "any" | "unassigned" | "specific";
  assigneeUserId?: "unassigned" | number;
  slaWindow?: Exclude<SlaDeadlineFilter, "all">;
  sort?: TicketSort;
};

type SavedQueueView = {
  id: number;
  name: string;
  status: SupportStatus | null;
  topic: Exclude<TopicFilter, "all"> | null;
  priority: SupportPriority | null;
  assigneeScope: "any" | "unassigned" | "specific";
  assigneeUserId: number | null;
  slaWindow: Exclude<SlaDeadlineFilter, "all"> | null;
  sort: TicketSort;
};

const statusLabel: Record<SupportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const topicLabel: Record<Exclude<TopicFilter, "all">, string> = {
  billing: "Billing",
  onboarding: "Onboarding",
  technical: "Technical issue",
};

const priorityLabel: Record<SupportPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function statusStyle(status: SupportStatus) {
  if (status === "resolved") return "bg-emerald-100 text-emerald-900";
  if (status === "in_progress") return "bg-blue-100 text-blue-900";
  return "bg-amber-100 text-amber-950";
}

function priorityStyle(priority: SupportPriority) {
  if (priority === "urgent") return "bg-red-100 text-red-900";
  if (priority === "high") return "bg-orange-100 text-orange-950";
  if (priority === "low") return "bg-slate-100 text-slate-700";
  return "bg-violet-100 text-violet-900";
}

function normalizeStatus(status: string): SupportStatus {
  return status === "in_progress" || status === "resolved" ? status : "open";
}

function normalizeTopic(topic: string): Exclude<TopicFilter, "all"> {
  return topic === "billing" || topic === "onboarding" ? topic : "technical";
}

function normalizePriority(priority: string): SupportPriority {
  return priority === "low" || priority === "high" || priority === "urgent" ? priority : "normal";
}

function formatAssignee(name: string | null, email: string | null) {
  return name?.trim() || email || "Assigned administrator";
}

function toDateTimeLocalValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getSlaState(status: SupportStatus, targetAt: Date | string | null | undefined) {
  if (status === "resolved") {
    return { label: "SLA closed with ticket", tone: "bg-emerald-50 text-emerald-800", icon: CheckCircle2 };
  }
  if (!targetAt) {
    return { label: "SLA target pending", tone: "bg-slate-100 text-slate-700", icon: Clock3 };
  }

  const delta = new Date(targetAt).getTime() - Date.now();
  if (delta <= 0) {
    return { label: `SLA overdue by ${formatDuration(Math.abs(delta))}`, tone: "bg-red-50 text-red-800", icon: AlertTriangle };
  }
  if (delta <= 4 * 60 * 60 * 1000) {
    return { label: `SLA due in ${formatDuration(delta)}`, tone: "bg-amber-50 text-amber-900", icon: AlertTriangle };
  }
  return { label: `SLA due in ${formatDuration(delta)}`, tone: "bg-blue-50 text-blue-900", icon: Clock3 };
}

function TicketDeadlineControls({
  ticketId,
  status,
  dueAt,
  slaTargetAt,
}: {
  ticketId: number;
  status: SupportStatus;
  dueAt: Date | string | null | undefined;
  slaTargetAt: Date | string | null | undefined;
}) {
  const [dueValue, setDueValue] = useState(() => toDateTimeLocalValue(dueAt));
  const utils = trpc.useUtils();
  const updateDueAt = trpc.support.updateDueAt.useMutation({
    onSuccess: () => {
      toast.success("Ticket due date updated.");
      void utils.support.adminList.invalidate();
    },
    onError: (error) => toast.error(error.message || "Unable to update the due date."),
  });
  const sla = getSlaState(status, slaTargetAt);
  const SlaIcon = sla.icon;

  useEffect(() => {
    setDueValue(toDateTimeLocalValue(dueAt));
  }, [dueAt]);

  const saveDueDate = () => {
    if (!dueValue) {
      updateDueAt.mutate({ id: ticketId, dueAt: null });
      return;
    }

    const dueAtDate = new Date(dueValue);
    if (Number.isNaN(dueAtDate.getTime())) {
      toast.error("Choose a valid due date and time.");
      return;
    }
    updateDueAt.mutate({ id: ticketId, dueAt: dueAtDate.toISOString() });
  };

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Ticket deadlines">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">SLA timer</p>
          <div className={`mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-black ${sla.tone}`}>
            <SlaIcon size={14} aria-hidden="true" />
            {sla.label}
          </div>
          <p className="mt-1 text-xs font-medium rr-text-navy-muted">Target: {formatDateTime(slaTargetAt)}</p>
        </div>
        <div className="min-w-[13rem] flex-1 sm:max-w-xs">
          <label htmlFor={`support-due-${ticketId}`} className="flex items-center gap-1 text-xs font-black uppercase tracking-wide rr-text-navy-muted">
            <CalendarClock size={13} aria-hidden="true" /> Manual due date
          </label>
          <input
            id={`support-due-${ticketId}`}
            type="datetime-local"
            value={dueValue}
            onChange={(event) => setDueValue(event.target.value)}
            disabled={updateDueAt.isPending}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-wait disabled:opacity-60"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveDueDate}
              disabled={updateDueAt.isPending}
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg rr-bg-navy px-3 text-xs font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              Save deadline
            </button>
            <button
              type="button"
              onClick={() => {
                setDueValue("");
                updateDueAt.mutate({ id: ticketId, dueAt: null });
              }}
              disabled={!dueAt || updateDueAt.isPending}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black rr-text-navy transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              <X size={14} aria-hidden="true" /> <span className="sr-only">Clear deadline</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TicketInternalNotes({
  ticketId,
  administrators,
}: {
  ticketId: number;
  administrators: Array<{ id: number; name: string | null; email: string | null }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [mentionUserIds, setMentionUserIds] = useState<number[]>([]);
  const utils = trpc.useUtils();
  const notes = trpc.support.internalNotes.useQuery({ id: ticketId }, { enabled: isOpen });
  const addNote = trpc.support.addInternalNote.useMutation({
    onSuccess: () => {
      setDraft("");
      setMentionUserIds([]);
      toast.success("Internal note added.");
      void utils.support.internalNotes.invalidate({ id: ticketId });
    },
    onError: (error) => toast.error(error.message || "Unable to add the internal note."),
  });

  const insertFormatting = (prefix: string, suffix = prefix, placeholder = "text") => {
    const textarea = document.getElementById(`support-note-${ticketId}`) as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const selected = draft.slice(start, end) || placeholder;
    const nextValue = `${draft.slice(0, start)}${prefix}${selected}${suffix}${draft.slice(end)}`;
    setDraft(nextValue);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const cursorPosition = start + prefix.length + selected.length + suffix.length;
      textarea?.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const addMention = (value: string) => {
    const userId = Number(value);
    if (!Number.isInteger(userId) || userId <= 0) return;
    setMentionUserIds((current) => current.includes(userId) ? current : [...current, userId]);
  };

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white" aria-labelledby={`support-notes-heading-${ticketId}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
      >
        <span id={`support-notes-heading-${ticketId}`} className="inline-flex items-center gap-2 text-sm font-black rr-text-navy"><StickyNote size={16} aria-hidden="true" /> Internal resolution notes</span>
        <span className="text-xs font-bold rr-text-navy-muted">{isOpen ? "Hide" : "Collaborate"}</span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-200 p-3">
          <p className="mb-3 text-xs font-semibold rr-text-navy-muted">Private to administrators. Notes are never included in customer messages.</p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {notes.isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin rr-text-navy" size={20} /></div>
            ) : notes.data?.length ? notes.data.map((note) => (
              <article key={note.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <strong className="rr-text-navy">{formatAssignee(note.authorName, note.authorEmail)}</strong>
                  <time className="rr-text-navy-muted" dateTime={new Date(note.createdAt).toISOString()}>{formatDateTime(note.createdAt)}</time>
                </div>
                <div className="support-note-rich-text mt-1 text-sm leading-6 rr-text-navy" dangerouslySetInnerHTML={{ __html: note.bodyHtml }} />
                {note.mentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Mentioned administrators">
                    {note.mentions.map((mention) => (
                      <span key={mention.userId} className="rounded-full bg-violet-100 px-2 py-1 text-xs font-black text-violet-900">@{formatAssignee(mention.name, mention.email)}</span>
                    ))}
                  </div>
                )}
              </article>
            )) : (
              <p className="py-2 text-sm font-semibold rr-text-navy-muted">No internal notes yet.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Rich text formatting">
            <span className="mr-1 text-xs font-black uppercase tracking-wide rr-text-navy-muted">Format</span>
            <button type="button" onClick={() => insertFormatting("**", "**", "bold text")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-black rr-text-navy hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label="Bold selected text"><Bold size={14} aria-hidden="true" /> Bold</button>
            <button type="button" onClick={() => insertFormatting("_", "_", "italic text")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-black rr-text-navy hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label="Italicize selected text"><Italic size={14} aria-hidden="true" /> Italic</button>
            <button type="button" onClick={() => insertFormatting("`", "`", "code")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-black rr-text-navy hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label="Format selected text as code"><Code2 size={14} aria-hidden="true" /> Code</button>
            <button type="button" onClick={() => insertFormatting("~~", "~~", "struck text")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-black rr-text-navy hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label="Strike through selected text"><Strikethrough size={14} aria-hidden="true" /> Strike</button>
            <button type="button" onClick={() => insertFormatting("- ", "", "list item")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-black rr-text-navy hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label="Add a bullet list item"><List size={14} aria-hidden="true" /> List</button>
          </div>
          <p className="mt-2 text-xs font-semibold rr-text-navy-muted">Use the controls for safe rich-text notes. Tag teammates below to notify them privately.</p>
          <label htmlFor={`support-note-${ticketId}`} className="sr-only">Add an internal resolution note</label>
          <textarea
            id={`support-note-${ticketId}`}
            value={draft}
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share an internal update, reproduction step, or resolution detail…"
            className="mt-3 min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label htmlFor={`support-mention-${ticketId}`} className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">Tag administrators</label>
            <select id={`support-mention-${ticketId}`} value="" onChange={(event) => addMention(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Choose an administrator to mention…</option>
              {administrators.filter((administrator) => !mentionUserIds.includes(administrator.id)).map((administrator) => (
                <option key={administrator.id} value={administrator.id}>{formatAssignee(administrator.name, administrator.email)}</option>
              ))}
            </select>
            {mentionUserIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected administrator mentions">
                {mentionUserIds.map((userId) => {
                  const administrator = administrators.find((candidate) => candidate.id === userId);
                  if (!administrator) return null;
                  return (
                    <button key={userId} type="button" onClick={() => setMentionUserIds((current) => current.filter((id) => id !== userId))} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-violet-100 px-2 text-xs font-black text-violet-900 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" aria-label={`Remove mention of ${formatAssignee(administrator.name, administrator.email)}`}>
                      @{formatAssignee(administrator.name, administrator.email)} <X size={12} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold rr-text-navy-muted">{draft.length}/4,000</span>
            <button
              type="button"
              onClick={() => addNote.mutate({ id: ticketId, body: draft.trim(), mentionUserIds })}
              disabled={draft.trim().length === 0 || addNote.isPending}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg rr-bg-navy px-3 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              <SendHorizontal size={14} aria-hidden="true" /> Add internal note
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminSupportInboxPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const [slaDeadline, setSlaDeadline] = useState<SlaDeadlineFilter>("all");
  const [sort, setSort] = useState<TicketSort>("newest");
  const [savedViewName, setSavedViewName] = useState("");
  const [activeSavedViewId, setActiveSavedViewId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [navigate, user]);

  const queryInput = useMemo<AdminListInput>(() => ({
    status: status === "all" ? undefined : status,
    topic: topic === "all" ? undefined : topic,
    priority: priority === "all" ? undefined : priority,
    assigneeScope: assignee === "all" ? "any" : assignee === "unassigned" ? "unassigned" : "specific",
    assigneeUserId: assignee === "all" ? undefined : assignee === "unassigned" ? "unassigned" : Number(assignee),
    slaWindow: slaDeadline === "all" ? undefined : slaDeadline,
    sort,
  }), [assignee, priority, slaDeadline, sort, status, topic]);

  const submissions = trpc.support.adminList.useQuery(queryInput, {
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const assignees = trpc.support.adminAssignees.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const savedViews = trpc.support.savedViews.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const invalidateInbox = () => void utils.support.adminList.invalidate();
  const invalidateSavedViews = () => void utils.support.savedViews.invalidate();
  const updateStatus = trpc.support.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Support status updated.");
      invalidateInbox();
    },
    onError: (error) => toast.error(error.message || "Unable to update the support status."),
  });
  const updatePriority = trpc.support.updatePriority.useMutation({
    onSuccess: () => {
      toast.success("Ticket priority updated.");
      invalidateInbox();
    },
    onError: (error) => toast.error(error.message || "Unable to update ticket priority."),
  });
  const updateAssignee = trpc.support.updateAssignee.useMutation({
    onSuccess: () => {
      toast.success("Ticket assignee updated.");
      invalidateInbox();
    },
    onError: (error) => toast.error(error.message || "Unable to update ticket assignee."),
  });
  const saveView = trpc.support.saveView.useMutation({
    onSuccess: (result) => {
      toast.success(result.created ? "Queue view saved." : "Queue view updated.");
      setSavedViewName("");
      void invalidateSavedViews();
    },
    onError: (error) => toast.error(error.message || "Unable to save the queue view."),
  });
  const deleteView = trpc.support.deleteView.useMutation({
    onSuccess: (_result, variables) => {
      if (activeSavedViewId === variables.id) setActiveSavedViewId(null);
      toast.success("Queue view deleted.");
      void invalidateSavedViews();
    },
    onError: (error) => toast.error(error.message || "Unable to delete the queue view."),
  });
  const checkSlaBreach = trpc.support.checkSlaBreach.useMutation({
    onError: (error) => toast.error(error.message || "Unable to check urgent SLA deadlines."),
  });

  useEffect(() => {
    if (user?.role === "admin") checkSlaBreach.mutate();
    // An inbox mount runs a single durable breach check. Toast delivery remains
    // centralized in SupportTicketAlerts so each recipient sees only their own alerts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const applySavedView = (view: SavedQueueView) => {
    setStatus(view.status ?? "all");
    setTopic(view.topic ?? "all");
    setPriority(view.priority ?? "all");
    const savedAssignee: AssigneeFilter = view.assigneeScope === "unassigned"
      ? "unassigned"
      : view.assigneeScope === "specific" && view.assigneeUserId !== null
        ? `${view.assigneeUserId}` as `${number}`
        : "all";
    setAssignee(savedAssignee);
    setSlaDeadline(view.slaWindow ?? "all");
    setSort(view.sort ?? "newest");
    setActiveSavedViewId(view.id);
  };

  const saveCurrentView = () => {
    const name = savedViewName.trim();
    if (!name) {
      toast.error("Name this queue view before saving it.");
      return;
    }
    saveView.mutate({
      name,
      status: status === "all" ? null : status,
      topic: topic === "all" ? null : topic,
      priority: priority === "all" ? null : priority,
      assigneeScope: assignee === "all" ? "any" : assignee === "unassigned" ? "unassigned" : "specific",
      assigneeUserId: assignee !== "all" && assignee !== "unassigned" ? Number(assignee) : null,
      slaWindow: slaDeadline === "all" ? null : slaDeadline,
      sort,
    });
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <header className="px-5 pt-10 pb-6 rr-bg-navy">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-4 flex items-center gap-1.5 text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <ArrowLeft size={15} /> Back to Admin Dashboard
        </button>
        <div className="mb-1 flex items-center gap-2 rr-text-gold">
          <Inbox size={17} />
          <span className="text-xs font-black uppercase tracking-[0.18em]">Support operations</span>
        </div>
        <h1 className="text-3xl font-black text-white">Support inbox</h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-white/85">
          Triage customer messages by topic, priority, ownership, SLA deadline, screenshot attachment, and resolution status.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <section aria-labelledby="support-inbox-filters" className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="support-inbox-filters" className="text-base font-black rr-text-navy">Filter and sort submissions</h2>
              <p className="mt-1 text-sm rr-text-navy-muted">Organize the queue by ownership, priority, SLA urgency, or manual deadline. Assignment and screenshot links are available only to administrators.</p>
            </div>
            <button
              type="button"
              onClick={() => void submissions.refetch()}
              disabled={submissions.isFetching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              <RefreshCw size={16} className={submissions.isFetching ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-labelledby="support-saved-views-title">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 id="support-saved-views-title" className="text-sm font-black rr-text-navy">Saved queue views</h3>
                <p className="mt-1 text-xs font-medium rr-text-navy-muted">Save filter and sort combinations for quick triage. Views are private to your administrator account.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-lg">
                <label htmlFor="support-saved-view-name" className="sr-only">New queue view name</label>
                <input
                  id="support-saved-view-name"
                  value={savedViewName}
                  maxLength={80}
                  onChange={(event) => setSavedViewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveCurrentView();
                    }
                  }}
                  placeholder="Name this view, e.g. Urgent unassigned"
                  className="min-h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={saveCurrentView}
                  disabled={saveView.isPending || savedViewName.trim().length === 0}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl rr-bg-navy px-3 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                >
                  {saveView.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Save current
                </button>
              </div>
            </div>
            {savedViews.isLoading ? (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold rr-text-navy-muted"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading saved views…</div>
            ) : savedViews.data?.length ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Saved support queue views">
                {savedViews.data.map((view) => (
                  <div key={view.id} className={`inline-flex max-w-full items-center overflow-hidden rounded-xl border ${activeSavedViewId === view.id ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"}`}>
                    <button
                      type="button"
                      onClick={() => applySavedView(view as SavedQueueView)}
                      aria-pressed={activeSavedViewId === view.id}
                      className="min-h-10 truncate px-3 text-sm font-black rr-text-navy transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteView.mutate({ id: view.id })}
                      disabled={deleteView.isPending}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center border-l border-inherit px-2 text-slate-600 transition hover:bg-red-50 hover:text-red-800 disabled:cursor-wait disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
                      aria-label={`Delete saved queue view ${view.name}`}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-semibold rr-text-navy-muted">No saved views yet. Save the filters below to create one.</p>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="support-status-filter" className="text-sm font-black rr-text-navy">Status</label>
              <select id="support-status-filter" value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setActiveSavedViewId(null); }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All statuses</option>
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-topic-filter" className="text-sm font-black rr-text-navy">Topic</label>
              <select id="support-topic-filter" value={topic} onChange={(event) => { setTopic(event.target.value as TopicFilter); setActiveSavedViewId(null); }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All topics</option>
                {Object.entries(topicLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-priority-filter" className="text-sm font-black rr-text-navy">Priority</label>
              <select id="support-priority-filter" value={priority} onChange={(event) => { setPriority(event.target.value as PriorityFilter); setActiveSavedViewId(null); }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All priorities</option>
                {Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-assignee-filter" className="text-sm font-black rr-text-navy">Assignee</label>
              <select id="support-assignee-filter" value={assignee} onChange={(event) => { setAssignee(event.target.value as AssigneeFilter); setActiveSavedViewId(null); }} disabled={assignees.isLoading} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-wait disabled:opacity-60">
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {assignees.data?.map((candidate) => <option key={candidate.id} value={candidate.id}>{formatAssignee(candidate.name, candidate.email)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-sla-filter" className="text-sm font-black rr-text-navy">SLA deadline</label>
              <select id="support-sla-filter" value={slaDeadline} onChange={(event) => { setSlaDeadline(event.target.value as SlaDeadlineFilter); setActiveSavedViewId(null); }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All SLA targets</option>
                <option value="overdue">Overdue SLA</option>
                <option value="next_4_hours">Due within 4 hours</option>
                <option value="next_24_hours">Due within 24 hours</option>
              </select>
            </div>
            <div>
              <label htmlFor="support-sort" className="text-sm font-black rr-text-navy">Sort by</label>
              <select id="support-sort" value={sort} onChange={(event) => { setSort(event.target.value as TicketSort); setActiveSavedViewId(null); }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="newest">Newest received</option>
                <option value="oldest">Oldest received</option>
                <option value="priority">Highest priority</option>
                <option value="assignee">Assignee</option>
                <option value="sla_soonest">SLA due soonest</option>
                <option value="due_soonest">Manual deadline soonest</option>
              </select>
            </div>
          </div>
        </section>

        {submissions.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin rr-text-navy" size={32} /></div>
        ) : submissions.error ? (
          <div role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{submissions.error.message}</div>
        ) : submissions.data?.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <MessageSquareText className="mx-auto rr-text-navy-muted" size={34} />
            <h2 className="mt-3 text-lg font-black rr-text-navy">No support messages match these filters</h2>
            <p className="mt-1 text-sm rr-text-navy-muted">New messages will appear here after a customer submits the public support form.</p>
          </section>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.data?.map((submission) => {
              const currentStatus = normalizeStatus(submission.status);
              const currentTopic = normalizeTopic(submission.topic);
              const currentPriority = normalizePriority(submission.priority);
              const isStatusUpdating = updateStatus.isPending && updateStatus.variables?.id === submission.id;
              const isPriorityUpdating = updatePriority.isPending && updatePriority.variables?.id === submission.id;
              const isAssigneeUpdating = updateAssignee.isPending && updateAssignee.variables?.id === submission.id;
              const assigneeValue = submission.assigneeUserId ? String(submission.assigneeUserId) : "unassigned";
              const showLegacyAssignee = Boolean(submission.assigneeUserId && assignees.data && !assignees.data.some((candidate) => candidate.id === submission.assigneeUserId));
              const assigneeDisplay = submission.assigneeUserId ? formatAssignee(submission.assigneeName, submission.assigneeEmail) : "Unassigned";
              const slaTargetTime = submission.slaTargetAt ? new Date(submission.slaTargetAt).getTime() : null;
              const hasUrgentSlaBreach = currentStatus !== "resolved"
                && currentPriority === "urgent"
                && slaTargetTime !== null
                && slaTargetTime <= Date.now();

              return (
                <article
                  key={submission.id}
                  className={`rounded-2xl bg-white p-4 shadow-sm ${hasUrgentSlaBreach ? "border-2 border-red-500 bg-red-50/40 shadow-red-100" : ""}`}
                  data-testid={`support-submission-${submission.id}`}
                  data-sla-breached={hasUrgentSlaBreach ? "true" : "false"}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-black rr-text-navy">{submission.name || submission.email}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${statusStyle(currentStatus)}`}>{statusLabel[currentStatus]}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${priorityStyle(currentPriority)}`}><Flag size={12} aria-hidden="true" /> {priorityLabel[currentPriority]}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black rr-text-navy">{topicLabel[currentTopic]}</span>
                        {hasUrgentSlaBreach && <span className="inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-1 text-xs font-black text-white"><AlertTriangle size={12} aria-hidden="true" /> Urgent SLA breach</span>}
                      </div>
                      <p className="mt-2 text-sm font-black rr-text-navy">{submission.subject}</p>
                      <a href={`mailto:${submission.email}`} className="mt-1 inline-block break-all text-sm font-semibold text-blue-800 underline decoration-blue-400 underline-offset-2 hover:text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
                        {submission.email}
                      </a>
                      <time className="ml-2 text-xs font-medium rr-text-navy-muted" dateTime={new Date(submission.createdAt).toISOString()}>
                        {new Date(submission.createdAt).toLocaleString()}
                      </time>
                      <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-bold rr-text-navy-muted">
                        <UserRoundCheck size={14} aria-hidden="true" />
                        <span className="truncate">Owner: {assigneeDisplay}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 rr-text-navy">{submission.message}</p>
                      {submission.attachmentUrl && (
                        <a href={submission.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-black rr-text-navy transition hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2">
                          <Paperclip size={15} /> Open screenshot <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                      <TicketDeadlineControls
                        ticketId={submission.id}
                        status={currentStatus}
                        dueAt={submission.dueAt}
                        slaTargetAt={submission.slaTargetAt}
                      />
                      <TicketInternalNotes ticketId={submission.id} administrators={assignees.data ?? []} />
                    </div>
                    <div className="grid w-full shrink-0 gap-3 sm:grid-cols-3 lg:max-w-[34rem]">
                      <div>
                        <label htmlFor={`support-status-${submission.id}`} className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">Status</label>
                        <select id={`support-status-${submission.id}`} value={currentStatus} disabled={isStatusUpdating} onChange={(event) => updateStatus.mutate({ id: submission.id, status: event.target.value as SupportStatus })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-black rr-text-navy outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-wait disabled:opacity-60">
                          {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`support-priority-${submission.id}`} className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">Priority</label>
                        <select id={`support-priority-${submission.id}`} value={currentPriority} disabled={isPriorityUpdating} onChange={(event) => updatePriority.mutate({ id: submission.id, priority: event.target.value as SupportPriority })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-black rr-text-navy outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-wait disabled:opacity-60">
                          {Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`support-assignee-${submission.id}`} className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">Assignee</label>
                        <select id={`support-assignee-${submission.id}`} value={assigneeValue} disabled={isAssigneeUpdating || assignees.isLoading} onChange={(event) => updateAssignee.mutate({ id: submission.id, assigneeUserId: event.target.value === "unassigned" ? null : Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-black rr-text-navy outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-wait disabled:opacity-60">
                          <option value="unassigned">Unassigned</option>
                          {showLegacyAssignee && <option value={assigneeValue}>{assigneeDisplay}</option>}
                          {assignees.data?.map((candidate) => <option key={candidate.id} value={candidate.id}>{formatAssignee(candidate.name, candidate.email)}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
