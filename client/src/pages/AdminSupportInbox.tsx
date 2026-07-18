import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Flag, Inbox, Loader2, MessageSquareText, Paperclip, RefreshCw, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type SupportStatus = "open" | "in_progress" | "resolved";
type SupportPriority = "low" | "normal" | "high" | "urgent";
type StatusFilter = SupportStatus | "all";
type TopicFilter = "billing" | "onboarding" | "technical" | "all";
type PriorityFilter = SupportPriority | "all";
type AssigneeFilter = "all" | "unassigned" | `${number}`;
type AdminListInput = {
  status?: SupportStatus;
  topic?: Exclude<TopicFilter, "all">;
  priority?: SupportPriority;
  assigneeUserId?: "unassigned" | number;
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

export default function AdminSupportInboxPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [navigate, user]);

  const queryInput = useMemo<AdminListInput>(() => ({
    status: status === "all" ? undefined : status,
    topic: topic === "all" ? undefined : topic,
    priority: priority === "all" ? undefined : priority,
    assigneeUserId: assignee === "all" ? undefined : assignee === "unassigned" ? "unassigned" : Number(assignee),
  }), [assignee, priority, status, topic]);

  const submissions = trpc.support.adminList.useQuery(queryInput, {
    enabled: user?.role === "admin",
  });
  const assignees = trpc.support.adminAssignees.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const invalidateInbox = () => void utils.support.adminList.invalidate();
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
          Triage customer messages by topic, priority, ownership, screenshot attachment, and resolution status.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <section aria-labelledby="support-inbox-filters" className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="support-inbox-filters" className="text-base font-black rr-text-navy">Filter submissions</h2>
              <p className="mt-1 text-sm rr-text-navy-muted">Newest messages appear first. Assignment and screenshot links are available only to administrators.</p>
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="support-status-filter" className="text-sm font-black rr-text-navy">Status</label>
              <select id="support-status-filter" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All statuses</option>
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-topic-filter" className="text-sm font-black rr-text-navy">Topic</label>
              <select id="support-topic-filter" value={topic} onChange={(event) => setTopic(event.target.value as TopicFilter)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All topics</option>
                {Object.entries(topicLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-priority-filter" className="text-sm font-black rr-text-navy">Priority</label>
              <select id="support-priority-filter" value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All priorities</option>
                {Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="support-assignee-filter" className="text-sm font-black rr-text-navy">Assignee</label>
              <select id="support-assignee-filter" value={assignee} onChange={(event) => setAssignee(event.target.value as AssigneeFilter)} disabled={assignees.isLoading} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-wait disabled:opacity-60">
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {assignees.data?.map((candidate) => <option key={candidate.id} value={candidate.id}>{formatAssignee(candidate.name, candidate.email)}</option>)}
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

              return (
                <article key={submission.id} className="rounded-2xl bg-white p-4 shadow-sm" data-testid={`support-submission-${submission.id}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-black rr-text-navy">{submission.name || submission.email}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${statusStyle(currentStatus)}`}>{statusLabel[currentStatus]}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${priorityStyle(currentPriority)}`}><Flag size={12} aria-hidden="true" /> {priorityLabel[currentPriority]}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black rr-text-navy">{topicLabel[currentTopic]}</span>
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
