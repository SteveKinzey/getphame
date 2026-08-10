import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useDebounce } from "use-debounce";
import { AlertTriangle, ArrowDown, ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, Clock3, Crown, Download, Filter, Loader2, MailCheck, MailWarning, MailPlus, Merge, Plus, RefreshCw, Search, Send, ShieldCheck, ShieldOff, Trash2, Unplug, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function matchesTypedEmail(confirmation: string, email: string | null | undefined) {
  return Boolean(email) && confirmation.trim().toLowerCase() === email!.trim().toLowerCase();
}

export function buildSmtpOnboardingDraft(recipientName?: string | null) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hi,";
  return {
    subject: "Welcome to Get Phame — connect your sending email",
    bodyText: `${greeting}

Welcome to Get Phame. Connecting your own sending email lets review requests come from an address your customers recognize.

In Get Phame, open Settings → Email sending and enter the email address plus the app password or SMTP password from your provider. Never send your password to us by email.

Common provider setup paths:
• Gmail or Google Workspace: enable 2-Step Verification, then create a Google App Password for Mail.
• Microsoft 365 / Outlook: use SMTP AUTH if your tenant allows it, or an app password where your Microsoft account supports one.
• Outlook.com, Live, or Hotmail: use an app password if two-step verification is enabled.
• Yahoo!: create an App Password in Account Security.
• Zoho Mail: create an app-specific password and use the SMTP details shown in Zoho Mail settings.
• iCloud Mail: create an app-specific password at appleid.apple.com.
• AOL: create an app password in Account Security.
• Proton Mail: use Proton Mail Bridge; direct SMTP is not available without it.
• Fastmail: create an app password in Settings → Password & Security.
• Another provider or custom domain: use the SMTP host, port, encryption setting, username, and app password supplied by your provider.

If you need help, reply to hello@getphame.app with your provider name. Do not include a password, app password, or verification code.

— Get Phame`,
  };
}

export type SmtpStatusFilter = "all" | "verified" | "unverified" | "failing" | "unconnected";
export type SmtpAuditOutcomeFilter = "all" | "removed";

