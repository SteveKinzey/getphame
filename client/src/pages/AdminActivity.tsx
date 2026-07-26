// AdminActivity — Recent user logins with pagination and search
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useDebounce } from "use-debounce";
import { ArrowLeft, Activity, Clock, Shield, Loader2, ShieldAlert, Search, X, ChevronLeft, ChevronRight, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

function timeAgo(date: Date | string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

const NAV_BG = "oklch(0.22 0.09 260)";
const CARD_BG = "oklch(0.26 0.08 260)";
const BORDER = "oklch(0.32 0.08 260)";
const GOLD = "oklch(0.80 0.18 80)";
const LABEL = "oklch(0.75 0.05 260)";
const PAGE_SIZE = 25;

export default function AdminActivity() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [debouncedSearch] = useDebounce(searchInput, 300);

  const handleSearch = (v: string) => { setSearchInput(v); setPage(0); };

  const { data, isLoading, error } = trpc.admin.recentLogins.useQuery({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }, {
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  async function exportToCSV() {
    const rows = data?.rows ?? [];
    if (!rows.length) { toast.error("No data to export"); return; }
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 300)); // brief delay for UX
      const headers = ["Name", "Email", "Role", "Login Method", "Last Signed In", "Member Since"];
      const csv = [
        headers.join(","),
        ...rows.map(u => [
          `"${(u.name ?? "").replace(/"/g, '""')}"`,
          `"${(u.email ?? "").replace(/"/g, '""')}"`,
          u.role ?? "",
          u.loginMethod ?? "",
          u.lastSignedIn ? new Date(u.lastSignedIn).toISOString() : "",
          u.createdAt ? new Date(u.createdAt).toISOString() : "",
        ].join(","))
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phame-logins-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} login${rows.length !== 1 ? "s" : ""} to CSV`);
    } finally {
      setIsExporting(false);
    }
  }

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: NAV_BG }}>
        <ShieldAlert size={40} style={{ color: GOLD }} />
        <p className="text-white font-semibold">Admin access required</p>
        <button onClick={() => navigate("/")} className="text-sm underline" style={{ color: LABEL }}>Go home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: NAV_BG }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4" style={{ background: NAV_BG, borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => navigate("/admin")} className="flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90" style={{ background: CARD_BG }} aria-label="Back">
          <ArrowLeft size={18} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <Activity size={18} style={{ color: GOLD }} />
          <h1 className="text-lg font-bold text-white">Account Activity</h1>
        </div>
        <div className="ml-auto">
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "oklch(0.30 0.09 260)", color: GOLD }}>
            Live · 30s
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {/* Summary bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl mb-4" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data?.total ?? "—"}</p>
            <p className="text-xs" style={{ color: LABEL }}>Total users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data?.rows.filter(u => { const d = u.lastSignedIn ? new Date(u.lastSignedIn) : null; return d && Date.now() - d.getTime() < 24 * 60 * 60 * 1000; }).length ?? "—"}
            </p>
            <p className="text-xs" style={{ color: LABEL }}>Last 24h</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data?.rows.filter(u => { const d = u.lastSignedIn ? new Date(u.lastSignedIn) : null; return d && Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000; }).length ?? "—"}
            </p>
            <p className="text-xs" style={{ color: LABEL }}>Last 7d</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data?.rows.filter(u => u.role === "admin").length ?? "—"}</p>
            <p className="text-xs" style={{ color: LABEL }}>Admins</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
        </div>
        {/* Date range filter */}
        <div className="flex gap-2 mb-4 items-center">
          <Calendar size={14} style={{ color: LABEL, flexShrink: 0 }} />
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0); }}
            className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}`, colorScheme: "dark" }}
          />
          <span className="text-xs" style={{ color: LABEL }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0); }}
            className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}`, colorScheme: "dark" }}
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(0); }} title="Clear dates">
              <X size={14} style={{ color: LABEL }} />
            </button>
          )}
        </div>
        <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: LABEL }} />
          <input
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          />
          {searchInput && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70">
              <X size={14} style={{ color: LABEL }} />
            </button>
          )}
        </div>
        <button
          onClick={exportToCSV}
          disabled={!data?.rows.length || isExporting}
          title="Export to CSV"
          className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-all active:scale-95 disabled:opacity-30"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: GOLD }}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        </button>
        </div>

        {/* Login list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
          </div>
        ) : error ? (
          <div className="text-center py-16" style={{ color: LABEL }}><p>Failed to load activity data</p></div>
        ) : data?.rows.length === 0 ? (
          <div className="text-center py-16" style={{ color: LABEL }}>
            <p>{debouncedSearch ? `No results for "${debouncedSearch}"` : "No logins yet"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.rows.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0" style={{ background: "oklch(0.30 0.09 260)", color: GOLD }}>
                  {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">{u.name ?? "(no name)"}</p>
                    {u.role === "admin" && <Shield size={12} style={{ color: GOLD }} />}
                  </div>
                  <p className="text-xs truncate" style={{ color: LABEL }}>{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "oklch(0.30 0.09 260)", color: "white" }}>
                    {u.loginMethod === "google" ? "Google" : u.loginMethod === "apple" ? "Apple" : "Email"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock size={10} style={{ color: LABEL }} />
                    <span className="text-xs" style={{ color: LABEL }}>{timeAgo(u.lastSignedIn)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
              style={{ background: CARD_BG, color: "white", border: `1px solid ${BORDER}` }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-sm font-semibold" style={{ color: LABEL }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
              style={{ background: CARD_BG, color: "white", border: `1px solid ${BORDER}` }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
