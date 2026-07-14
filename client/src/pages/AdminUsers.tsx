import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useDebounce } from "use-debounce";
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, Loader2, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";

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

  const refresh = () => utils.admin.listUsers.invalidate();
  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { toast.success(t("adminUsers.roleUpdated", { defaultValue: "Administrator access updated." })); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const setLifeAccess = trpc.admin.setLifeAccess.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled
        ? t("adminUsers.lifeGranted", { defaultValue: "Life access granted." })
        : t("adminUsers.lifeRemoved", { defaultValue: "Life access removed." }));
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  if (!user || user.role !== "admin") return null;

  const busyUserId = setRole.variables?.userId ?? setLifeAccess.variables?.userId;

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
        <p className="mt-1 text-sm font-semibold text-white/75">{t("adminUsers.subtitle", { defaultValue: "Search every account and control administrator or Life access." })}</p>
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
              const isBusy = busyUserId === account.id && (setRole.isPending || setLifeAccess.isPending);
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
                      <p className="mt-1 text-xs rr-text-navy-muted">
                        {t("adminUsers.accountMeta", {
                          defaultValue: "Joined {{date}} · Stored plan: {{tier}}",
                          date: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—",
                          tier: account.tier,
                        })}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
    </div>
  );
}
