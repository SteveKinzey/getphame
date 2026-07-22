import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Activity, AlertCircle, ArrowLeft, BellRing, Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Columns3, Copy, Download, FileSearch, Filter, Gauge, GripVertical, KeyRound, Loader2, MailCheck, Pencil, RefreshCw, Save, Search, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT, AUTH_HEALTH_HISTORY_RELATIVE_DAYS, AUTH_HEALTH_HISTORY_REORDER_UNDO_SHORTCUT, clearAllAuthHealthHistoryFilters, clearAuthHealthHistoryFilter, getActiveAuthHealthHistoryFilterChips, getAuthHealthHistoryCsvColumnsStorageKey, getRelativeAuthHealthHistoryDateInputs, parseStoredAuthHealthHistoryCsvColumns, serializeStoredAuthHealthHistoryCsvColumns, shouldClearAuthHealthHistoryFiltersFromShortcut, shouldUndoAuthHealthHistoryPresetReorderFromShortcut } from "../../../shared/authHealthHistoryRanges";

type HealthValue = "ok" | "fail";

const eventLabels: Record<string, string> = {
  token_created: "Token created",
  provider_accepted: "Provider accepted",
  provider_failed: "Provider failed",
  verification_success: "Verification succeeded",
  verification_failed: "Verification failed",
};

function StatusPill({ value }: { value: HealthValue | string }) {
  const ok = value === "ok";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold" style={{ background: ok ? "oklch(0.94 0.05 145)" : "oklch(0.96 0.04 27)", color: ok ? "oklch(0.40 0.14 145)" : "oklch(0.48 0.17 27)" }}>
      {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {ok ? "Healthy" : "Needs attention"}
    </span>
  );
}

