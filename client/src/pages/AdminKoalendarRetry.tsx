import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 20;

function formatDate(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminKoalendarRetryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();
  const failures = trpc.admin.listKoalendarFailures.useQuery(
    { page, pageSize: PAGE_SIZE },
    { enabled: user?.role === "admin" }
  );
  type Failure = NonNullable<typeof failures.data>["bookings"][number];
  const [selected, setSelected] = useState<Failure | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [navigate, user]);

  const retryImport = trpc.admin.retryKoalendarImport.useMutation({
    onSuccess: result => {
      if (result.outcome === "imported") {
        toast.success("Koalendar contact imported successfully.");
      } else if (result.outcome === "blocked") {
        toast.error(
          "Retry completed, but the account no longer has eligible Get Phame access."
        );
      } else if (result.outcome === "canceled") {
        toast.success(
          "The booking is canceled, so it was excluded from import."
        );
      } else {
        toast.error(
          result.error ||
            "The retry failed again. The queue now contains the latest error."
        );
      }
      setSelected(null);
      void utils.admin.listKoalendarFailures.invalidate();
    },
    onError: error => {
      toast.error(error.message);
      setSelected(null);
      void utils.admin.listKoalendarFailures.invalidate();
    },
  });

  if (!user || user.role !== "admin") return null;

  const total = failures.data?.total ?? 0;
  const pageCount = failures.data?.pageCount ?? 1;

  return (
    <div className="min-h-screen pb-32 rr-bg-cream-warm">
      <header className="rr-bg-navy px-5 pb-7 pt-10 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-white transition hover:bg-white/10 active:scale-[0.97]"
          >
            <ArrowLeft size={18} /> Administration
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] rr-text-gold">
                <ShieldCheck size={17} /> Admin only
              </div>
              <h1 className="text-3xl font-black sm:text-4xl">
                Koalendar recovery
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/75 sm:text-base">
                Review failed contact imports and safely retry one booking at a
                time. Retrying imports the contact only; it does not send a
                review request.
              </p>
            </div>
            <button
              type="button"
              data-testid="koalendar-failures-refresh"
              onClick={() => void failures.refetch()}
              disabled={failures.isFetching}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-gold px-4 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
            >
              {failures.isFetching ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              {failures.isFetching ? "Refreshing…" : "Refresh queue"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-5">
        <section
          className="grid gap-3 sm:grid-cols-3"
          aria-label="Koalendar failure summary"
        >
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-navy-muted">
              Needs attention
            </p>
            <p className="mt-2 text-3xl font-black rr-text-navy">{total}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:col-span-2">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-gold rr-text-navy">
                <AlertTriangle size={20} />
              </span>
              <div>
                <p className="font-black rr-text-navy">
                  Safe retry rules remain active
                </p>
                <p className="mt-1 text-sm font-semibold leading-5 rr-text-navy-muted">
                  Canceled bookings stay excluded, imported bookings cannot be
                  claimed twice, and paid-access checks run again before contact
                  creation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {failures.isLoading ? (
          <div
            className="flex min-h-48 items-center justify-center rounded-2xl bg-white shadow-sm"
            aria-label="Loading failed Koalendar imports"
          >
            <Loader2 className="animate-spin rr-text-gold" size={28} />
          </div>
        ) : failures.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">
            Unable to load the failed-import queue: {failures.error.message}
          </div>
        ) : failures.data?.bookings.length === 0 ? (
          <div
            className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm"
            data-testid="koalendar-failures-empty"
          >
            <CalendarClock className="mx-auto rr-text-gold" size={36} />
            <h2 className="mt-3 text-xl font-black rr-text-navy">
              No failed imports
            </h2>
            <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
              The Koalendar recovery queue is clear.
            </p>
          </div>
        ) : (
          <section className="space-y-3" aria-label="Failed Koalendar imports">
            {failures.data?.bookings.map(failure => {
              const isBusy =
                retryImport.isPending &&
                retryImport.variables?.bookingId === failure.id;
              return (
                <article
                  key={failure.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                  data-testid={`koalendar-failure-${failure.id}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                          <AlertTriangle size={13} /> Failed
                        </span>
                        <span className="rounded-full rr-bg-surface-darker px-2.5 py-1 text-xs font-black rr-text-navy">
                          Attempt {failure.attempts}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">
                            Get Phame account
                          </p>
                          <p className="mt-1 flex items-center gap-2 truncate text-sm font-black rr-text-navy">
                            <UserRound
                              size={16}
                              className="shrink-0 rr-text-gold"
                            />
                            {failure.accountName ||
                              failure.accountEmail ||
                              `Account #${failure.userId}`}
                          </p>
                          {failure.accountEmail && (
                            <p className="mt-1 truncate text-xs font-semibold rr-text-navy-muted">
                              {failure.accountEmail}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">
                            Invitee
                          </p>
                          <p className="mt-1 truncate text-sm font-black rr-text-navy">
                            {failure.inviteeName}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold rr-text-navy-muted">
                            {failure.inviteeEmail}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 text-xs font-semibold rr-text-navy-muted sm:grid-cols-2">
                        <p>
                          Ended:{" "}
                          <span className="rr-text-navy">
                            {formatDate(failure.endsAt)}
                          </span>
                        </p>
                        <p>
                          Reference:{" "}
                          <span className="break-all rr-text-navy">
                            {failure.bookingReference}
                          </span>
                        </p>
                      </div>
                      <div className="mt-4 rounded-xl bg-red-50 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
                          Latest error
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold leading-5 text-red-900">
                          {failure.lastError || "No error detail was recorded."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid={`retry-koalendar-${failure.id}`}
                      onClick={() => setSelected(failure)}
                      disabled={retryImport.isPending}
                      className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 lg:w-auto"
                    >
                      {isBusy ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <RotateCcw size={17} />
                      )}
                      {isBusy ? "Retrying…" : "Retry import"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {pageCount > 1 && (
          <nav
            className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm"
            aria-label="Koalendar failure pages"
          >
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={page <= 1 || failures.isFetching}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-black rr-text-navy disabled:opacity-40"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            <span className="text-sm font-bold rr-text-navy-muted">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(pageCount, value + 1))}
              disabled={page >= pageCount || failures.isFetching}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-black rr-text-navy disabled:opacity-40"
            >
              Next <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </main>

      <AlertDialog
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open && !retryImport.isPending) setSelected(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Retry this Koalendar import?</AlertDialogTitle>
            <AlertDialogDescription>
              Get Phame will claim this failed event, re-check cancellation and
              plan eligibility, then attempt contact import again. It will not
              send a review request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selected && (
            <div className="rounded-xl rr-bg-surface-darker p-3 text-sm font-bold rr-text-navy">
              {selected.inviteeName} · {selected.inviteeEmail}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retryImport.isPending}>
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              data-testid="confirm-koalendar-retry"
              onClick={() =>
                selected && retryImport.mutate({ bookingId: selected.id })
              }
              disabled={!selected || retryImport.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
            >
              {retryImport.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              {retryImport.isPending ? "Retrying…" : "Confirm retry"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