export function parseAdminUserDirectoryParams(searchString: string): {
  search: string;
  smtpStatus: SmtpStatusFilter;
} {
  const params = new URLSearchParams(searchString);
  const requestedStatus = params.get("smtpStatus");
  const smtpStatus = requestedStatus === "verified" || requestedStatus === "unverified" || requestedStatus === "failing" || requestedStatus === "unconnected"
    ? requestedStatus
    : "all";

  return {
    search: params.get("search")?.trim() ?? "",
    smtpStatus,
  };
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const directoryParams = useMemo(() => parseAdminUserDirectoryParams(searchString), [searchString]);
  const [search, setSearch] = useState(directoryParams.search);
  const [debouncedSearch] = useDebounce(search, 300);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusFilter>(directoryParams.smtpStatus);
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditAdminId, setAuditAdminId] = useState("all");
  const [auditOutcome, setAuditOutcome] = useState<SmtpAuditOutcomeFilter>("all");
  const [auditPage, setAuditPage] = useState(1);
  const [smtpRecovery, setSmtpRecovery] = useState<{ userId: number; checkedAt: number } | null>(null);
  const auditPageSize = 25;
  const [page, setPage] = useState(1);
  const [consentSort, setConsentSort] = useState<"none" | "asc" | "desc">("none");
  const pageSize = 25;
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    setSearch(directoryParams.search);
    setSmtpStatus(directoryParams.smtpStatus);
  }, [directoryParams.search, directoryParams.smtpStatus]);

  useEffect(() => setPage(1), [debouncedSearch, smtpStatus]);
  useEffect(() => setAuditPage(1), [auditAdminId, auditDateFrom, auditDateTo, auditOutcome]);

  const directory = trpc.admin.listUsers.useQuery(
    { query: debouncedSearch, smtpStatus, page, pageSize },
    { enabled: user?.role === "admin" }
  );
  const auditQueryInput = useMemo(() => ({
    page: auditPage,
    pageSize: auditPageSize,
    dateFrom: auditDateFrom ? new Date(`${auditDateFrom}T00:00:00.000`).getTime() : undefined,
    dateTo: auditDateTo ? new Date(`${auditDateTo}T23:59:59.999`).getTime() : undefined,
    adminId: auditAdminId === "all" ? undefined : Number(auditAdminId),
    outcome: auditOutcome,
  }), [auditAdminId, auditDateFrom, auditDateTo, auditOutcome, auditPage]);
  const auditExportInput = useMemo(() => ({
    dateFrom: auditQueryInput.dateFrom,
    dateTo: auditQueryInput.dateTo,
    adminId: auditQueryInput.adminId,
    outcome: auditQueryInput.outcome,
  }), [auditQueryInput.dateFrom, auditQueryInput.dateTo, auditQueryInput.adminId, auditQueryInput.outcome]);
  const smtpAuditLogs = trpc.admin.listSmtpAuditLogs.useQuery(
    auditQueryInput,
    { enabled: user?.role === "admin" }
  );
  const smtpAuditActors = trpc.admin.listSmtpAuditActors.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const smtpAuditExport = trpc.admin.exportSmtpAuditLogs.useQuery(auditExportInput, {
    enabled: false,
    retry: false,
  });
  type DirectoryAccount = NonNullable<typeof directory.data>["users"][number];

  const [deleteAccount, setDeleteAccount] = useState<DirectoryAccount | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [combineSource, setCombineSource] = useState<DirectoryAccount | null>(null);
  const [combineTargetId, setCombineTargetId] = useState("");
  const [combineConfirmation, setCombineConfirmation] = useState("");
  const [smtpAccount, setSmtpAccount] = useState<DirectoryAccount | null>(null);
  const [smtpConfirmation, setSmtpConfirmation] = useState("");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [accessAccount, setAccessAccount] = useState<DirectoryAccount | null>(null);
  const [accessKind, setAccessKind] = useState<"months" | "years" | "lifetime">("months");
  const [accessQuantity, setAccessQuantity] = useState("1");
  const [suspendAccount, setSuspendAccount] = useState<DirectoryAccount | null>(null);
  const [suspendDays, setSuspendDays] = useState("7");
  const [suspendConfirmation, setSuspendConfirmation] = useState("");
  const [emailAccount, setEmailAccount] = useState<DirectoryAccount | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<"smtp_onboarding" | "custom">("smtp_onboarding");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyText, setEmailBodyText] = useState("");
  const [outboxAccount, setOutboxAccount] = useState<DirectoryAccount | null>(null);

  const mergeCandidates = trpc.admin.listUsers.useQuery(
    { query: "", smtpStatus: "all", page: 1, pageSize: 100 },
    { enabled: user?.role === "admin" && Boolean(combineSource) }
  );
  const outbox = trpc.admin.listUserEmailOutbox.useQuery(
    { userId: outboxAccount?.id ?? -1, page: 1, pageSize: 20 },
    { enabled: user?.role === "admin" && Boolean(outboxAccount) }
  );

  const refresh = () => utils.admin.listUsers.invalidate();
  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { toast.success(t("adminUsers.roleUpdated", { defaultValue: "Administrator access updated." })); void refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const setLifeAccess = trpc.admin.setLifeAccess.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled
        ? t("adminUsers.lifeGranted", { defaultValue: "Life access granted." })
        : t("adminUsers.lifeRemoved", { defaultValue: "Life access removed." }));
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: (data) => {
      toast.success(t("adminUsers.userCreated", { defaultValue: "Passwordless account created for {{email}}.", email: data.email }));
      setNewUserOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const grantFlexibleAccess = trpc.admin.grantFlexibleAccess.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.accessUpdated", { defaultValue: "Paid access updated." }));
      setAccessAccount(null);
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const suspendUser = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.userSuspended", { defaultValue: "Account suspended and active sessions revoked." }));
      setSuspendAccount(null);
      setSuspendConfirmation("");
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const restoreUser = trpc.admin.restoreUser.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.userRestored", { defaultValue: "Account access restored." }));
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const sendUserEmail = trpc.admin.sendUserEmail.useMutation({
    onSuccess: (data) => {
      if (data.ok) toast.success(t("adminUsers.emailSent", { defaultValue: "Email sent from hello@getphame.app." }));
      else toast.error(t("adminUsers.emailNotConfirmed", { defaultValue: "Delivery was not confirmed. The outbox contains the recorded attempt." }));
      setEmailAccount(null);
      void utils.admin.listUserEmailOutbox.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t("adminUsers.deleted", { defaultValue: "Account deleted." }));
      setDeleteAccount(null);
      setDeleteConfirmation("");
      if (directory.data?.users.length === 1 && page > 1) setPage((value) => value - 1);
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const combineAccounts = trpc.admin.combineAccounts.useMutation({
    onSuccess: (data) => {
      toast.success(t("adminUsers.combined", {
        defaultValue: "Accounts combined. {{name}} is now the surviving account.",
        name: data.target.name || data.target.email || `#${data.target.id}`,
      }));
      setCombineSource(null);
      setCombineTargetId("");
      setCombineConfirmation("");
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const removeUserSmtp = trpc.admin.removeUserSmtp.useMutation({
    onSuccess: (data) => {
      toast.success(data.removed
        ? t("adminUsers.smtpRemoved", { defaultValue: "SMTP credentials removed." })
        : t("adminUsers.smtpAlreadyAbsent", { defaultValue: "No SMTP credentials were connected." }));
      setSmtpAccount(null);
      setSmtpConfirmation("");
      void refresh();
      void utils.admin.listSmtpAuditLogs.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const retestUserSmtp = trpc.admin.retestUserSmtp.useMutation({
    onSuccess: (data, variables) => {
      if (data.ok) {
        if (data.recovered) {
          setSmtpRecovery({ userId: variables.userId, checkedAt: data.checkedAt });
          toast.success(t("adminUsers.smtpRecovered", { defaultValue: "SMTP connection recovered and verified." }));
        } else {
          setSmtpRecovery((current) => current?.userId === variables.userId ? null : current);
          toast.success(t("adminUsers.smtpRetestPassed", { defaultValue: "SMTP verification passed." }));
        }
      } else {
        setSmtpRecovery((current) => current?.userId === variables.userId ? null : current);
        toast.error(data.error || t("adminUsers.smtpRetestFailed", { defaultValue: "SMTP verification failed." }));
      }
      void refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const exportAuditCsv = async () => {
    const result = await smtpAuditExport.refetch();
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (!result.data?.total) {
      toast.error(t("adminUsers.smtpAuditNoExportRows", { defaultValue: "No audit records match the current filters." }));
      return;
    }
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(t("adminUsers.smtpAuditExported", {
      defaultValue: "Exported {{count}} matching audit records.",
      count: result.data.total,
    }));
  };

  const openSmtpOnboardingComposer = (account: DirectoryAccount) => {
    const draft = buildSmtpOnboardingDraft(account.name);
    setEmailAccount(account);
    setEmailTemplate("smtp_onboarding");
    setEmailSubject(draft.subject);
    setEmailBodyText(draft.bodyText);
  };

  if (!user || user.role !== "admin") return null;

  const busyUserId = setRole.variables?.userId
    ?? setLifeAccess.variables?.userId
    ?? grantFlexibleAccess.variables?.userId
    ?? suspendUser.variables?.userId
    ?? restoreUser.variables?.userId
    ?? sendUserEmail.variables?.userId
    ?? retestUserSmtp.variables?.userId
    ?? removeUserSmtp.variables?.userId
    ?? deleteUser.variables?.userId
    ?? combineAccounts.variables?.sourceUserId
    ?? combineAccounts.variables?.targetUserId;
  const combineTarget = mergeCandidates.data?.users.find((candidate) => candidate.id === Number(combineTargetId));

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <header className="px-5 pt-10 pb-6 rr-bg-navy">
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 mb-4 text-sm font-bold rr-text-gold">
          <ArrowLeft size={15} /> {t("adminUsers.back", { defaultValue: "Admin Dashboard" })}
        </button>
        <div className="flex items-center gap-2 mb-1 rr-text-gold">
          <Users size={17} />
          <span className="text-xs font-black uppercase tracking-[0.18em]">{t("adminUsers.eyebrow", { defaultValue: "User Management" })}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-white">{t("adminUsers.title", { defaultValue: "Manage users" })}</h1>
          <button
            type="button"
            onClick={() => setNewUserOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black rr-text-navy transition active:scale-[0.97]"
          >
            <Plus size={17} /> {t("adminUsers.addUser", { defaultValue: "Add user" })}
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold text-white/75">{t("adminUsers.subtitle", { defaultValue: "Search every account, combine duplicates, or control administrator and Life access." })}</p>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <label htmlFor="admin-user-search" className="text-sm font-black rr-text-navy">{t("adminUsers.searchLabel", { defaultValue: "Search users" })}</label>
          <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 rr-text-navy-muted" />
              <input
                id="admin-user-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("adminUsers.searchPlaceholder", { defaultValue: "Name or email" })}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="relative">
              <Filter size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rr-text-navy-muted" />
              <label htmlFor="smtp-status-filter" className="sr-only">{t("adminUsers.smtpFilterLabel", { defaultValue: "Filter by SMTP status" })}</label>
              <select
                id="smtp-status-filter"
                data-testid="smtp-status-filter"
                value={smtpStatus}
                onChange={(event) => setSmtpStatus(event.target.value as SmtpStatusFilter)}
                className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-black rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">{t("adminUsers.smtpFilterAll", { defaultValue: "All SMTP statuses" })}</option>
                <option value="verified">{t("adminUsers.smtpFilterVerified", { defaultValue: "SMTP verified" })}</option>
                <option value="unverified">{t("adminUsers.smtpFilterUnverified", { defaultValue: "SMTP unverified" })}</option>
                <option value="failing">{t("adminUsers.smtpFilterFailing", { defaultValue: "SMTP health check failed" })}</option>
                <option value="unconnected">{t("adminUsers.smtpFilterUnconnected", { defaultValue: "No SMTP connected" })}</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold rr-text-navy-muted">
            {directory.data
              ? t("adminUsers.accountCount", { defaultValue: "{{count}} accounts", count: directory.data.total })
              : t("adminUsers.loading", { defaultValue: "Loading accounts…" })}
          </p>
        </div>

        {directory.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin rr-text-navy" size={32} /></div>
        ) : directory.error ? (
          <div className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{directory.error.message}</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs font-bold rr-text-navy-mid">Sort by consent:</span>
              {(["none", "desc", "asc"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setConsentSort(opt)}
                  className={`rounded-full px-2.5 py-1 text-xs font-black transition ${consentSort === opt ? "rr-bg-navy text-white" : "bg-slate-100 rr-text-navy hover:bg-slate-200"}`}
                >
                  {opt === "none" ? "Default" : opt === "desc" ? "Highest ↓" : "Lowest ↑"}
                </button>
              ))}
            </div>
            {(consentSort === "none"
              ? (directory.data?.users ?? [])
              : [...(directory.data?.users ?? [])].sort((a, b) => {
                  const pctA = (a as any).consentStats?.total > 0 ? ((a as any).consentStats.consented / (a as any).consentStats.total) * 100 : -1;
                  const pctB = (b as any).consentStats?.total > 0 ? ((b as any).consentStats.consented / (b as any).consentStats.total) * 100 : -1;
                  return consentSort === "desc" ? pctB - pctA : pctA - pctB;
                })
            ).map((account) => {
              const isSelf = account.id === user.id;
              const isBusy = busyUserId === account.id && (setRole.isPending || setLifeAccess.isPending || grantFlexibleAccess.isPending || suspendUser.isPending || restoreUser.isPending || sendUserEmail.isPending || retestUserSmtp.isPending || removeUserSmtp.isPending || deleteUser.isPending || combineAccounts.isPending);
              return (
                <article key={account.id} className="rounded-2xl bg-white p-4 shadow-sm" data-testid={`admin-user-${account.id}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-black rr-text-navy">{account.name || t("adminUsers.unnamed", { defaultValue: "Unnamed user" })}</h2>
                        {account.role === "admin" && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black rr-bg-navy rr-text-gold"><ShieldCheck size={12} /> {t("adminUsers.admin", { defaultValue: "Admin" })}</span>
                        )}
                        {account.lifeAccess && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-900"><Crown size={12} /> {t("adminUsers.life", { defaultValue: "Life" })}</span>
                        )}
                        {account.isSuspended && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-800">
                            <ShieldOff size={12} /> {t("adminUsers.suspended", { defaultValue: "Suspended" })}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold rr-text-navy-mid">{account.email || t("adminUsers.noEmail", { defaultValue: "No email" })}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {account.smtpConnected ? (
                          <span
                            data-testid={`smtp-status-${account.id}`}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${account.smtpVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
                          >
                            {account.smtpVerified ? <MailCheck size={13} /> : <MailWarning size={13} />}
                            {account.smtpVerified
                              ? t("adminUsers.smtpVerified", { defaultValue: "SMTP verified" })
                              : t("adminUsers.smtpUnverified", { defaultValue: "SMTP unverified" })}
                          </span>
                        ) : (
                          <span data-testid={`smtp-status-${account.id}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                            <Unplug size={13} /> {t("adminUsers.smtpNotConnected", { defaultValue: "No SMTP" })}
                          </span>
                        )}
                        {account.smtpFromEmail && <span className="truncate text-xs font-semibold rr-text-navy-muted">{account.smtpFromEmail}</span>}
                        {(account as any).consentStats && (account as any).consentStats.total > 0 && (() => {
                          const cs = (account as any).consentStats as { consented: number; total: number };
                          const pct = Math.round((cs.consented / cs.total) * 100);
                          const isGood = pct >= 50;
                          return (
                            <span
                              title={`${cs.consented} of ${cs.total} contacts have consented (${pct}%)`}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${isGood ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
                            >
                              <ShieldCheck size={12} />
                              {pct}% consent
                            </span>
                          );
                        })()}
                        {(account as any).lastConsentRequestAt && (
                          <span
                            title={`Last consent request: ${new Date((account as any).lastConsentRequestAt).toLocaleString()}`}
                            className="truncate text-xs rr-text-navy-muted"
                          >
                            Last request: {new Date((account as any).lastConsentRequestAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {smtpRecovery?.userId === account.id && (
                        <p data-testid={`smtp-recovery-${account.id}`} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800">
                          <MailCheck size={14} />
                          {t("adminUsers.smtpRecoveryConfirmed", {
                            defaultValue: "Recovery confirmed {{time}}",
                            time: new Date(smtpRecovery.checkedAt).toLocaleString(),
                          })}
                        </p>
                      )}
                      <p className="mt-1 text-xs rr-text-navy-muted">
                        {t("adminUsers.accountMeta", {
                          defaultValue: "Joined {{date}} · Stored plan: {{tier}}",
                          date: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—",
                          tier: account.tier,
                        })}
                      </p>
                      {account.isSuspended && account.suspendedUntil && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-red-700">
                          <Clock3 size={13} />
                          {t("adminUsers.suspendedUntil", {
                            defaultValue: "Access resumes {{date}} ({{days}} day(s) remaining).",
                            date: new Date(account.suspendedUntil).toLocaleString(),
                            days: Math.max(1, Math.ceil((account.suspendedUntil - Date.now()) / 86_400_000)),
                          })}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                      <button
                        type="button"
                        disabled={isBusy || account.role === "admin"}
                        onClick={() => {
                          setAccessAccount(account);
                          setAccessKind("months");
                          setAccessQuantity("1");
                        }}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-black text-amber-900 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Crown size={15} /> {t("adminUsers.manageAccess", { defaultValue: "Manage access" })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !account.email}
                        onClick={() => openSmtpOnboardingComposer(account)}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-black text-blue-800 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <MailPlus size={15} /> {t("adminUsers.sendEmail", { defaultValue: "Send email" })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !account.email}
                        onClick={() => setOutboxAccount(account)}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ClipboardList size={15} /> {t("adminUsers.outbox", { defaultValue: "Outbox" })}
                      </button>
                      {account.isSuspended ? (
                        <button
                          type="button"
                          disabled={isBusy || account.role === "admin"}
                          onClick={() => restoreUser.mutate({ userId: account.id })}
                          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-800 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ShieldCheck size={15} /> {t("adminUsers.restore", { defaultValue: "Restore" })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy || isSelf || account.role === "admin"}
                          onClick={() => {
                            setSuspendAccount(account);
                            setSuspendDays("7");
                            setSuspendConfirmation("");
                          }}
                          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-black text-red-700 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ShieldOff size={15} /> {t("adminUsers.suspend", { defaultValue: "Suspend" })}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isBusy || (isSelf && account.role === "admin")}
                        onClick={() => setRole.mutate({ userId: account.id, role: account.role === "admin" ? "user" : "admin" })}
                        className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {account.role === "admin"
                          ? t("adminUsers.removeAdmin", { defaultValue: "Remove admin" })
                          : t("adminUsers.makeAdmin", { defaultValue: "Make admin" })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || account.role === "admin"}
                        onClick={() => setLifeAccess.mutate({ userId: account.id, enabled: !account.lifeAccess })}
                        className="min-h-11 rounded-xl px-3 text-sm font-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 rr-bg-gold rr-text-navy"
                      >
                        {account.lifeAccess
                          ? t("adminUsers.removeLife", { defaultValue: "Remove Life" })
                          : t("adminUsers.grantLife", { defaultValue: "Grant Life" })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setCombineSource(account);
                          setCombineTargetId("");
                          setCombineConfirmation("");
                        }}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-black text-blue-800 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Merge size={15} /> {t("adminUsers.combine", { defaultValue: "Combine" })}
                      </button>
                      <button
                        type="button"
                        data-testid={`retest-smtp-${account.id}`}
                        disabled={isBusy || !account.smtpConnected}
                        onClick={() => retestUserSmtp.mutate({ userId: account.id })}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-800 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {retestUserSmtp.isPending && retestUserSmtp.variables?.userId === account.id
                          ? <Loader2 className="animate-spin" size={15} />
                          : <RefreshCw size={15} />}
                        {t("adminUsers.retestSmtp", { defaultValue: "Re-test SMTP" })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !account.smtpConnected || !account.email}
                        onClick={() => {
                          setSmtpAccount(account);
                          setSmtpConfirmation("");
                        }}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-black text-amber-900 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Unplug size={15} /> {t("adminUsers.removeSmtp", { defaultValue: "Remove SMTP" })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || isSelf}
                        onClick={() => {
                          setDeleteAccount(account);
                          setDeleteConfirmation("");
                        }}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-black text-red-700 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Trash2 size={15} /> {t("adminUsers.delete", { defaultValue: "Delete" })}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {(directory.data?.users.length ?? 0) === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center font-semibold rr-text-navy-muted">{t("adminUsers.empty", { defaultValue: "No users match that search." })}</div>
            )}
          </div>
        )}

        {directory.data && directory.data.pageCount > 1 && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="flex min-h-11 items-center gap-1 rounded-xl px-3 font-black rr-text-navy disabled:opacity-40">
              <ChevronLeft size={18} /> {t("adminUsers.previous", { defaultValue: "Previous" })}
            </button>
            <span className="text-sm font-black rr-text-navy">{t("adminUsers.page", { defaultValue: "Page {{page}} of {{count}}", page, count: directory.data.pageCount })}</span>
            <button disabled={page >= directory.data.pageCount} onClick={() => setPage((value) => value + 1)} className="flex min-h-11 items-center gap-1 rounded-xl px-3 font-black rr-text-navy disabled:opacity-40">
              {t("adminUsers.next", { defaultValue: "Next" })} <ChevronRight size={18} />
            </button>
          </div>
        )}

        <section className="mt-7 rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="smtp-audit-title">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold"><ClipboardList size={19} /></div>
            <div>
              <h2 id="smtp-audit-title" className="text-lg font-black rr-text-navy">{t("adminUsers.smtpAuditTitle", { defaultValue: "SMTP removal audit log" })}</h2>
              <p className="text-sm font-semibold rr-text-navy-muted">{t("adminUsers.smtpAuditSubtitle", { defaultValue: "A durable record of who permanently removed user SMTP credentials and when." })}</p>
            </div>
            </div>
            <button
              type="button"
              data-testid="smtp-audit-export"
              disabled={!smtpAuditLogs.data?.total || smtpAuditExport.isFetching}
              onClick={exportAuditCsv}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 rr-bg-gold rr-text-navy"
            >
              {smtpAuditExport.isFetching ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {t("adminUsers.smtpAuditExport", { defaultValue: "Export filtered CSV" })}
            </button>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="smtp-audit-filters">
            <label className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">
              {t("adminUsers.smtpAuditFrom", { defaultValue: "From date" })}
              <input
                type="date"
                value={auditDateFrom}
                max={auditDateTo || undefined}
                onChange={(event) => setAuditDateFrom(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">
              {t("adminUsers.smtpAuditTo", { defaultValue: "To date" })}
              <input
                type="date"
                value={auditDateTo}
                min={auditDateFrom || undefined}
                onChange={(event) => setAuditDateTo(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">
              {t("adminUsers.smtpAuditAdministrator", { defaultValue: "Administrator" })}
              <select
                value={auditAdminId}
                onChange={(event) => setAuditAdminId(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">{t("adminUsers.smtpAuditAllAdministrators", { defaultValue: "All administrators" })}</option>
                {smtpAuditActors.data?.map((actor) => (
                  <option key={actor.id} value={String(actor.id)}>{actor.name || actor.email || `Admin #${actor.id}`}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-black uppercase tracking-wide rr-text-navy-muted">
              {t("adminUsers.smtpAuditOutcome", { defaultValue: "Outcome" })}
              <select
                value={auditOutcome}
                onChange={(event) => setAuditOutcome(event.target.value as SmtpAuditOutcomeFilter)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold normal-case tracking-normal rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">{t("adminUsers.smtpAuditAllOutcomes", { defaultValue: "All outcomes" })}</option>
                <option value="removed">{t("adminUsers.smtpAuditOutcomeRemoved", { defaultValue: "Removed" })}</option>
              </select>
            </label>
          </div>
          {(auditDateFrom || auditDateTo || auditAdminId !== "all" || auditOutcome !== "all") && (
            <button
              type="button"
              onClick={() => {
                setAuditDateFrom("");
                setAuditDateTo("");
                setAuditAdminId("all");
                setAuditOutcome("all");
              }}
              className="mt-3 text-sm font-black rr-text-navy underline decoration-amber-400 decoration-2 underline-offset-4"
            >
              {t("adminUsers.smtpAuditClearFilters", { defaultValue: "Clear audit filters" })}
            </button>
          )}

          {smtpAuditLogs.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin rr-text-navy" size={26} /></div>
          ) : smtpAuditLogs.error ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{smtpAuditLogs.error.message}</p>
          ) : smtpAuditLogs.data?.entries.length ? (
            <div className="mt-3 divide-y divide-slate-100" data-testid="smtp-audit-log">
              {smtpAuditLogs.data.entries.map((entry) => (
                <article key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-black rr-text-navy">
                      {entry.actorName || entry.actorEmail || `Admin #${entry.actorUserId}`}
                      <span className="font-semibold rr-text-navy-muted"> {t("adminUsers.smtpAuditRemoved", { defaultValue: "removed SMTP credentials for" })} </span>
                      {entry.targetName || entry.targetEmail || `User #${entry.targetUserId}`}
                    </p>
                    <p className="mt-1 break-all text-xs font-semibold rr-text-navy-muted">
                      {entry.actorEmail || `Admin #${entry.actorUserId}`} → {entry.targetEmail || `User #${entry.targetUserId}`} · {entry.smtpUser}
                    </p>
                  </div>
                  <time className="text-xs font-black rr-text-navy-mid" dateTime={new Date(entry.occurredAt).toISOString()}>
                    {new Date(entry.occurredAt).toLocaleString()}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm font-semibold rr-text-navy-muted">{t("adminUsers.smtpAuditEmpty", { defaultValue: "No SMTP credential removals have been recorded." })}</p>
          )}
          {smtpAuditLogs.data && smtpAuditLogs.data.pageCount > 1 && (
            <nav className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label={t("adminUsers.smtpAuditPagination", { defaultValue: "SMTP audit pages" })} data-testid="smtp-audit-pagination">
              <button type="button" disabled={smtpAuditLogs.data.page <= 1} onClick={() => setAuditPage((value) => Math.max(1, value - 1))} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-4 font-black rr-text-navy transition active:scale-[0.97] disabled:opacity-40">
                <ChevronLeft size={18} /> {t("adminUsers.previous", { defaultValue: "Previous" })}
              </button>
              <span className="text-center text-sm font-black rr-text-navy">{t("adminUsers.page", { defaultValue: "Page {{page}} of {{count}}", page: smtpAuditLogs.data.page, count: smtpAuditLogs.data.pageCount })}</span>
              <button type="button" disabled={smtpAuditLogs.data.page >= smtpAuditLogs.data.pageCount} onClick={() => setAuditPage((value) => Math.min(smtpAuditLogs.data?.pageCount ?? value, value + 1))} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-4 font-black rr-text-navy transition active:scale-[0.97] disabled:opacity-40">
                {t("adminUsers.next", { defaultValue: "Next" })} <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </section>
      </main>

      <Dialog open={newUserOpen} onOpenChange={(open) => {
        if (!open && !createUser.isPending) {
          setNewUserOpen(false);
          setNewUserName("");
          setNewUserEmail("");
        }
      }}>
        <DialogContent className="max-w-lg border-0 bg-white text-slate-950">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-900"><Plus size={22} /></div>
            <DialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.addUserTitle", { defaultValue: "Create a passwordless user" })}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-600">{t("adminUsers.addUserDescription", { defaultValue: "The user will sign in with a magic link. Administrators never create or manage a user password." })}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createUser.mutate({ name: newUserName.trim() || undefined, email: newUserEmail.trim() });
            }}
          >
            <label className="block text-sm font-black text-slate-900" htmlFor="new-user-name">
              {t("adminUsers.nameOptional", { defaultValue: "Name (optional)" })}
              <input id="new-user-name" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} autoComplete="name" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block text-sm font-black text-slate-900" htmlFor="new-user-email">
              {t("adminUsers.emailRequired", { defaultValue: "Email address" })}
              <input id="new-user-email" type="email" required value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} autoComplete="email" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <DialogFooter>
              <button type="button" disabled={createUser.isPending} onClick={() => setNewUserOpen(false)} className="min-h-10 rounded-md px-4 text-sm font-black text-slate-700 disabled:opacity-45">{t("common.cancel", { defaultValue: "Cancel" })}</button>
              <button type="submit" disabled={!newUserEmail.trim() || createUser.isPending} className="inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:cursor-not-allowed disabled:opacity-45">
                {createUser.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}{t("adminUsers.createPasswordless", { defaultValue: "Create account" })}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(accessAccount)} onOpenChange={(open) => {
        if (!open && !grantFlexibleAccess.isPending) setAccessAccount(null);
      }}>
        <DialogContent className="max-w-lg border-0 bg-white text-slate-950">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-900"><Crown size={22} /></div>
            <DialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.manageAccessTitle", { defaultValue: "Manage paid access" })}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-600">{t("adminUsers.manageAccessDescription", { defaultValue: "New time is added after any unused paid time. Calendar months and years preserve the matching calendar date where possible." })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold rr-text-navy">{accessAccount?.name || accessAccount?.email || t("adminUsers.user", { defaultValue: "User" })}</p>
            <label className="block text-sm font-black text-slate-900" htmlFor="access-kind">
              {t("adminUsers.accessType", { defaultValue: "Access type" })}
              <select id="access-kind" value={accessKind} onChange={(event) => setAccessKind(event.target.value as "months" | "years" | "lifetime")} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:ring-2 focus:ring-amber-400">
                <option value="months">{t("adminUsers.accessMonths", { defaultValue: "Grant months" })}</option>
                <option value="years">{t("adminUsers.accessYears", { defaultValue: "Grant years" })}</option>
                <option value="lifetime">{t("adminUsers.accessLifetime", { defaultValue: "Grant Life access" })}</option>
              </select>
            </label>
            {accessKind !== "lifetime" && (
              <label className="block text-sm font-black text-slate-900" htmlFor="access-quantity">
                {accessKind === "months" ? t("adminUsers.months", { defaultValue: "Months (1–120)" }) : t("adminUsers.years", { defaultValue: "Years (1–10)" })}
                <input id="access-quantity" type="number" min="1" max={accessKind === "months" ? 120 : 10} value={accessQuantity} onChange={(event) => setAccessQuantity(event.target.value)} inputMode="numeric" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-amber-400" />
              </label>
            )}
            {accessKind === "lifetime" && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-950">{t("adminUsers.lifeAccessNote", { defaultValue: "Life access does not expire and replaces any existing paid expiry." })}</p>}
            <DialogFooter>
              <button type="button" disabled={grantFlexibleAccess.isPending} onClick={() => setAccessAccount(null)} className="min-h-10 rounded-md px-4 text-sm font-black text-slate-700 disabled:opacity-45">{t("common.cancel", { defaultValue: "Cancel" })}</button>
              <button
                type="button"
                disabled={!accessAccount || grantFlexibleAccess.isPending || (accessKind !== "lifetime" && (!Number.isInteger(Number(accessQuantity)) || Number(accessQuantity) < 1 || Number(accessQuantity) > (accessKind === "months" ? 120 : 10)))}
                onClick={() => accessAccount && grantFlexibleAccess.mutate({ userId: accessAccount.id, kind: accessKind, quantity: accessKind === "lifetime" ? undefined : Number(accessQuantity) })}
                className="inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:cursor-not-allowed disabled:opacity-45"
              >
                {grantFlexibleAccess.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}{t("adminUsers.applyAccess", { defaultValue: "Apply access" })}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(suspendAccount)} onOpenChange={(open) => {
        if (!open && !suspendUser.isPending) {
          setSuspendAccount(null);
          setSuspendConfirmation("");
        }
      }}>
        <AlertDialogContent className="border-0 bg-white text-slate-950">
          <AlertDialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-red-100 text-red-700"><ShieldOff size={22} /></div>
            <AlertDialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.suspendTitle", { defaultValue: "Suspend this account?" })}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm font-medium text-slate-600">
              <span className="block">{t("adminUsers.suspendDescription", { defaultValue: "Suspension blocks protected activity immediately and revokes every active session for this user." })}</span>
              <span className="block font-black text-red-700">{t("adminUsers.suspendRecovery", { defaultValue: "You can restore the account later from this directory." })}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-sm font-black text-slate-900" htmlFor="suspend-days">
            {t("adminUsers.suspendDays", { defaultValue: "Suspend for days (1–3650)" })}
            <input id="suspend-days" type="number" min="1" max="3650" inputMode="numeric" value={suspendDays} onChange={(event) => setSuspendDays(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-red-400" />
          </label>
          <label className="block text-sm font-black text-slate-900" htmlFor="suspend-confirmation">
            {t("adminUsers.typeSuspend", { defaultValue: "Type SUSPEND to confirm" })}
            <input id="suspend-confirmation" value={suspendConfirmation} onChange={(event) => setSuspendConfirmation(event.target.value)} autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base font-black text-slate-950 outline-none focus:ring-2 focus:ring-red-400" />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspendUser.isPending}>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <button type="button" disabled={!suspendAccount || suspendConfirmation !== "SUSPEND" || !Number.isInteger(Number(suspendDays)) || Number(suspendDays) < 1 || Number(suspendDays) > 3650 || suspendUser.isPending} onClick={() => suspendAccount && suspendUser.mutate({ userId: suspendAccount.id, days: Number(suspendDays), confirmation: "SUSPEND" })} className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
              {suspendUser.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}{t("adminUsers.suspendNow", { defaultValue: "Suspend account" })}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(emailAccount)} onOpenChange={(open) => {
        if (!open && !sendUserEmail.isPending) setEmailAccount(null);
      }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-0 bg-white text-slate-950">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-blue-100 text-blue-800"><Send size={22} /></div>
            <DialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.emailTitle", { defaultValue: "Email user" })}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-600">{t("adminUsers.emailDescription", { defaultValue: "This general communication is sent from hello@getphame.app. Magic links are always sent from no-reply@getphame.app." })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold rr-text-navy">{emailAccount?.name || emailAccount?.email} · {emailAccount?.email}</p>
            <label className="block text-sm font-black text-slate-900" htmlFor="admin-email-template">
              {t("adminUsers.emailTemplate", { defaultValue: "Message starting point" })}
              <select id="admin-email-template" value={emailTemplate} onChange={(event) => {
                const next = event.target.value as "smtp_onboarding" | "custom";
                setEmailTemplate(next);
                if (next === "smtp_onboarding") {
                  const draft = buildSmtpOnboardingDraft(emailAccount?.name);
                  setEmailSubject(draft.subject);
                  setEmailBodyText(draft.bodyText);
                } else {
                  setEmailSubject("");
                  setEmailBodyText("");
                }
              }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-400">
                <option value="smtp_onboarding">{t("adminUsers.smtpTemplate", { defaultValue: "SMTP setup guide" })}</option>
                <option value="custom">{t("adminUsers.customTemplate", { defaultValue: "Custom message" })}</option>
              </select>
            </label>
            <label className="block text-sm font-black text-slate-900" htmlFor="admin-email-subject">
              {t("adminUsers.emailSubject", { defaultValue: "Subject" })}
              <input id="admin-email-subject" value={emailSubject} maxLength={180} onChange={(event) => setEmailSubject(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-blue-400" />
            </label>
            <label className="block text-sm font-black text-slate-900" htmlFor="admin-email-body">
              {t("adminUsers.emailBody", { defaultValue: "Message" })}
              <textarea id="admin-email-body" value={emailBodyText} maxLength={12000} onChange={(event) => setEmailBodyText(event.target.value)} rows={14} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-blue-400" />
            </label>
            <p className="text-xs font-semibold rr-text-navy-muted">{t("adminUsers.emailSecurityHint", { defaultValue: "Never ask a user to send passwords, app passwords, or verification codes by email. Sent mail is retained for 180 days in the user outbox." })}</p>
            <DialogFooter>
              <button type="button" disabled={sendUserEmail.isPending} onClick={() => setEmailAccount(null)} className="min-h-10 rounded-md px-4 text-sm font-black text-slate-700 disabled:opacity-45">{t("common.cancel", { defaultValue: "Cancel" })}</button>
              <button type="button" disabled={!emailAccount || !emailSubject.trim() || !emailBodyText.trim() || sendUserEmail.isPending} onClick={() => emailAccount && sendUserEmail.mutate({ userId: emailAccount.id, template: emailTemplate, subject: emailSubject, bodyText: emailBodyText })} className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-800 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                {sendUserEmail.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}{t("adminUsers.sendFromHello", { defaultValue: "Send from hello@getphame.app" })}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(outboxAccount)} onOpenChange={(open) => { if (!open) setOutboxAccount(null); }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-0 bg-white text-slate-950">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-slate-100 rr-text-navy"><ClipboardList size={22} /></div>
            <DialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.outboxTitle", { defaultValue: "Sent-mail outbox" })}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-600">{t("adminUsers.outboxDescription", { defaultValue: "Administrator emails sent to this user from hello@getphame.app. Records automatically expire after 180 days." })}</DialogDescription>
          </DialogHeader>
          {outbox.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin rr-text-navy" size={26} /></div>
          ) : outbox.error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{outbox.error.message}</p>
          ) : outbox.data?.entries.length ? (
            <div className="space-y-3">
              {outbox.data.entries.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black rr-text-navy">{entry.subject}</p>
                      <p className="mt-1 text-xs font-semibold rr-text-navy-muted">{entry.fromEmail} → {entry.recipientEmail} · {new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${entry.status === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{entry.status === "sent" ? t("adminUsers.sent", { defaultValue: "Sent" }) : t("adminUsers.failed", { defaultValue: "Not confirmed" })}</span>
                  </div>
                  {entry.status !== "sent" && entry.failureCode && <p className="mt-2 text-xs font-bold text-red-700">{t("adminUsers.deliveryFailure", { defaultValue: "Delivery status: {{code}}", code: entry.failureCode })}</p>}
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs font-medium leading-5 rr-text-navy">{entry.bodyText}</pre>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm font-semibold rr-text-navy-muted">{t("adminUsers.outboxEmpty", { defaultValue: "No administrator email has been recorded for this user." })}</p>
          )}
          <DialogFooter><button type="button" onClick={() => setOutboxAccount(null)} className="min-h-10 rounded-md px-4 text-sm font-black rr-text-navy">{t("common.cancel", { defaultValue: "Cancel" })}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteAccount)} onOpenChange={(open) => {
        if (!open && !deleteUser.isPending) {
          setDeleteAccount(null);
          setDeleteConfirmation("");
        }
      }}>
        <AlertDialogContent className="border-0 bg-white text-slate-950">
          <AlertDialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle size={22} /></div>
            <AlertDialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.deleteTitle", { defaultValue: "Delete this account?" })}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm font-medium text-slate-600">
              <span className="block">
                {t("adminUsers.deleteDescription", {
                  defaultValue: "This permanently deletes {{name}} and all linked contacts, requests, integrations, settings, analytics, and history.",
                  name: deleteAccount?.name || deleteAccount?.email || "this account",
                })}
              </span>
              <span className="block font-black text-red-700">{t("adminUsers.deleteIrreversible", { defaultValue: "This cannot be undone. Combine duplicate accounts instead if data should be preserved." })}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="text-sm font-black text-slate-900" htmlFor="delete-account-confirmation">
            {t("adminUsers.typeDelete", { defaultValue: "Type DELETE to confirm" })}
          </label>
          <input
            id="delete-account-confirmation"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            autoComplete="off"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-base font-black text-slate-950 outline-none focus:ring-2 focus:ring-red-400"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <button
              type="button"
              disabled={deleteConfirmation !== "DELETE" || !deleteAccount || deleteUser.isPending}
              onClick={() => deleteAccount && deleteUser.mutate({ userId: deleteAccount.id, confirmation: "DELETE" })}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {deleteUser.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}
              {t("adminUsers.deleteForever", { defaultValue: "Delete permanently" })}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(smtpAccount)} onOpenChange={(open) => {
        if (!open && !removeUserSmtp.isPending) {
          setSmtpAccount(null);
          setSmtpConfirmation("");
        }
      }}>
        <AlertDialogContent className="border-0 bg-white text-slate-950">
          <AlertDialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-900"><Unplug size={22} /></div>
            <AlertDialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.removeSmtpTitle", { defaultValue: "Remove SMTP credentials?" })}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm font-medium text-slate-600">
              <span className="block">
                {t("adminUsers.removeSmtpDescription", {
                  defaultValue: "This permanently removes the SMTP host, username, encrypted password, sender details, and verification state for {{email}}.",
                  email: smtpAccount?.email || "this user",
                })}
              </span>
              <span className="block font-black text-amber-900">{t("adminUsers.removeSmtpPreservesAccount", { defaultValue: "The user account, contacts, requests, plan, and history are not deleted." })}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="text-sm font-black text-slate-900" htmlFor="remove-smtp-confirmation">
            {t("adminUsers.typeEmailToRemoveSmtp", { defaultValue: "Type {{email}} to confirm", email: smtpAccount?.email || "the user's email" })}
          </label>
          <input
            id="remove-smtp-confirmation"
            value={smtpConfirmation}
            onChange={(event) => setSmtpConfirmation(event.target.value)}
            autoComplete="off"
            inputMode="email"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-base font-black text-slate-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeUserSmtp.isPending}>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <button
              type="button"
              disabled={!smtpAccount || !matchesTypedEmail(smtpConfirmation, smtpAccount.email) || removeUserSmtp.isPending}
              onClick={() => smtpAccount && removeUserSmtp.mutate({ userId: smtpAccount.id, confirmationEmail: smtpConfirmation.trim() })}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-700 px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {removeUserSmtp.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}
              {t("adminUsers.removeSmtpPermanently", { defaultValue: "Remove SMTP permanently" })}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(combineSource)} onOpenChange={(open) => {
        if (!open && !combineAccounts.isPending) {
          setCombineSource(null);
          setCombineTargetId("");
          setCombineConfirmation("");
        }
      }}>
        <AlertDialogContent className="border-0 bg-white text-slate-950">
          <AlertDialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-blue-100 text-blue-800"><Merge size={22} /></div>
            <AlertDialogTitle className="text-xl font-black text-slate-950">{t("adminUsers.combineTitle", { defaultValue: "Combine duplicate accounts" })}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-600">
              {t("adminUsers.combineDescription", {
                defaultValue: "Everything owned by {{source}} will move to the surviving account. The source account is deleted after the transfer succeeds.",
                source: combineSource?.name || combineSource?.email || "the source account",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-black">{t("adminUsers.sourceDeleted", { defaultValue: "Source account — deleted" })}</p>
            <p className="truncate font-semibold">{combineSource?.name || "Unnamed user"} · {combineSource?.email || "No email"}</p>
          </div>

          <label className="text-sm font-black text-slate-900" htmlFor="combine-target">
            {t("adminUsers.chooseSurvivor", { defaultValue: "Surviving account" })}
          </label>
          <select
            id="combine-target"
            value={combineTargetId}
            onChange={(event) => setCombineTargetId(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">{mergeCandidates.isLoading ? "Loading accounts…" : "Choose the account that remains"}</option>
            {mergeCandidates.data?.users
              .filter((candidate) => candidate.id !== combineSource?.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name || "Unnamed user"} — {candidate.email || `Account #${candidate.id}`}{candidate.id === user.id ? " (you)" : ""}
                </option>
              ))}
          </select>

          {combineSource && combineTarget && (
            <div
              data-testid="combine-direction-preview"
              className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3 text-center text-sm text-blue-950"
            >
              <p className="font-black">{t("adminUsers.mergeDirection", { defaultValue: "Merge direction" })}</p>
              <p className="mt-2 truncate font-semibold">
                {combineSource.name || combineSource.email || `Account #${combineSource.id}`}
                <span className="ml-1 font-black text-red-700">({t("adminUsers.deletedAfterMerge", { defaultValue: "deleted" })})</span>
              </p>
              <ArrowDown aria-hidden="true" className="mx-auto my-1 text-blue-800" size={20} />
              <p className="truncate font-semibold">
                {combineTarget.name || combineTarget.email || `Account #${combineTarget.id}`}
                <span className="ml-1 font-black text-emerald-700">({t("adminUsers.survivesMerge", { defaultValue: "survives" })})</span>
              </p>
            </div>
          )}

          <p className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-950">
            {t("adminUsers.combineRules", { defaultValue: "The survivor keeps its login identity and strongest role/plan. Contacts, requests, templates, platforms, analytics, and history move over. When one SMTP connection is verified and the other is not, the verified connection is kept automatically. The merge still stops if both SMTP connections share the same verification state or if another billing or email-service conflict needs your choice." })}
          </p>

          <label className="text-sm font-black text-slate-900" htmlFor="combine-account-confirmation">
            {t("adminUsers.typeCombine", { defaultValue: "Type COMBINE to confirm" })}
          </label>
          <input
            id="combine-account-confirmation"
            value={combineConfirmation}
            onChange={(event) => setCombineConfirmation(event.target.value)}
            autoComplete="off"
            className="min-h-11 rounded-xl border border-slate-300 px-3 text-base font-black text-slate-950 outline-none focus:ring-2 focus:ring-blue-400"
          />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={combineAccounts.isPending}>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <button
              type="button"
              disabled={!combineSource || !combineTargetId || combineConfirmation !== "COMBINE" || combineAccounts.isPending}
              onClick={() => combineSource && combineAccounts.mutate({
                sourceUserId: combineSource.id,
                targetUserId: Number(combineTargetId),
                confirmation: "COMBINE",
              })}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-800 px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {combineAccounts.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}
              {t("adminUsers.combineNow", { defaultValue: "Combine accounts" })}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