function formatDate(value: number | Date | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function localDateStartMs(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

function localDateEndMs(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

function msToLocalDateInput(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function writeTextToClipboard(text: string) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy was not available.");
}

type SortableHistoryPreset = { id: number; name: string };

type AuthHealthHistoryExportColumnKey =
  | "recordId"
  | "checkedAtUtc"
  | "triggerSource"
  | "overallStatus"
  | "configStatus"
  | "databaseStatus"
  | "userSchemaStatus"
  | "magicLinkSchemaStatus"
  | "sessionStatus"
  | "emailProviderStatus"
  | "providerName"
  | "failureCode"
  | "failureDetailSanitized"
  | "durationMs";

type AuthHealthHistoryCsvRequest = {
  status?: "ok" | "fail";
  triggerSource?: "scheduled" | "manual";
  fromMs?: number;
  toMs?: number;
  fromDate?: string;
  toDate?: string;
};

type AuthHealthHistoryCsvPreview = {
  filename: string;
  mimeType: string;
  csv: string;
  clipboardText: string;
  generatedAt: number;
  snapshotToMs: number;
  rowCount: number;
  totalMatching: number;
  truncated: boolean;
  availableColumns: Array<{ key: AuthHealthHistoryExportColumnKey; csvHeader: string }>;
  searchRows: Array<Record<AuthHealthHistoryExportColumnKey, string>>;
  preview: {
    columns: Array<{ key: AuthHealthHistoryExportColumnKey; csvHeader: string }>;
    rows: Array<Record<string, string>>;
    rowCount: number;
    limit: number;
    truncated: boolean;
  };
};

function readStoredCsvColumns(userId: string | number | null | undefined, availableColumns: AuthHealthHistoryExportColumnKey[]) {
  if (userId === null || userId === undefined) return [...availableColumns];
  try {
    return parseStoredAuthHealthHistoryCsvColumns(
      window.localStorage.getItem(getAuthHealthHistoryCsvColumnsStorageKey(userId)),
      availableColumns,
    ) as AuthHealthHistoryExportColumnKey[];
  } catch {
    return [...availableColumns];
  }
}

function rememberCsvColumns(
  userId: string | number | null | undefined,
  selectedColumns: AuthHealthHistoryExportColumnKey[],
  availableColumns: AuthHealthHistoryExportColumnKey[],
) {
  if (userId === null || userId === undefined) return false;
  try {
    window.localStorage.setItem(
      getAuthHealthHistoryCsvColumnsStorageKey(userId),
      serializeStoredAuthHealthHistoryCsvColumns(selectedColumns, availableColumns),
    );
    return true;
  } catch {
    return false;
  }
}

type PresetReorderFeedback = {
  kind: "saved" | "undone";
  presetId: number;
  presetName: string;
  position: number;
  total: number;
  previousOrderedIds: number[];
};

function SortablePresetControl({ preset, disabled, reorderSucceeded, onApply, onRename, onDuplicate, onDelete }: {
  preset: SortableHistoryPreset;
  disabled: boolean;
  reorderSucceeded: boolean;
  onApply: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: preset.id });
  return (
    <div
      ref={setNodeRef}
      className={`relative inline-flex max-w-full items-center rounded-full border bg-white shadow-sm ${reorderSucceeded ? "ring-2 ring-emerald-500/30" : ""}`}
      style={{ borderColor: isDragging ? "oklch(0.80 0.18 80)" : "oklch(0.86 0.04 260)", transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.72 : 1, zIndex: isDragging ? 10 : undefined }}
    >
      <span aria-hidden="true" className={`pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm motion-safe:transition-[opacity,transform] motion-safe:duration-200 ${reorderSucceeded ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}><CheckCircle2 size={12} /></span>
      <button
        type="button"
        className="flex min-h-10 min-w-10 touch-none items-center justify-center border-r rr-text-navy-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{ borderColor: "oklch(0.90 0.02 260)" }}
        aria-label={`Reorder ${preset.name}`}
        title="Drag to reorder, or press Space then use the arrow keys"
        {...attributes}
        {...listeners}
      ><GripVertical size={14} aria-hidden="true" /></button>
      <button type="button" onClick={onApply} className="min-h-10 truncate px-3 py-2 text-xs font-bold rr-text-navy" title={`Apply ${preset.name}`}>{preset.name}</button>
      <button type="button" onClick={onRename} className="min-h-10 border-l px-2 py-2 rr-text-navy-muted" style={{ borderColor: "oklch(0.90 0.02 260)" }} aria-label={`Rename ${preset.name}`}><Pencil size={12} /></button>
      <button type="button" onClick={onDuplicate} disabled={disabled} className="min-h-10 border-l px-2 py-2 rr-text-navy-muted disabled:opacity-50" style={{ borderColor: "oklch(0.90 0.02 260)" }} aria-label={`Duplicate ${preset.name}`} title="Duplicate preset"><Copy size={12} /></button>
      <button type="button" onClick={onDelete} disabled={disabled} className="min-h-10 border-l px-2 py-2 disabled:opacity-50" style={{ borderColor: "oklch(0.90 0.02 260)", color: "oklch(0.48 0.17 27)" }} aria-label={`Delete ${preset.name}`}><Trash2 size={12} /></button>
    </div>
  );
}

export default function AdminAuthDiagnosticsPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [emailInput, setEmailInput] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [outcome, setOutcome] = useState<"all" | "ok" | "fail">("all");
  const [days, setDays] = useState(7);
  const [manualHealthResult, setManualHealthResult] = useState<{
    overallStatus: string;
    checkedAt: number;
    durationMs: number;
    failureCode?: string | null;
    failureDetail?: string | null;
  } | null>(null);
  const [manualHealthError, setManualHealthError] = useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = useState<"all" | "ok" | "fail">("all");
  const [historyTriggerSource, setHistoryTriggerSource] = useState<"all" | "scheduled" | "manual">("all");
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<10 | 20 | 50>(20);
  const [presetName, setPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [presetReorderFeedback, setPresetReorderFeedback] = useState<PresetReorderFeedback | null>(null);
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<AuthHealthHistoryCsvPreview | null>(null);
  const [csvPreviewRequest, setCsvPreviewRequest] = useState<AuthHealthHistoryCsvRequest | null>(null);
  const [selectedCsvColumns, setSelectedCsvColumns] = useState<AuthHealthHistoryExportColumnKey[]>([]);
  const [csvRowSearch, setCsvRowSearch] = useState("");
  const [csvColumnPreferenceStatus, setCsvColumnPreferenceStatus] = useState<"idle" | "saved" | "unavailable">("idle");
  const [csvCopyStatus, setCsvCopyStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const presetReorderFeedbackTimerRef = useRef<number | null>(null);
  const csvCopyFeedbackTimerRef = useRef<number | null>(null);
  const csvInitialPreferenceAppliedRef = useRef(false);
  const trpcUtils = trpc.useUtils();

  const normalizedCsvRowSearch = csvRowSearch.trim().toLocaleLowerCase();
  const matchingCsvRows = useMemo(() => {
    if (!csvPreview) return [];
    if (!normalizedCsvRowSearch) return csvPreview.searchRows;
    return csvPreview.searchRows.filter((row) => csvPreview.preview.columns.some((column) =>
      row[column.key].toLocaleLowerCase().includes(normalizedCsvRowSearch),
    ));
  }, [csvPreview, normalizedCsvRowSearch]);
  const visibleCsvRows = matchingCsvRows.slice(0, csvPreview?.preview.limit ?? 25);

  const historyFromMs = useMemo(() => localDateStartMs(historyFromDate), [historyFromDate]);
  const historyToMs = useMemo(() => localDateEndMs(historyToDate), [historyToDate]);
  const historyDateError = historyFromMs !== undefined && historyToMs !== undefined
    ? historyFromMs > historyToMs
      ? "The end date must not be before the start date."
      : historyToMs - historyFromMs > 366 * 24 * 60 * 60 * 1000
        ? "Choose a date range of 366 days or less."
        : null
    : null;

  const applyHistoryFilterState = useCallback((state: { status: "all" | "ok" | "fail"; triggerSource: "all" | "scheduled" | "manual"; from: string; to: string; page: number }) => {
    setHistoryStatus(state.status);
    setHistoryTriggerSource(state.triggerSource);
    setHistoryFromDate(state.from);
    setHistoryToDate(state.to);
    setHistoryPage(state.page);
  }, []);

  const clearAllHistoryFilters = useCallback(() => {
    applyHistoryFilterState(clearAllAuthHealthHistoryFilters());
  }, [applyHistoryFilterState]);

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/");
  }, [loading, user, navigate]);

  const queryInput = useMemo(() => ({
    email: emailFilter || undefined,
    outcome: outcome === "all" ? undefined : outcome,
    days,
    limit: 75,
  }), [emailFilter, outcome, days]);

  const { data, error, isLoading, isFetching, refetch: refetchDashboard } = trpc.authDiagnostics.dashboard.useQuery(queryInput, {
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
  });

  const historyQueryInput = useMemo(() => ({
    status: historyStatus === "all" ? undefined : historyStatus,
    triggerSource: historyTriggerSource === "all" ? undefined : historyTriggerSource,
    fromMs: historyFromMs,
    toMs: historyToMs,
    page: historyPage,
    pageSize: historyPageSize,
  }), [historyStatus, historyTriggerSource, historyFromMs, historyToMs, historyPage, historyPageSize]);

  const historyExportInput = useMemo(() => ({
    status: historyStatus === "all" ? undefined : historyStatus,
    triggerSource: historyTriggerSource === "all" ? undefined : historyTriggerSource,
    fromMs: historyFromMs,
    toMs: historyToMs,
    fromDate: historyFromDate || undefined,
    toDate: historyToDate || undefined,
  }), [historyStatus, historyTriggerSource, historyFromMs, historyToMs, historyFromDate, historyToDate]);

  const healthHistoryQuery = trpc.authDiagnostics.healthHistory.useQuery(historyQueryInput, {
    enabled: user?.role === "admin" && !historyDateError,
  });

  const presetsQuery = trpc.authDiagnostics.healthHistoryPresets.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const historyPresets = presetsQuery.data ?? [];
  const presetSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const historySectionRequested = window.location.hash === "#health-history"
      || new URLSearchParams(window.location.search).get("section") === "health-history";
    if (loading || isLoading || healthHistoryQuery.isLoading || presetsQuery.isLoading || user?.role !== "admin" || !historySectionRequested) return;
    let nestedFrame = 0;
    const scrollToHistory = () => document.getElementById("health-history")?.scrollIntoView({ block: "start" });
    const frame = window.requestAnimationFrame(() => {
      nestedFrame = window.requestAnimationFrame(scrollToHistory);
    });
    const retries = [180, 600, 1_200].map((delay) => window.setTimeout(scrollToHistory, delay));
    const layoutObserver = new ResizeObserver(scrollToHistory);
    layoutObserver.observe(document.documentElement);
    const observerTimeout = window.setTimeout(() => layoutObserver.disconnect(), 5_000);
    return () => {
      window.cancelAnimationFrame(frame);
      if (nestedFrame) window.cancelAnimationFrame(nestedFrame);
      retries.forEach((retry) => window.clearTimeout(retry));
      window.clearTimeout(observerTimeout);
      layoutObserver.disconnect();
    };
  }, [loading, isLoading, healthHistoryQuery.isLoading, presetsQuery.isLoading, user?.role]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!shouldClearAuthHealthHistoryFiltersFromShortcut(event)) return;
      event.preventDefault();
      clearAllHistoryFilters();
      toast.success(t("adminAuthDiagnostics.clearFilters.cleared", { defaultValue: "History filters cleared." }));
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [clearAllHistoryFilters, t]);

  useEffect(() => () => {
    if (presetReorderFeedbackTimerRef.current) window.clearTimeout(presetReorderFeedbackTimerRef.current);
    if (csvCopyFeedbackTimerRef.current) window.clearTimeout(csvCopyFeedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if (healthHistoryQuery.data && healthHistoryQuery.data.page !== historyPage) {
      setHistoryPage(healthHistoryQuery.data.page);
    }
  }, [healthHistoryQuery.data?.page, historyPage]);

  const prepareHealthHistoryExport = trpc.authDiagnostics.exportHealthHistoryCsv.useMutation({
    onSuccess: (result) => {
      setCsvPreview(result);
      const selectedColumns = result.preview.columns.map((column) => column.key);
      setSelectedCsvColumns(selectedColumns);
      if (csvInitialPreferenceAppliedRef.current) {
        setCsvColumnPreferenceStatus(rememberCsvColumns(user?.id, selectedColumns, result.availableColumns.map((column) => column.key)) ? "saved" : "unavailable");
      }
      setCsvCopyStatus("idle");
    },
    onError: () => {
      setSelectedCsvColumns(csvPreview?.preview.columns.map((column) => column.key) ?? []);
    },
  });

  useEffect(() => {
    if (!csvPreview || !csvPreviewRequest || csvInitialPreferenceAppliedRef.current || prepareHealthHistoryExport.isPending) return;
    csvInitialPreferenceAppliedRef.current = true;
    const availableColumns = csvPreview.availableColumns.map((column) => column.key);
    const preferredColumns = readStoredCsvColumns(user?.id, availableColumns);
    const currentColumns = csvPreview.preview.columns.map((column) => column.key);
    if (preferredColumns.length === currentColumns.length && preferredColumns.every((column, index) => column === currentColumns[index])) {
      setCsvColumnPreferenceStatus(rememberCsvColumns(user?.id, preferredColumns, availableColumns) ? "saved" : "unavailable");
      return;
    }
    setSelectedCsvColumns(preferredColumns);
    setCsvCopyStatus("idle");
    prepareHealthHistoryExport.reset();
    prepareHealthHistoryExport.mutate({
      ...csvPreviewRequest,
      columns: preferredColumns,
      snapshotGeneratedAt: csvPreview.generatedAt,
    });
  }, [csvPreview, csvPreviewRequest, prepareHealthHistoryExport.isPending, user?.id]);

  const openHealthHistoryCsvPreview = () => {
    const request = { ...historyExportInput };
    setCsvPreviewOpen(true);
    setCsvPreview(null);
    setCsvPreviewRequest(request);
    setSelectedCsvColumns([]);
    setCsvRowSearch("");
    setCsvColumnPreferenceStatus("idle");
    setCsvCopyStatus("idle");
    csvInitialPreferenceAppliedRef.current = false;
    prepareHealthHistoryExport.reset();
    prepareHealthHistoryExport.mutate(request);
  };

  const updateCsvColumnSelection = (columns: AuthHealthHistoryExportColumnKey[]) => {
    if (!csvPreview || !csvPreviewRequest || columns.length === 0 || prepareHealthHistoryExport.isPending) return;
    setSelectedCsvColumns(columns);
    setCsvCopyStatus("idle");
    prepareHealthHistoryExport.reset();
    prepareHealthHistoryExport.mutate({ ...csvPreviewRequest, columns, snapshotGeneratedAt: csvPreview.generatedAt });
  };

  const toggleCsvColumn = (column: AuthHealthHistoryExportColumnKey) => {
    const selected = selectedCsvColumns.includes(column);
    if (selected && selectedCsvColumns.length === 1) return;
    updateCsvColumnSelection(selected
      ? selectedCsvColumns.filter((key) => key !== column)
      : [...selectedCsvColumns, column]);
  };

  const copyHealthHistoryCsv = async () => {
    if (!csvPreview || csvPreview.rowCount === 0 || prepareHealthHistoryExport.isPending) return;
    if (csvCopyFeedbackTimerRef.current) window.clearTimeout(csvCopyFeedbackTimerRef.current);
    setCsvCopyStatus("copying");
    try {
      await writeTextToClipboard(csvPreview.clipboardText);
      setCsvCopyStatus("copied");
      toast.success(t("adminAuthDiagnostics.csvPreview.copied", {
        defaultValue: "Copied {{count}} sanitized health records.",
        count: csvPreview.rowCount,
      }));
      csvCopyFeedbackTimerRef.current = window.setTimeout(() => setCsvCopyStatus("idle"), 3_200);
    } catch {
      setCsvCopyStatus("error");
      toast.error(t("adminAuthDiagnostics.csvPreview.copyError", { defaultValue: "The CSV data could not be copied. Try downloading it instead." }));
    }
  };

  const downloadHealthHistoryCsv = () => {
    if (!csvPreview) return;
    const blob = new Blob([csvPreview.csv], { type: csvPreview.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = csvPreview.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t("adminAuthDiagnostics.csvPreview.downloaded", {
      defaultValue: "Downloaded {{count}} sanitized health records.",
      count: csvPreview.rowCount,
    }));
    setCsvPreviewOpen(false);
    setCsvPreview(null);
    setCsvPreviewRequest(null);
    setSelectedCsvColumns([]);
    setCsvRowSearch("");
    setCsvColumnPreferenceStatus("idle");
    setCsvCopyStatus("idle");
    csvInitialPreferenceAppliedRef.current = false;
    prepareHealthHistoryExport.reset();
  };

  const saveHealthHistoryPreset = trpc.authDiagnostics.saveHealthHistoryPreset.useMutation({
    onSuccess: async (result) => {
      await trpcUtils.authDiagnostics.healthHistoryPresets.invalidate();
      toast.success(result.created ? "Filter preset saved." : editingPresetId ? "Filter preset renamed." : "Filter preset updated.");
      setPresetName("");
      setEditingPresetId(null);
    },
    onError: (saveError) => toast.error(saveError.message || "Filter preset could not be saved."),
  });

  const deleteHealthHistoryPreset = trpc.authDiagnostics.deleteHealthHistoryPreset.useMutation({
    onSuccess: async (_result, input) => {
      await trpcUtils.authDiagnostics.healthHistoryPresets.invalidate();
      if (editingPresetId === input.id) {
        setEditingPresetId(null);
        setPresetName("");
      }
      toast.success("Filter preset deleted.");
    },
    onError: (deleteError) => toast.error(deleteError.message || "Filter preset could not be deleted."),
  });

  const duplicateHealthHistoryPreset = trpc.authDiagnostics.duplicateHealthHistoryPreset.useMutation({
    onSuccess: async (result) => {
      await trpcUtils.authDiagnostics.healthHistoryPresets.invalidate();
      const preset = result.preset;
      setHistoryStatus(preset.status === "ok" || preset.status === "fail" ? preset.status : "all");
      setHistoryTriggerSource(preset.triggerSource === "scheduled" || preset.triggerSource === "manual" ? preset.triggerSource : "all");
      setHistoryFromDate(msToLocalDateInput(preset.fromMs));
      setHistoryToDate(msToLocalDateInput(preset.toMs));
      setPresetName(preset.name);
      setEditingPresetId(null);
      setHistoryPage(1);
      toast.success(`Duplicated “${preset.name}”. Adjust the active filters, then save to update the copy.`);
    },
    onError: (duplicateError) => toast.error(duplicateError.message || "Filter preset could not be duplicated."),
  });

  const reorderHealthHistoryPresets = trpc.authDiagnostics.reorderHealthHistoryPresets.useMutation({
    onMutate: async ({ orderedIds }) => {
      await trpcUtils.authDiagnostics.healthHistoryPresets.cancel();
      const previous = trpcUtils.authDiagnostics.healthHistoryPresets.getData();
      if (previous) {
        const byId = new Map(previous.map((preset) => [preset.id, preset]));
        trpcUtils.authDiagnostics.healthHistoryPresets.setData(undefined, orderedIds.map((id) => byId.get(id)).filter((preset): preset is NonNullable<typeof preset> => Boolean(preset)));
      }
      return { previous };
    },
    onError: (reorderError, _input, context) => {
      if (context?.previous) trpcUtils.authDiagnostics.healthHistoryPresets.setData(undefined, context.previous);
      setPresetReorderFeedback(null);
      toast.error(reorderError.message || "Preset order could not be saved.");
    },
    onSettled: () => trpcUtils.authDiagnostics.healthHistoryPresets.invalidate(),
  });

  const undoHealthHistoryPresetReorder = trpc.authDiagnostics.reorderHealthHistoryPresets.useMutation({
    onMutate: async ({ orderedIds }) => {
      await trpcUtils.authDiagnostics.healthHistoryPresets.cancel();
      const previous = trpcUtils.authDiagnostics.healthHistoryPresets.getData();
      if (previous) {
        const byId = new Map(previous.map((preset) => [preset.id, preset]));
        trpcUtils.authDiagnostics.healthHistoryPresets.setData(undefined, orderedIds.map((id) => byId.get(id)).filter((preset): preset is NonNullable<typeof preset> => Boolean(preset)));
      }
      return { previous };
    },
    onError: (undoError, _input, context) => {
      if (context?.previous) trpcUtils.authDiagnostics.healthHistoryPresets.setData(undefined, context.previous);
      toast.error(t("adminAuthDiagnostics.presets.undoError", { defaultValue: "The previous preset order could not be restored." }));
    },
    onSettled: () => trpcUtils.authDiagnostics.healthHistoryPresets.invalidate(),
  });

  const handleUndoPresetReorder = () => {
    const feedback = presetReorderFeedback;
    if (!feedback || feedback.kind !== "saved" || undoHealthHistoryPresetReorder.isPending) return;
    if (presetReorderFeedbackTimerRef.current) window.clearTimeout(presetReorderFeedbackTimerRef.current);
    undoHealthHistoryPresetReorder.mutate({ orderedIds: feedback.previousOrderedIds }, {
      onSuccess: () => {
        setPresetReorderFeedback({ ...feedback, kind: "undone", previousOrderedIds: [] });
        toast.success(t("adminAuthDiagnostics.presets.undoSucceeded", { defaultValue: "Preset order restored." }));
        presetReorderFeedbackTimerRef.current = window.setTimeout(() => setPresetReorderFeedback(null), 3_200);
      },
      onError: () => {
        presetReorderFeedbackTimerRef.current = window.setTimeout(() => setPresetReorderFeedback(null), 8_000);
      },
    });
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const canUndo = presetReorderFeedback?.kind === "saved" && !undoHealthHistoryPresetReorder.isPending;
      if (!shouldUndoAuthHealthHistoryPresetReorderFromShortcut(event, canUndo)) return;
      event.preventDefault();
      handleUndoPresetReorder();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [presetReorderFeedback, undoHealthHistoryPresetReorder.isPending]);

  const handlePresetDragEnd = useCallback((event: DragEndEvent) => {
    const activeId = Number(event.active.id);
    const overId = event.over ? Number(event.over.id) : activeId;
    if (activeId === overId) return;
    const oldIndex = historyPresets.findIndex((preset) => preset.id === activeId);
    const newIndex = historyPresets.findIndex((preset) => preset.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const movedPreset = historyPresets[oldIndex];
    const previousOrderedIds = historyPresets.map((preset) => preset.id);
    const orderedPresets = arrayMove(historyPresets, oldIndex, newIndex);
    if (presetReorderFeedbackTimerRef.current) window.clearTimeout(presetReorderFeedbackTimerRef.current);
    setPresetReorderFeedback(null);
    reorderHealthHistoryPresets.mutate({ orderedIds: orderedPresets.map((preset) => preset.id) }, {
      onSuccess: () => {
        setPresetReorderFeedback({ kind: "saved", presetId: movedPreset.id, presetName: movedPreset.name, position: newIndex + 1, total: orderedPresets.length, previousOrderedIds });
        presetReorderFeedbackTimerRef.current = window.setTimeout(() => setPresetReorderFeedback(null), 8_000);
      },
    });
  }, [historyPresets, reorderHealthHistoryPresets]);

  const runHealthCheck = trpc.authDiagnostics.runHealthCheck.useMutation({
    onMutate: () => {
      setManualHealthResult(null);
      setManualHealthError(null);
    },
    onSuccess: (result) => {
      setManualHealthResult(result);
      const message = result.overallStatus === "ok" ? "Production auth health check passed." : `Auth health check failed: ${result.failureCode ?? "unknown failure"}`;
      if (result.overallStatus === "ok") toast.success(message); else toast.error(message);
      refetchDashboard();
      healthHistoryQuery.refetch();
    },
    onError: (error) => {
      const message = error.message || "Health check could not run.";
      setManualHealthError(message);
      toast.error(message);
    },
  });

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center rr-bg-cream-warm"><Loader2 size={26} className="animate-spin rr-text-navy-muted" /></div>;
  }
  if (user?.role !== "admin") return null;
  if (error) {
    return <div className="min-h-screen flex items-center justify-center px-4 rr-bg-cream-warm"><div role="alert" className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "oklch(0.96 0.04 27)", color: "oklch(0.48 0.17 27)" }}><AlertCircle size={22} /></div><h1 className="text-xl rr-fw-black rr-text-navy">Monitoring data unavailable</h1><p className="mt-2 text-sm font-bold rr-text-navy-muted">Authentication diagnostics could not be loaded. No health status is being inferred from missing data.</p><p className="mt-2 text-xs font-bold rr-text-navy-faint">{error.message}</p><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center"><button onClick={() => refetchDashboard()} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold rr-bg-gold rr-text-navy"><RefreshCw size={14} /> Try again</button><button onClick={() => navigate("/admin")} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold rr-bg-navy text-white"><ArrowLeft size={14} /> Admin dashboard</button></div></div></div>;
  }

  const latestHealth = data?.healthChecks?.[0];
  const uptime = data?.uptime;
  const summary = data?.summary ?? [];
  const events = data?.events ?? [];
  const healthHistory = healthHistoryQuery.data?.rows ?? [];
  const failedHealthChecks = healthHistory.filter((row) => row.overallStatus === "fail");
  const historyTotal = healthHistoryQuery.data?.total ?? 0;
  const historyPageCount = healthHistoryQuery.data?.pageCount ?? 1;
  const displayedHistoryPage = healthHistoryQuery.data?.page ?? historyPage;
  const historyStart = historyTotal === 0 ? 0 : (displayedHistoryPage - 1) * historyPageSize + 1;
  const historyEnd = Math.min(displayedHistoryPage * historyPageSize, historyTotal);
  const editingPreset = historyPresets.find((preset) => preset.id === editingPresetId);
  const hasActiveHistoryFilters = historyStatus !== "all" || historyTriggerSource !== "all" || Boolean(historyFromDate) || Boolean(historyToDate);
  const activeHistoryFilterChips = getActiveAuthHealthHistoryFilterChips({ status: historyStatus, triggerSource: historyTriggerSource, from: historyFromDate, to: historyToDate });
  const clearHistoryFilterChip = (key: typeof activeHistoryFilterChips[number]["key"]) => {
    applyHistoryFilterState(clearAuthHealthHistoryFilter({ status: historyStatus, triggerSource: historyTriggerSource, from: historyFromDate, to: historyToDate, page: historyPage }, key));
  };
  const applyRelativeHistoryRange = (days: 7 | 30) => {
    const range = getRelativeAuthHealthHistoryDateInputs(days);
    setHistoryFromDate(range.from);
    setHistoryToDate(range.to);
    setHistoryPage(1);
    toast.success(`Showing the last ${days} local calendar days.`);
  };
  const applyHistoryPreset = (preset: typeof historyPresets[number]) => {
    setHistoryStatus(preset.status === "ok" || preset.status === "fail" ? preset.status : "all");
    setHistoryTriggerSource(preset.triggerSource === "scheduled" || preset.triggerSource === "manual" ? preset.triggerSource : "all");
    setHistoryFromDate(msToLocalDateInput(preset.fromMs));
    setHistoryToDate(msToLocalDateInput(preset.toMs));
    setHistoryPage(1);
    toast.success(`Applied “${preset.name}”.`);
  };
  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return toast.error("Enter a name for this filter preset.");
    if (historyDateError) return toast.error(historyDateError);
    saveHealthHistoryPreset.mutate(editingPreset ? {
      id: editingPreset.id,
      name,
      status: editingPreset.status === "ok" || editingPreset.status === "fail" ? editingPreset.status : null,
      triggerSource: editingPreset.triggerSource === "scheduled" || editingPreset.triggerSource === "manual" ? editingPreset.triggerSource : null,
      fromMs: editingPreset.fromMs,
      toMs: editingPreset.toMs,
    } : {
      name,
      status: historyStatus === "all" ? null : historyStatus,
      triggerSource: historyTriggerSource === "all" ? null : historyTriggerSource,
      fromMs: historyFromMs ?? null,
      toMs: historyToMs ?? null,
    });
  };
  const totalFor = (eventType: string, eventOutcome?: string) => summary
    .filter((row) => row.eventType === eventType && (!eventOutcome || row.outcome === eventOutcome))
    .reduce((total, row) => total + Number(row.total ?? 0), 0);
  const signals = latestHealth ? [
    ["Configuration", latestHealth.configStatus],
    ["Database", latestHealth.databaseStatus],
    ["User schema", latestHealth.userSchemaStatus],
    ["Magic-link table", latestHealth.magicLinkSchemaStatus],
    ["Session signing", latestHealth.sessionStatus],
    ["Email provider", latestHealth.emailProviderStatus],
  ] as const : [];

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <header className="rr-bg-navy px-5 pt-14 pb-7">
        <button onClick={() => navigate("/admin")} className="mb-4 flex items-center gap-1.5 text-sm font-bold rr-text-gold"><ArrowLeft size={14} /> Admin dashboard</button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 rr-text-gold"><ShieldCheck size={17} /><span className="text-xs font-bold uppercase tracking-[0.18em]">Get Phame operations</span></div>
            <h1 className="text-2xl text-white rr-fw-black sm:text-3xl">Authentication Diagnostics</h1>
            <p className="mt-1 max-w-2xl text-sm font-bold text-white/90">Monitor production readiness, email-provider acceptance, and magic-link verification without exposing full recipients or tokens.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => runHealthCheck.mutate()} disabled={runHealthCheck.isPending} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold rr-bg-gold rr-text-navy disabled:opacity-60" title="Run a non-destructive production authentication health check now">
              {runHealthCheck.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} {runHealthCheck.isPending ? "Checking auth dependencies…" : "Run immediate health check"}
            </button>
            <button onClick={() => { refetchDashboard(); healthHistoryQuery.refetch(); toast.success("Diagnostics refreshed."); }} disabled={isFetching || healthHistoryQuery.isFetching} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-60" style={{ background: "oklch(0.30 0.07 260)" }}>
              {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-5 sm:px-5">
        {(runHealthCheck.isPending || manualHealthResult || manualHealthError) && <section aria-live="polite" role={manualHealthError ? "alert" : "status"} className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: runHealthCheck.isPending ? "oklch(0.80 0.18 80)" : manualHealthError || manualHealthResult?.overallStatus === "fail" ? "oklch(0.72 0.15 27)" : "oklch(0.61 0.15 145)" }}>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: runHealthCheck.isPending ? "oklch(0.96 0.04 80)" : manualHealthError || manualHealthResult?.overallStatus === "fail" ? "oklch(0.97 0.03 27)" : "oklch(0.94 0.05 145)", color: runHealthCheck.isPending ? "oklch(0.46 0.12 80)" : manualHealthError || manualHealthResult?.overallStatus === "fail" ? "oklch(0.48 0.17 27)" : "oklch(0.40 0.14 145)" }}>
                {runHealthCheck.isPending ? <Loader2 size={20} className="animate-spin" /> : manualHealthError || manualHealthResult?.overallStatus === "fail" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm rr-fw-black rr-text-navy">{runHealthCheck.isPending ? "Checking auth dependencies" : manualHealthError ? "Immediate health check unavailable" : manualHealthResult?.overallStatus === "ok" ? "Immediate health check passed" : "Immediate health check found an issue"}</p>
                <p className="mt-1 text-xs font-bold rr-text-navy-muted">{runHealthCheck.isPending ? "Testing configuration, database, schema, session signing, and email-provider reachability. No user, token, session, or email is created." : manualHealthError ?? (manualHealthResult?.overallStatus === "ok" ? `Completed ${formatDate(manualHealthResult.checkedAt)} in ${manualHealthResult.durationMs} ms.` : `${manualHealthResult?.failureCode ?? "health_check_failed"}: ${manualHealthResult?.failureDetail ?? "Review the detailed failure event below."}`)}</p>
              </div>
            </div>
            {runHealthCheck.isPending && <div className="flex items-center gap-1.5 self-start sm:self-auto" aria-label="Health check in progress"><span className="h-2 w-2 animate-pulse rounded-full rr-bg-gold" /><span className="h-2 w-2 animate-pulse rounded-full rr-bg-gold [animation-delay:150ms]" /><span className="h-2 w-2 animate-pulse rounded-full rr-bg-gold [animation-delay:300ms]" /></div>}
          </div>
        </section>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric title="Latest health" icon={<ShieldCheck size={15} />}><div>{latestHealth ? <StatusPill value={latestHealth.overallStatus} /> : <span className="text-sm font-bold rr-text-navy-faint">No run yet</span>}</div><p className="mt-2 text-xs font-bold rr-text-navy-faint">{formatDate(latestHealth?.checkedAt)}</p></Metric>
          <Metric title="Provider accepted" icon={<MailCheck size={15} />} value={totalFor("provider_accepted", "ok")} note={`Last ${days} days`} />
          <Metric title="Verified links" icon={<KeyRound size={15} />} value={totalFor("verification_success", "ok")} note={`Last ${days} days`} />
          <Metric title="Verification failures" icon={<AlertCircle size={15} />} value={totalFor("verification_failed", "fail")} note={`Last ${days} days`} danger />
        </section>

        <section aria-labelledby="uptime-heading" className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: "oklch(0.91 0.02 260)" }}>
            <div>
              <div className="mb-1 flex items-center gap-2 rr-text-gold"><Activity size={16} /><span className="text-xs font-bold uppercase tracking-[0.16em]">24-hour observation</span></div>
              <h2 id="uptime-heading" className="text-base rr-fw-black rr-text-navy">Scheduled authentication uptime</h2>
              <p className="text-sm font-bold rr-text-navy-muted">Measured from real 15-minute production Heartbeat runs.</p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full px-3 py-2 text-xs font-bold sm:self-auto" style={{ background: !uptime ? "oklch(0.96 0.04 80)" : uptime.currentIncidentOpen ? "oklch(0.96 0.04 27)" : "oklch(0.94 0.05 145)", color: !uptime ? "oklch(0.46 0.12 80)" : uptime.currentIncidentOpen ? "oklch(0.48 0.17 27)" : "oklch(0.40 0.14 145)" }}>
              {!uptime ? <Clock3 size={13} /> : uptime.currentIncidentOpen ? <AlertCircle size={13} /> : <BellRing size={13} />}
              {!uptime ? "Monitoring unavailable" : uptime.currentIncidentOpen ? "Active incident" : "Failure alerts armed"}
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl p-4 rr-bg-surface sm:p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <UptimeMetric label="Uptime" value={uptime?.uptimePercent === null || uptime?.uptimePercent === undefined ? "—" : `${uptime.uptimePercent}%`} icon={<Gauge size={14} />} />
                <UptimeMetric label="Observed runs" value={`${uptime?.runCount ?? 0}/${uptime?.expectedRuns ?? 96}`} icon={<Activity size={14} />} />
                <UptimeMetric label="Incidents" value={String(uptime?.incidentCount ?? 0)} icon={<AlertCircle size={14} />} danger={Boolean(uptime?.incidentCount)} />
                <UptimeMetric label="Avg. latency" value={uptime?.averageDurationMs === null || uptime?.averageDurationMs === undefined ? "—" : `${uptime.averageDurationMs} ms`} icon={<Clock3 size={14} />} />
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold rr-text-navy-muted"><span>{uptime?.observationComplete ? "Rolling window complete" : "Collecting first 24 hours"}</span><span>{uptime?.coveragePercent ?? 0}% coverage</span></div>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "oklch(0.88 0.03 260)" }}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${uptime?.coveragePercent ?? 0}%`, background: "oklch(0.80 0.18 80)" }} /></div>
                <div className="mt-3 flex flex-col gap-1 text-xs font-bold rr-text-navy-faint sm:flex-row sm:justify-between"><span>Latest: {formatDate(uptime?.latestCheckedAt)}</span><span>{uptime?.remainingRuns ?? 96} scheduled runs remaining</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {(uptime?.components ?? []).map((component) => <div key={component.key} className="rounded-xl border p-3" style={{ borderColor: "oklch(0.91 0.02 260)" }}><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold rr-text-navy-mid">{component.label}</p><StatusPill value={component.latestStatus ?? "fail"} /></div><p className="text-xl rr-fw-black rr-text-navy">{component.uptimePercent === null ? "—" : `${component.uptimePercent}%`}</p><p className="text-[11px] font-bold rr-text-navy-faint">{component.successfulRuns} healthy · {component.failedRuns} failed</p></div>)}
              {!uptime?.components?.length && <div className="col-span-2 flex min-h-28 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm font-bold rr-text-navy-muted sm:col-span-3 lg:col-span-2" style={{ borderColor: "oklch(0.86 0.03 260)" }}>The first scheduled run will populate component uptime.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base rr-fw-black rr-text-navy">Production auth signals</h2><p className="text-sm font-bold rr-text-navy-muted">Non-destructive checks; no user, token, cookie, or email is created.</p></div>
            {latestHealth && <p className="text-xs font-bold rr-text-navy-faint">Completed in {latestHealth.durationMs} ms</p>}
          </div>
          {signals.length ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">{signals.map(([label, value]) => <div key={label} className="rounded-xl p-3 rr-bg-surface"><p className="mb-2 text-xs font-bold rr-text-navy-mid">{label}</p><StatusPill value={value} /></div>)}</div> : <p className="rounded-xl p-4 text-sm font-bold rr-bg-surface rr-text-navy-muted">Run the first health check to establish a baseline.</p>}
          {latestHealth?.failureDetail && <div className="mt-3 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{latestHealth.failureCode}: {latestHealth.failureDetail}</div>}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2"><Filter size={16} className="rr-text-gold" /><h2 className="text-base rr-fw-black rr-text-navy">Magic-link delivery trail</h2></div>
          <form className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_130px_auto]" onSubmit={(event) => { event.preventDefault(); setEmailFilter(emailInput.trim().toLowerCase()); }}>
            <label className="relative"><span className="sr-only">Filter by exact email</span><Search size={15} className="absolute left-3 top-3.5 rr-text-navy-faint" /><input type="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="Exact customer email" className="h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm font-bold rr-text-navy outline-none focus:ring-2" style={{ borderColor: "oklch(0.88 0.03 260)" }} /></label>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as "all" | "ok" | "fail")} className="h-11 rounded-xl border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value="all">All outcomes</option><option value="ok">Successful</option><option value="fail">Failed</option></select>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-11 rounded-xl border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value={1}>24 hours</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select>
            <button type="submit" className="h-11 rounded-xl px-4 text-sm font-bold rr-bg-navy text-white">Apply</button>
          </form>
          {emailFilter && <button onClick={() => { setEmailInput(""); setEmailFilter(""); }} className="mb-3 text-xs font-bold rr-text-gold">Clear exact-email filter</button>}
          {events.length === 0 ? <div className="rounded-xl px-4 py-8 text-center rr-bg-surface"><p className="text-sm font-bold rr-text-navy-muted">No matching lifecycle events.</p></div> : (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: "oklch(0.91 0.02 260)" }}>
              <div className="hidden grid-cols-[160px_130px_110px_1fr_110px] gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide rr-bg-surface rr-text-navy-muted md:grid"><span>Time</span><span>Event</span><span>Recipient</span><span>Detail</span><span>Outcome</span></div>
              <div className="divide-y" style={{ borderColor: "oklch(0.92 0.02 260)" }}>{events.map((row) => <div key={row.id} className="grid gap-2 px-4 py-4 md:grid-cols-[160px_130px_110px_1fr_110px] md:items-center md:gap-3">
                <div className="flex items-center gap-2 text-xs font-bold rr-text-navy-faint"><Clock3 size={13} />{formatDate(row.occurredAt)}</div><p className="text-sm font-black rr-text-navy">{eventLabels[row.eventType] ?? row.eventType}</p><p className="text-sm font-bold rr-text-navy-mid">{row.emailMasked ?? "—"}</p>
                <div className="min-w-0 text-xs font-bold rr-text-navy-muted"><p className="truncate" title={row.detailMessage ?? row.providerMessageId ?? row.requestId}>{row.detailMessage ?? (row.providerMessageId ? `Provider ID ${row.providerMessageId}` : `Request ${row.requestId.slice(0, 8)}…`)}</p>{row.durationMs !== null && <p className="rr-text-navy-faint">{row.durationMs} ms</p>}</div><StatusPill value={row.outcome} />
              </div>)}</div>
            </div>
          )}
        </section>

        <section id="health-history" className="scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base rr-fw-black rr-text-navy">Health check history &amp; failure events</h2><p className="text-sm font-bold rr-text-navy-muted">Every persisted scheduled or manual check, with sanitized failure detail when a dependency fails.</p></div>
            <div className="flex flex-wrap items-center gap-2"><div className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold rr-bg-surface rr-text-navy-muted"><Activity size={13} />{historyTotal} matching record{historyTotal === 1 ? "" : "s"}</div><div className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: failedHealthChecks.length ? "oklch(0.97 0.03 27)" : "oklch(0.94 0.05 145)", color: failedHealthChecks.length ? "oklch(0.48 0.17 27)" : "oklch(0.40 0.14 145)" }}><AlertCircle size={13} />{failedHealthChecks.length} failure{failedHealthChecks.length === 1 ? "" : "s"} on this page</div></div>
          </div>
          <div className="mb-3 grid gap-3 rounded-xl p-3 rr-bg-surface sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_150px_130px_auto]">
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>Status</span><select aria-label="Filter health history by status" value={historyStatus} onChange={(event) => { setHistoryStatus(event.target.value as "all" | "ok" | "fail"); setHistoryPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value="all">All statuses</option><option value="ok">Healthy only</option><option value="fail">Failures only</option></select></label>
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>Trigger source</span><select aria-label="Filter health history by trigger source" value={historyTriggerSource} onChange={(event) => { setHistoryTriggerSource(event.target.value as "all" | "scheduled" | "manual"); setHistoryPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value="all">All trigger sources</option><option value="scheduled">Scheduled Heartbeat</option><option value="manual">Administrator-triggered</option></select></label>
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>From date</span><input type="date" aria-label="Filter health history from date" value={historyFromDate} onChange={(event) => { setHistoryFromDate(event.target.value); setHistoryPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }} /></label>
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>To date</span><input type="date" aria-label="Filter health history to date" value={historyToDate} onChange={(event) => { setHistoryToDate(event.target.value); setHistoryPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: historyDateError ? "oklch(0.62 0.18 27)" : "oklch(0.88 0.03 260)" }} /></label>
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>Rows per page</span><select aria-label="Health history rows per page" value={historyPageSize} onChange={(event) => { setHistoryPageSize(Number(event.target.value) as 10 | 20 | 50); setHistoryPage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value={10}>10 rows</option><option value={20}>20 rows</option><option value={50}>50 rows</option></select></label>
            <button type="button" onClick={openHealthHistoryCsvPreview} disabled={prepareHealthHistoryExport.isPending || historyTotal === 0 || Boolean(historyDateError)} className="flex h-10 items-center justify-center gap-2 self-end rounded-lg px-4 text-sm font-bold rr-bg-navy text-white disabled:cursor-not-allowed disabled:opacity-50">{prepareHealthHistoryExport.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileSearch size={14} />}{prepareHealthHistoryExport.isPending ? t("adminAuthDiagnostics.csvPreview.preparing", { defaultValue: "Preparing preview…" }) : t("adminAuthDiagnostics.csvPreview.openButton", { defaultValue: "Preview filtered CSV" })}</button>
          </div>
          <div className="mb-3 flex flex-col gap-2 rounded-xl border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "oklch(0.88 0.03 260)" }}>
            <div><p className="text-xs rr-fw-black rr-text-navy">Relative date ranges</p><p className="text-xs font-bold rr-text-navy-faint">Inclusive local-calendar days ending today.</p></div>
            <div className="flex flex-wrap gap-2">{AUTH_HEALTH_HISTORY_RELATIVE_DAYS.map((relativeDays) => { const range = getRelativeAuthHealthHistoryDateInputs(relativeDays); const active = historyFromDate === range.from && historyToDate === range.to; return <button key={relativeDays} type="button" onClick={() => applyRelativeHistoryRange(relativeDays)} aria-pressed={active} className="h-9 rounded-full border px-3 text-xs font-bold transition-colors" style={{ borderColor: active ? "oklch(0.80 0.18 80)" : "oklch(0.86 0.04 260)", background: active ? "oklch(0.96 0.05 80)" : "white", color: "oklch(0.22 0.09 260)" }}>Last {relativeDays} days</button>; })}</div>
          </div>
          <div className="mb-3 flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "oklch(0.88 0.03 260)", background: "oklch(0.98 0.02 80)" }}>
            <div><p className="text-xs rr-fw-black rr-text-navy">Clear all filters</p><p className="text-xs font-bold rr-text-navy-faint">Power users can reset status, source, dates, and pagination from anywhere outside an editable field.</p></div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2"><kbd className="rounded-md border bg-white px-2 py-1 text-xs font-black rr-text-navy" style={{ borderColor: "oklch(0.84 0.08 80)" }}>Alt + Shift + C</kbd><Tooltip><TooltipTrigger asChild><button type="button" onClick={() => { if (hasActiveHistoryFilters) clearAllHistoryFilters(); }} aria-disabled={!hasActiveHistoryFilters} aria-keyshortcuts={AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT} className={`h-9 rounded-lg px-3 text-xs font-bold rr-bg-gold rr-text-navy ${hasActiveHistoryFilters ? "" : "cursor-not-allowed opacity-50"}`}>{t("adminAuthDiagnostics.clearFilters.button", { defaultValue: "Clear now" })}</button></TooltipTrigger><TooltipContent side="top" sideOffset={8} className="max-w-[19rem] rounded-xl px-3 py-2 text-left text-xs leading-relaxed shadow-xl">{t("adminAuthDiagnostics.clearFilters.tooltip", { defaultValue: "Clear status, source, dates, and pagination. Keyboard shortcut: Alt+Shift+C." })}</TooltipContent></Tooltip></div>
              <details className="w-full sm:w-auto">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-center rounded-lg border bg-white px-3 text-xs font-bold rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden" style={{ borderColor: "oklch(0.86 0.04 260)" }}>{t("adminAuthDiagnostics.clearFilters.touchHelp", { defaultValue: "Shortcut help" })}</summary>
                <p className="mt-2 max-w-[19rem] rounded-lg border bg-white px-3 py-2 text-xs font-bold leading-relaxed rr-text-navy-muted shadow-sm sm:max-w-72" style={{ borderColor: "oklch(0.88 0.03 260)" }}>{t("adminAuthDiagnostics.clearFilters.tooltip", { defaultValue: "Clear status, source, dates, and pagination. Keyboard shortcut: Alt+Shift+C." })}</p>
              </details>
            </div>
          </div>
          {historyDateError && <div role="alert" className="mb-3 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{historyDateError}</div>}
          <div className="mb-4 rounded-xl border bg-white p-3" style={{ borderColor: "oklch(0.88 0.03 260)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm rr-fw-black rr-text-navy"><Bookmark size={15} /> Quick filter presets</p><p className="mt-1 text-xs font-bold rr-text-navy-faint">Private to your administrator account. Drag the handle, or focus it and press Space then an arrow key, to save your preferred order.</p><DndContext sensors={presetSensors} collisionDetection={closestCenter} onDragEnd={handlePresetDragEnd}><SortableContext items={historyPresets.map((preset) => preset.id)} strategy={rectSortingStrategy}><div className="mt-3 flex flex-wrap gap-2">{historyPresets.map((preset) => <SortablePresetControl key={preset.id} preset={preset} reorderSucceeded={presetReorderFeedback?.presetId === preset.id} disabled={duplicateHealthHistoryPreset.isPending || deleteHealthHistoryPreset.isPending || reorderHealthHistoryPresets.isPending || undoHealthHistoryPresetReorder.isPending} onApply={() => applyHistoryPreset(preset)} onRename={() => { setEditingPresetId(preset.id); setPresetName(preset.name); }} onDuplicate={() => duplicateHealthHistoryPreset.mutate({ id: preset.id })} onDelete={() => deleteHealthHistoryPreset.mutate({ id: preset.id })} />)}{!historyPresets.length && !presetsQuery.isLoading && <span className="text-xs font-bold rr-text-navy-faint">No presets saved yet.</span>}</div></SortableContext></DndContext><div role="status" aria-live="polite" className="mt-2 min-h-7">{presetReorderFeedback && <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 motion-safe:transition-[opacity,transform] motion-safe:duration-200"><CheckCircle2 size={13} aria-hidden="true" /><span>{presetReorderFeedback.kind === "saved" ? t("adminAuthDiagnostics.presets.orderSavedDetail", { defaultValue: "{{name}} saved in position {{position}} of {{total}}.", name: presetReorderFeedback.presetName, position: presetReorderFeedback.position, total: presetReorderFeedback.total }) : t("adminAuthDiagnostics.presets.orderRestored", { defaultValue: "Previous preset order restored." })}</span>{presetReorderFeedback.kind === "saved" && <><button type="button" onClick={handleUndoPresetReorder} disabled={undoHealthHistoryPresetReorder.isPending} aria-keyshortcuts={AUTH_HEALTH_HISTORY_REORDER_UNDO_SHORTCUT} className="inline-flex min-h-7 items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 font-black text-emerald-800 disabled:opacity-60"><Undo2 size={12} aria-hidden="true" />{undoHealthHistoryPresetReorder.isPending ? t("adminAuthDiagnostics.presets.undoing", { defaultValue: "Undoing…" }) : t("adminAuthDiagnostics.presets.undo", { defaultValue: "Undo" })}</button><span className="rounded-md bg-white/70 px-1.5 py-1 text-[11px] font-black text-emerald-700">{t("adminAuthDiagnostics.presets.undoShortcutHint", { defaultValue: "Keyboard: Ctrl/Cmd + Z" })}</span></>}</div>}</div></div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-bold rr-text-navy-muted lg:w-56"><span>{editingPreset ? "Rename preset" : "Preset name"}</span><input value={presetName} maxLength={80} onChange={(event) => setPresetName(event.target.value)} placeholder={editingPreset ? editingPreset.name : "e.g. Manual failures"} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }} /></label><div className="flex items-end gap-2"><button type="button" onClick={savePreset} disabled={saveHealthHistoryPreset.isPending || Boolean(historyDateError)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold rr-bg-gold rr-text-navy disabled:opacity-50">{saveHealthHistoryPreset.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{editingPreset ? "Rename" : "Save current"}</button>{editingPreset && <button type="button" onClick={() => { setEditingPresetId(null); setPresetName(""); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}>Cancel</button>}</div></div>
            </div>
            {presetsQuery.error && <p role="alert" className="mt-2 text-xs font-bold" style={{ color: "oklch(0.48 0.17 27)" }}>Saved presets could not be loaded. {presetsQuery.error.message}</p>}
          </div>
          {hasActiveHistoryFilters && <div aria-label="Active health history filters" className="mb-3 flex flex-col gap-2 rounded-xl border bg-white p-3" style={{ borderColor: "oklch(0.88 0.03 260)" }}><div className="flex items-center justify-between gap-3"><p className="text-xs rr-fw-black rr-text-navy">Active filters</p><button type="button" onClick={clearAllHistoryFilters} aria-keyshortcuts={AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT} className="text-xs font-bold rr-text-gold">Clear all filters</button></div><div className="flex flex-wrap gap-2" role="list">{activeHistoryFilterChips.map((chip) => <button key={chip.key} type="button" role="listitem" onClick={() => clearHistoryFilterChip(chip.key)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold rr-bg-surface rr-text-navy" aria-label={`Remove ${chip.label} filter`}>{chip.label}<X size={12} aria-hidden="true" /></button>)}</div></div>}
          <div aria-live="polite" className="mb-3 flex min-h-5 items-center justify-between gap-3 text-xs font-bold rr-text-navy-faint"><span>{healthHistoryQuery.isFetching ? "Loading filtered health history…" : `Showing ${historyStart}–${historyEnd} of ${historyTotal} matching records`}</span>{hasActiveHistoryFilters && <button type="button" onClick={clearAllHistoryFilters} className="rr-text-gold">Clear history filters</button>}</div>
          {healthHistoryQuery.error && <div role="alert" className="mb-3 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>Health history could not be loaded. {healthHistoryQuery.error.message}</div>}
          <div className="flex flex-col gap-3">
            {healthHistory.map((row) => <article key={row.id} className="rounded-xl border p-3 rr-bg-surface sm:p-4" style={{ borderColor: row.overallStatus === "fail" ? "oklch(0.84 0.08 27)" : "oklch(0.88 0.03 260)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm rr-fw-black rr-text-navy">{formatDate(row.checkedAt)}</p><p className="mt-1 text-xs font-bold rr-text-navy-faint">{row.triggerSource === "manual" ? "Administrator-triggered" : "Scheduled Heartbeat"} · {row.durationMs} ms{row.providerName ? ` · ${row.providerName}` : ""}</p></div><StatusPill value={row.overallStatus} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold sm:grid-cols-3 lg:grid-cols-6"><HealthComponent label="Config" value={row.configStatus} /><HealthComponent label="Database" value={row.databaseStatus} /><HealthComponent label="User schema" value={row.userSchemaStatus} /><HealthComponent label="Magic links" value={row.magicLinkSchemaStatus} /><HealthComponent label="Sessions" value={row.sessionStatus} /><HealthComponent label="Email" value={row.emailProviderStatus} /></div>
              {row.overallStatus === "fail" && <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}><p className="text-xs font-black">{row.failureCode ?? "health_check_failed"}</p><p className="mt-1 text-xs font-bold">Sanitized failure detail: {row.failureDetail ?? "No additional detail was recorded."}</p></div>}
            </article>)}
            {!healthHistory.length && !healthHistoryQuery.isFetching && <p className="rounded-xl p-4 text-sm font-bold rr-bg-surface rr-text-navy-muted">No health-check history matches the active filters. Clear the filters or run an administrator-only immediate check to establish a baseline.</p>}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "oklch(0.91 0.02 260)" }}><p className="text-xs font-bold rr-text-navy-faint">Page {displayedHistoryPage} of {historyPageCount}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setHistoryPage(Math.max(1, displayedHistoryPage - 1))} disabled={displayedHistoryPage <= 1 || healthHistoryQuery.isFetching} className="flex h-10 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy disabled:opacity-40" style={{ borderColor: "oklch(0.88 0.03 260)" }}><ChevronLeft size={15} /> Previous</button><button type="button" onClick={() => setHistoryPage(Math.min(historyPageCount, displayedHistoryPage + 1))} disabled={displayedHistoryPage >= historyPageCount || healthHistoryQuery.isFetching} className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold rr-bg-gold rr-text-navy disabled:opacity-40">Next <ChevronRight size={15} /></button></div></div>
        </section>
      </main>

      <Dialog open={csvPreviewOpen} onOpenChange={(open) => {
        setCsvPreviewOpen(open);
        if (!open) {
          setCsvPreview(null);
          setCsvPreviewRequest(null);
          setSelectedCsvColumns([]);
          setCsvRowSearch("");
          setCsvColumnPreferenceStatus("idle");
          setCsvCopyStatus("idle");
          csvInitialPreferenceAppliedRef.current = false;
          prepareHealthHistoryExport.reset();
        }
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-6xl">
          <DialogHeader className="border-b px-5 pb-4 pt-5 pr-12 text-left sm:px-6 sm:pt-6" style={{ borderColor: "oklch(0.90 0.02 260)" }}>
            <DialogTitle className="flex items-center gap-2 rr-text-navy"><FileSearch size={19} className="rr-text-gold" aria-hidden="true" />{t("adminAuthDiagnostics.csvPreview.title", { defaultValue: "Preview sanitized CSV" })}</DialogTitle>
            <DialogDescription className="font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.description", { defaultValue: "Review the exact filtered, sanitized snapshot before downloading it." })}</DialogDescription>
          </DialogHeader>

          <div className="min-h-64 overflow-y-auto px-5 py-4 sm:px-6">
            {prepareHealthHistoryExport.isPending && !csvPreview && <div role="status" aria-live="polite" className="flex min-h-56 flex-col items-center justify-center gap-3 text-center"><Loader2 size={28} className="animate-spin rr-text-gold" aria-hidden="true" /><p className="text-sm font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.loading", { defaultValue: "Preparing the sanitized preview…" })}</p></div>}

            {prepareHealthHistoryExport.error && <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl px-5 text-center" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}><AlertCircle size={28} aria-hidden="true" /><div><p className="text-sm font-black">{t("adminAuthDiagnostics.csvPreview.errorTitle", { defaultValue: "Preview unavailable" })}</p><p className="mt-1 text-xs font-bold">{prepareHealthHistoryExport.error.message || t("adminAuthDiagnostics.csvPreview.errorDescription", { defaultValue: "The filtered export could not be prepared." })}</p></div></div>}

            {csvPreview && csvPreview.rowCount === 0 && <div role="status" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl rr-bg-surface px-5 text-center"><FileSearch size={28} className="rr-text-navy-faint" aria-hidden="true" /><div><p className="text-sm rr-fw-black rr-text-navy">{t("adminAuthDiagnostics.csvPreview.emptyTitle", { defaultValue: "No rows to preview" })}</p><p className="mt-1 text-xs font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.emptyDescription", { defaultValue: "No health records match the active filters." })}</p></div></div>}

            {csvPreview && csvPreview.rowCount > 0 && <div className="space-y-3">
              <div className="grid gap-2 rounded-xl rr-bg-surface p-3 text-xs font-bold rr-text-navy-muted sm:grid-cols-2">
                <p><span className="rr-text-navy">{t("adminAuthDiagnostics.csvPreview.fileLabel", { defaultValue: "File:" })}</span> <span className="break-all">{csvPreview.filename}</span></p>
                <p className="sm:text-right">{t("adminAuthDiagnostics.csvPreview.summary", { defaultValue: "Previewing {{previewed}} of {{exported}} export rows · {{matched}} matched", previewed: csvPreview.preview.rowCount, exported: csvPreview.rowCount, matched: csvPreview.totalMatching })}</p>
              </div>
              <p className="text-xs font-bold rr-text-navy-faint">{t("adminAuthDiagnostics.csvPreview.sanitizedNotice", { defaultValue: "The preview and download share the same whitelisted columns, redaction, formula protection, filters, row cap, and newest-first ordering." })}</p>
              <fieldset aria-describedby="csv-column-selection-help" disabled={prepareHealthHistoryExport.isPending} className="rounded-xl border bg-white p-3" style={{ borderColor: "oklch(0.88 0.03 260)" }}>
                <legend className="flex items-center gap-2 text-sm rr-fw-black rr-text-navy"><Columns3 size={15} className="rr-text-gold" aria-hidden="true" />{t("adminAuthDiagnostics.csvPreview.columnsTitle", { defaultValue: "Columns to include" })}</legend>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p id="csv-column-selection-help" className="text-xs font-bold rr-text-navy-faint">{t("adminAuthDiagnostics.csvPreview.columnsHelp", { defaultValue: "Choose at least one column. Preview, copy, and download stay in sync." })}</p>
                  <div className="flex items-center gap-2"><span className="text-xs font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.columnsSelected", { defaultValue: "{{selected}} of {{total}} selected", selected: selectedCsvColumns.length, total: csvPreview.availableColumns.length })}</span><button type="button" onClick={() => updateCsvColumnSelection(csvPreview.availableColumns.map((column) => column.key))} disabled={selectedCsvColumns.length === csvPreview.availableColumns.length || prepareHealthHistoryExport.isPending} className="min-h-8 rounded-md border bg-white px-2.5 text-xs font-black rr-text-navy disabled:opacity-50" style={{ borderColor: "oklch(0.86 0.04 260)" }}>{t("adminAuthDiagnostics.csvPreview.selectAllColumns", { defaultValue: "Select all" })}</button></div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{csvPreview.availableColumns.map((column) => { const checked = selectedCsvColumns.includes(column.key); return <label key={column.key} className="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold rr-text-navy" style={{ borderColor: checked ? "oklch(0.80 0.18 80)" : "oklch(0.90 0.02 260)", background: checked ? "oklch(0.98 0.03 80)" : "white" }}><input type="checkbox" checked={checked} disabled={prepareHealthHistoryExport.isPending || (checked && selectedCsvColumns.length === 1)} onChange={() => toggleCsvColumn(column.key)} className="h-4 w-4 accent-[oklch(0.80_0.18_80)]" /><span className="break-all">{column.csvHeader}</span></label>; })}</div>
                {prepareHealthHistoryExport.isPending && <p role="status" aria-live="polite" className="mt-2 flex items-center gap-2 text-xs font-bold rr-text-navy-muted"><Loader2 size={13} className="animate-spin rr-text-gold" aria-hidden="true" />{t("adminAuthDiagnostics.csvPreview.updatingColumns", { defaultValue: "Updating selected columns…" })}</p>}
                {csvColumnPreferenceStatus !== "idle" && <p role="status" aria-live="polite" className="mt-2 text-xs font-bold" style={{ color: csvColumnPreferenceStatus === "saved" ? "oklch(0.40 0.14 145)" : "oklch(0.46 0.12 80)" }}>{csvColumnPreferenceStatus === "saved" ? t("adminAuthDiagnostics.csvPreview.columnsRemembered", { defaultValue: "Column choices saved for your next export on this device." }) : t("adminAuthDiagnostics.csvPreview.columnsStorageUnavailable", { defaultValue: "Column choices work for this export, but this browser could not remember them." })}</p>}
              </fieldset>
              <div className="rounded-xl border bg-white p-3" style={{ borderColor: "oklch(0.88 0.03 260)" }}>
                <label htmlFor="csv-row-search" className="text-sm rr-fw-black rr-text-navy">{t("adminAuthDiagnostics.csvPreview.searchTitle", { defaultValue: "Search prepared rows" })}</label>
                <div className="relative mt-2"><Search size={15} className="pointer-events-none absolute left-3 top-3 rr-text-navy-faint" aria-hidden="true" /><input id="csv-row-search" type="search" value={csvRowSearch} onChange={(event) => setCsvRowSearch(event.target.value)} placeholder={t("adminAuthDiagnostics.csvPreview.searchPlaceholder", { defaultValue: "Search any selected column" })} className="h-10 w-full rounded-lg border bg-white pl-9 pr-10 text-sm font-bold rr-text-navy outline-none focus:ring-2" style={{ borderColor: "oklch(0.86 0.04 260)" }} />{csvRowSearch && <button type="button" onClick={() => setCsvRowSearch("")} aria-label={t("adminAuthDiagnostics.csvPreview.clearSearch", { defaultValue: "Clear preview row search" })} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md rr-text-navy-muted"><X size={14} aria-hidden="true" /></button>}</div>
                <div aria-live="polite" className="mt-2 flex flex-col gap-1 text-xs font-bold rr-text-navy-faint sm:flex-row sm:items-center sm:justify-between"><span>{normalizedCsvRowSearch ? t("adminAuthDiagnostics.csvPreview.searchResults", { defaultValue: "Showing {{shown}} of {{matched}} matching rows from {{total}} prepared rows.", shown: visibleCsvRows.length, matched: matchingCsvRows.length, total: csvPreview.rowCount }) : t("adminAuthDiagnostics.csvPreview.searchScope", { defaultValue: "Search all {{total}} sanitized rows in this prepared snapshot.", total: csvPreview.rowCount })}</span><span>{t("adminAuthDiagnostics.csvPreview.searchExportNotice", { defaultValue: "Search changes this preview only; copy and download still include every prepared row." })}</span></div>
              </div>
              {matchingCsvRows.length > 0 ? <div className="max-h-[48dvh] overflow-auto rounded-xl border" style={{ borderColor: "oklch(0.88 0.03 260)" }}>
                <table className="w-max min-w-full border-collapse text-left text-xs" aria-label={t("adminAuthDiagnostics.csvPreview.tableLabel", { defaultValue: "Sanitized CSV data preview" })}>
                  <thead className="sticky top-0 z-10 rr-bg-navy text-white"><tr>{csvPreview.preview.columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap border-r border-white/10 px-3 py-2.5 font-black last:border-r-0">{column.csvHeader}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "oklch(0.91 0.02 260)" }}>{visibleCsvRows.map((row, rowIndex) => <tr key={`${row.recordId ?? "row"}-${rowIndex}`} className="odd:bg-white even:rr-bg-surface">{csvPreview.preview.columns.map((column) => <td key={column.key} className={`max-w-80 border-r px-3 py-2 align-top font-bold rr-text-navy-muted last:border-r-0 ${column.key === "failureDetailSanitized" ? "whitespace-pre-wrap" : "whitespace-nowrap"}`} style={{ borderColor: "oklch(0.93 0.01 260)" }} title={row[column.key] || undefined}>{row[column.key] || "—"}</td>)}</tr>)}</tbody>
                </table>
              </div> : <div role="status" className="rounded-xl rr-bg-surface px-4 py-8 text-center"><Search size={24} className="mx-auto rr-text-navy-faint" aria-hidden="true" /><p className="mt-2 text-sm rr-fw-black rr-text-navy">{t("adminAuthDiagnostics.csvPreview.noSearchResults", { defaultValue: "No prepared rows match this search" })}</p><p className="mt-1 text-xs font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.noSearchResultsHelp", { defaultValue: "Try another term or clear the preview search. Your prepared export is unchanged." })}</p></div>}
              {normalizedCsvRowSearch && matchingCsvRows.length > visibleCsvRows.length && <p className="text-xs font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.searchLimited", { defaultValue: "Showing the first {{count}} of {{matched}} search matches to keep the preview responsive.", count: visibleCsvRows.length, matched: matchingCsvRows.length })}</p>}
              {!normalizedCsvRowSearch && csvPreview.preview.truncated && <p className="text-xs font-bold rr-text-navy-muted">{t("adminAuthDiagnostics.csvPreview.previewLimited", { defaultValue: "The modal shows the first {{count}} rows. The download contains all {{total}} rows in this prepared export.", count: csvPreview.preview.limit, total: csvPreview.rowCount })}</p>}
              {csvPreview.truncated && <p role="status" className="rounded-lg px-3 py-2 text-xs font-bold" style={{ background: "oklch(0.96 0.04 80)", color: "oklch(0.42 0.12 80)" }}>{t("adminAuthDiagnostics.csvPreview.exportLimited", { defaultValue: "The export safety cap includes the newest {{exported}} of {{matched}} matching records.", exported: csvPreview.rowCount, matched: csvPreview.totalMatching })}</p>}
            </div>}
          </div>

          <DialogFooter className="border-t px-5 py-4 sm:px-6" style={{ borderColor: "oklch(0.90 0.02 260)" }}>
            <DialogClose asChild><button type="button" className="min-h-10 rounded-lg border bg-white px-4 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }}>{t("adminAuthDiagnostics.csvPreview.close", { defaultValue: "Close" })}</button></DialogClose>
            <button type="button" onClick={copyHealthHistoryCsv} disabled={!csvPreview || csvPreview.rowCount === 0 || prepareHealthHistoryExport.isPending || csvCopyStatus === "copying"} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold rr-text-navy disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: csvCopyStatus === "copied" ? "oklch(0.61 0.15 145)" : "oklch(0.86 0.04 260)", color: csvCopyStatus === "copied" ? "oklch(0.40 0.14 145)" : undefined }}>{csvCopyStatus === "copying" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : csvCopyStatus === "copied" ? <CheckCircle2 size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{csvCopyStatus === "copying" ? t("adminAuthDiagnostics.csvPreview.copying", { defaultValue: "Copying…" }) : csvCopyStatus === "copied" ? t("adminAuthDiagnostics.csvPreview.copySucceeded", { defaultValue: "Copied" }) : csvCopyStatus === "error" ? t("adminAuthDiagnostics.csvPreview.copyFailed", { defaultValue: "Copy failed — retry" }) : t("adminAuthDiagnostics.csvPreview.copy", { defaultValue: "Copy to Clipboard" })}</button>
            <button type="button" onClick={downloadHealthHistoryCsv} disabled={!csvPreview || csvPreview.rowCount === 0 || prepareHealthHistoryExport.isPending || selectedCsvColumns.length === 0} className="flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold rr-bg-gold rr-text-navy disabled:cursor-not-allowed disabled:opacity-50"><Download size={15} aria-hidden="true" />{t("adminAuthDiagnostics.csvPreview.download", { defaultValue: "Download CSV" })}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ title, icon, value, note, danger, children }: { title: string; icon: React.ReactNode; value?: number; note?: string; danger?: boolean; children?: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="mb-1 flex items-center gap-2 text-sm font-bold rr-text-navy-mid">{icon}{title}</p>{value !== undefined && <p className="text-3xl rr-fw-black" style={{ color: danger ? "oklch(0.50 0.18 27)" : "oklch(0.22 0.09 260)" }}>{value}</p>}{note && <p className="text-xs font-bold rr-text-navy-faint">{note}</p>}{children}</div>;
}

function UptimeMetric({ label, value, icon, danger = false }: { label: string; value: string; icon: React.ReactNode; danger?: boolean }) {
  return <div><p className="mb-1 flex items-center gap-1.5 text-xs font-bold rr-text-navy-muted">{icon}{label}</p><p className="text-xl rr-fw-black" style={{ color: danger ? "oklch(0.50 0.18 27)" : "oklch(0.22 0.09 260)" }}>{value}</p></div>;
}

function HealthComponent({ label, value }: { label: string; value: HealthValue | string }) {
  const ok = value === "ok";
  return <div className="rounded-lg bg-white px-2.5 py-2"><p className="truncate rr-text-navy-faint">{label}</p><p className="mt-0.5" style={{ color: ok ? "oklch(0.40 0.14 145)" : "oklch(0.48 0.17 27)" }}>{ok ? "Healthy" : "Failed"}</p></div>;
}
