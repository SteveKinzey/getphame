import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useDebounce } from "use-debounce";
import { AlertTriangle, ArrowDown, ArrowLeft, ChevronLeft, ChevronRight, Crown, Loader2, MailCheck, MailWarning, Merge, Search, ShieldCheck, Trash2, Unplug, Users } from "lucide-react";
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

export function matchesTypedEmail(confirmation: string, email: string | null | undefined) {
  return Boolean(email) && confirmation.trim().toLowerCase() === email!.trim().toLowerCase();
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  useEffect(() => setPage(1), [debouncedSearch]);

  const directory = trpc.admin.listUsers.useQuery(
    { query: debouncedSearch, page, pageSize },
    { enabled: user?.role === "admin" }
  );
  type DirectoryAccount = NonNullable<typeof directory.data>["users"][number];

  const [deleteAccount, setDeleteAccount] = useState<DirectoryAccount | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [combineSource, setCombineSource] = useState<DirectoryAccount | null>(null);
  const [combineTargetId, setCombineTargetId] = useState("");
  const [combineConfirmation, setCombineConfirmation] = useState("");
  const [smtpAccount, setSmtpAccount] = useState<DirectoryAccount | null>(null);
  const [smtpConfirmation, setSmtpConfirmation] = useState("");

  const mergeCandidates = trpc.admin.listUsers.useQuery(
    { query: "", page: 1, pageSize: 100 },
    { enabled: user?.role === "admin" && Boolean(combineSource) }
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
    },
    onError: (error) => toast.error(error.message),
  });

  if (!user || user.role !== "admin") return null;

  const busyUserId = setRole.variables?.userId
    ?? setLifeAccess.variables?.userId
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
        <h1 className="text-3xl font-black text-white">{t("adminUsers.title", { defaultValue: "Manage users" })}</h1>
        <p className="mt-1 text-sm font-semibold text-white/75">{t("adminUsers.subtitle", { defaultValue: "Search every account, combine duplicates, or control administrator and Life access." })}</p>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <label htmlFor="admin-user-search" className="text-sm font-black rr-text-navy">{t("adminUsers.searchLabel", { defaultValue: "Search users" })}</label>
          <div className="relative mt-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 rr-text-navy-muted" />
            <input
              id="admin-user-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("adminUsers.searchPlaceholder", { defaultValue: "Name or email" })}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-base rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
            />
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
            {directory.data?.users.map((account) => {
              const isSelf = account.id === user.id;
              const isBusy = busyUserId === account.id && (setRole.isPending || setLifeAccess.isPending || removeUserSmtp.isPending || deleteUser.isPending || combineAccounts.isPending);
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
                      </div>
                      <p className="mt-1 text-xs rr-text-navy-muted">
                        {t("adminUsers.accountMeta", {
                          defaultValue: "Joined {{date}} · Stored plan: {{tier}}",
                          date: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—",
                          tier: account.tier,
                        })}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
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

            {directory.data?.users.length === 0 && (
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
      </main>

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
