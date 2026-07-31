import { useEffect, useState } from "react";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Pencil,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { ActivityTrendExportSeries } from "@/lib/activityTrendExport";

export type ActivityTrendPresetConfig = {
  rangeKey: "30" | "60" | "90" | "custom";
  customStartDate?: string | null;
  customEndDate?: string | null;
  series: ActivityTrendExportSeries[];
};

type Preset = {
  id: number;
  name: string;
  rangeKey: ActivityTrendPresetConfig["rangeKey"];
  customStartDate: string | null;
  customEndDate: string | null;
  includeSends: boolean;
  includeOpens: boolean;
  includeClicks: boolean;
};

function getSeries(preset: Preset): ActivityTrendExportSeries[] {
  return [
    preset.includeSends ? "sends" : null,
    preset.includeOpens ? "opens" : null,
    preset.includeClicks ? "clicks" : null,
  ].filter(Boolean) as ActivityTrendExportSeries[];
}

function getConfig(preset: Preset): ActivityTrendPresetConfig {
  return {
    rangeKey: preset.rangeKey,
    customStartDate: preset.customStartDate,
    customEndDate: preset.customEndDate,
    series: getSeries(preset),
  };
}

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ActivityTrendPresetManager({
  current,
  onApply,
}: {
  current: ActivityTrendPresetConfig;
  onApply: (config: ActivityTrendPresetConfig) => void;
}) {
  const { t } = useTranslation("translation");
  const utils = trpc.useUtils();
  const { data = [], isLoading } =
    trpc.activityTrendExportPresets.list.useQuery();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [undoOrder, setUndoOrder] = useState<number[] | null>(null);

  const refresh = () => utils.activityTrendExportPresets.list.invalidate();
  const save = trpc.activityTrendExportPresets.save.useMutation({
    onSuccess: refresh,
  });
  const remove = trpc.activityTrendExportPresets.delete.useMutation({
    onSuccess: refresh,
  });
  const duplicate = trpc.activityTrendExportPresets.duplicate.useMutation({
    onSuccess: refresh,
  });
  const reorder = trpc.activityTrendExportPresets.reorder.useMutation({
    onSuccess: refresh,
  });
  const busy =
    save.isPending ||
    remove.isPending ||
    duplicate.isPending ||
    reorder.isPending;

  useEffect(() => {
    if (!reorder.isPending) setPresets(data as Preset[]);
  }, [data, reorder.isPending]);

  const errorToast = () =>
    toast.error(
      t("activityTrend.presets.error", {
        defaultValue: "The saved export preset could not be updated.",
      })
    );

  const saveCurrent = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await save.mutateAsync({ name: trimmed, ...current });
      setName("");
      toast.success(
        t("activityTrend.presets.saved", {
          name: trimmed,
          defaultValue: "Saved {{name}}.",
        })
      );
    } catch {
      errorToast();
    }
  };

  const renamePreset = async (preset: Preset) => {
    const nextName = window
      .prompt(
        t("activityTrend.presets.renamePrompt", {
          defaultValue: "Enter a new preset name",
        }),
        preset.name
      )
      ?.trim();
    if (!nextName || nextName === preset.name) return;
    try {
      await save.mutateAsync({
        id: preset.id,
        name: nextName,
        ...getConfig(preset),
      });
      toast.success(
        t("activityTrend.presets.renamed", {
          defaultValue: "Preset renamed.",
        })
      );
    } catch {
      errorToast();
    }
  };

  const deletePreset = async (preset: Preset) => {
    if (
      !window.confirm(
        t("activityTrend.presets.deleteConfirm", {
          name: preset.name,
          defaultValue: "Delete {{name}}?",
        })
      )
    )
      return;
    try {
      await remove.mutateAsync({ id: preset.id });
      toast.success(
        t("activityTrend.presets.deleted", {
          defaultValue: "Preset deleted.",
        })
      );
    } catch {
      errorToast();
    }
  };

  const duplicatePreset = async (preset: Preset) => {
    try {
      await duplicate.mutateAsync({ id: preset.id });
      toast.success(
        t("activityTrend.presets.duplicated", {
          defaultValue: "Preset duplicated.",
        })
      );
    } catch {
      errorToast();
    }
  };

  const persistOrder = async (next: Preset[], previousIds: number[]) => {
    setPresets(next);
    try {
      await reorder.mutateAsync({ orderedIds: next.map(item => item.id) });
      setUndoOrder(previousIds);
      toast.success(
        t("activityTrend.presets.reordered", {
          defaultValue: "Preset order saved.",
        })
      );
    } catch {
      await refresh();
      errorToast();
    }
  };

  const movePreset = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (busy || target < 0 || target >= presets.length) return;
    void persistOrder(
      move(presets, index, target),
      presets.map(item => item.id)
    );
  };

  const dropPreset = (targetId: number) => {
    if (!draggedId || draggedId === targetId || busy) return;
    const from = presets.findIndex(item => item.id === draggedId);
    const to = presets.findIndex(item => item.id === targetId);
    setDraggedId(null);
    if (from < 0 || to < 0) return;
    void persistOrder(
      move(presets, from, to),
      presets.map(item => item.id)
    );
  };

  const undo = async () => {
    if (!undoOrder || busy) return;
    const byId = new Map(presets.map(item => [item.id, item]));
    const restored = undoOrder
      .map(id => byId.get(id))
      .filter(Boolean) as Preset[];
    const previous = presets.map(item => item.id);
    setUndoOrder(null);
    await persistOrder(restored, previous);
  };

  return (
    <section
      className="mt-4 border-t border-slate-200 pt-4"
      aria-labelledby="activity-trend-presets-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4
            id="activity-trend-presets-title"
            className="flex items-center gap-1.5 text-xs font-black rr-text-navy"
          >
            <BookmarkPlus size={14} aria-hidden="true" />
            {t("activityTrend.presets.title", {
              defaultValue: "Saved export presets",
            })}
          </h4>
          <p className="mt-1 text-xs rr-text-navy-muted">
            {t("activityTrend.presets.help", {
              defaultValue:
                "Save and quickly reapply this date range and automation-type selection.",
            })}
          </p>
        </div>
        {undoOrder ? (
          <button
            type="button"
            onClick={() => void undo()}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-black rr-bg-navy rr-text-gold disabled:opacity-45"
          >
            <Undo2 size={14} aria-hidden="true" />
            {t("activityTrend.presets.undoOrder", {
              defaultValue: "Undo reorder",
            })}
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-xs font-bold rr-text-navy">
          {t("activityTrend.presets.nameLabel", {
            defaultValue: "Preset name",
          })}
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") void saveCurrent();
            }}
            maxLength={80}
            placeholder={t("activityTrend.presets.namePlaceholder", {
              defaultValue: "Example: Monthly performance",
            })}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </label>
        <button
          type="button"
          onClick={() => void saveCurrent()}
          disabled={busy || !name.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 self-end rounded-lg px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:opacity-45"
        >
          <Save size={15} aria-hidden="true" />
          {t("activityTrend.presets.save", { defaultValue: "Save preset" })}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-3 text-xs rr-text-navy-muted" role="status">
          {t("activityTrend.presets.loading", {
            defaultValue: "Loading saved presets…",
          })}
        </p>
      ) : presets.length === 0 ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-3 text-xs rr-text-navy-muted">
          {t("activityTrend.presets.empty", {
            defaultValue: "No saved export presets yet.",
          })}
        </p>
      ) : (
        <ul
          className="mt-3 grid gap-2"
          aria-label={t("activityTrend.presets.listLabel", {
            defaultValue: "Saved export presets",
          })}
        >
          {presets.map((preset, index) => (
            <li
              key={preset.id}
              draggable={!busy}
              onDragStart={() => setDraggedId(preset.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={event => event.preventDefault()}
              onDrop={() => dropPreset(preset.id)}
              className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span
                className="hidden cursor-grab p-2 text-slate-400 sm:inline-flex"
                aria-hidden="true"
              >
                <GripVertical size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black rr-text-navy">
                  {preset.name}
                </p>
                <p className="text-xs rr-text-navy-muted">
                  {preset.rangeKey === "custom"
                    ? t("activityTrend.presets.rangeCustom", {
                        start: preset.customStartDate,
                        end: preset.customEndDate,
                        defaultValue: "{{start}} to {{end}}",
                      })
                    : t("activityTrend.presets.rangeDays", {
                        count: Number(preset.rangeKey),
                        defaultValue: "{{count}} days",
                      })}
                  {" · "}
                  {t("activityTrend.presets.seriesCount", {
                    count: getSeries(preset).length,
                    defaultValue: "{{count}} types",
                  })}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onApply(getConfig(preset))}
                  disabled={busy}
                  className="min-h-11 rounded-lg px-3 text-xs font-black rr-bg-gold rr-text-navy disabled:opacity-45"
                >
                  {t("activityTrend.presets.apply", { defaultValue: "Apply" })}
                </button>
                <IconButton
                  label={t("activityTrend.presets.rename", {
                    name: preset.name,
                    defaultValue: "Rename {{name}}",
                  })}
                  onClick={() => void renamePreset(preset)}
                  disabled={busy}
                  icon={<Pencil size={14} aria-hidden="true" />}
                />
                <IconButton
                  label={t("activityTrend.presets.duplicate", {
                    name: preset.name,
                    defaultValue: "Duplicate {{name}}",
                  })}
                  onClick={() => void duplicatePreset(preset)}
                  disabled={busy}
                  icon={<Copy size={14} aria-hidden="true" />}
                />
                <IconButton
                  label={t("activityTrend.presets.moveUp", {
                    name: preset.name,
                    defaultValue: "Move {{name}} up",
                  })}
                  onClick={() => movePreset(index, -1)}
                  disabled={busy || index === 0}
                  icon={<ChevronUp size={15} aria-hidden="true" />}
                />
                <IconButton
                  label={t("activityTrend.presets.moveDown", {
                    name: preset.name,
                    defaultValue: "Move {{name}} down",
                  })}
                  onClick={() => movePreset(index, 1)}
                  disabled={busy || index === presets.length - 1}
                  icon={<ChevronDown size={15} aria-hidden="true" />}
                />
                <IconButton
                  label={t("activityTrend.presets.delete", {
                    name: preset.name,
                    defaultValue: "Delete {{name}}",
                  })}
                  onClick={() => void deletePreset(preset)}
                  disabled={busy}
                  danger
                  icon={<Trash2 size={14} aria-hidden="true" />}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <span className="sr-only" aria-live="polite">
        {busy
          ? t("activityTrend.presets.updating", {
              defaultValue: "Updating saved export presets.",
            })
          : ""}
      </span>
    </section>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  danger = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border disabled:opacity-35 ${
        danger ? "border-red-200 text-red-700" : "border-slate-300 rr-text-navy"
      }`}
    >
      {icon}
    </button>
  );
}
