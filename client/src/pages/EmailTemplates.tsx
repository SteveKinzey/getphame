/**
 * EmailTemplates — manage your saved email templates for review requests.
 *
 * All 3 starter templates are auto-seeded as real saved records on first visit.
 * Users can edit, delete, create new, and set any template as the default.
 *
 * Shortcodes: {{customerName}}, {{businessName}}, {{reviewLink}}, {{platformLinks}}
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  Star,
  Eye,
  EyeOff,
  MousePointerClick,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageFlyout from "@/components/LanguageFlyout";

// ── Types ────────────────────────────────────────────────────────────────────

type Template = {
  id: number;
  name: string;
  subject: string;
  body: string;
  isDefault: number | boolean;
  usageCount?: number;
  createdAt: Date;
};

type FormData = { name: string; subject: string; body: string; isDefault: boolean };

// ── Shortcode definitions ─────────────────────────────────────────────────────

const SHORTCODES = [
  {
    code: "{{customerName}}",
    label: "Customer Name",
    description: "Replaced with the recipient's first/full name",
    example: "Alex Johnson",
    color: "oklch(0.93 0.06 260)",
    textColor: "oklch(0.20 0.06 260)",
  },
  {
    code: "{{businessName}}",
    label: "Business Name",
    description: "Your business name from your profile",
    example: "SK America",
    color: "oklch(0.93 0.10 145)",
    textColor: "oklch(0.15 0.08 145)",
  },
  {
    code: "{{reviewLink}}",
    label: "Review Link",
    description: "Your default review platform URL (single link)",
    example: "https://g.page/r/...",
    color: "oklch(0.95 0.08 80)",
    textColor: "oklch(0.25 0.10 80)",
  },
  {
    code: "{{platformLinks}}",
    label: "All Platform Links",
    description: "A list of all your review platforms with their URLs",
    example: "- Google: https://...\n- Yelp: https://...",
    color: "oklch(0.94 0.06 30)",
    textColor: "oklch(0.25 0.08 30)",
  },
];

const emptyForm: FormData = {
  name: "",
  subject: "{{businessName}} would love your feedback!",
  body: `Hi {{customerName}},

Thank you for choosing {{businessName}}! We hope you had a great experience.

You can leave a review here:

{{platformLinks}}

Thank you so much for your support!

The {{businessName}} team

---
You received this email because you are a customer of {{businessName}}. To stop receiving these emails, reply with "unsubscribe".`,
  isDefault: false,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailTemplates() {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [shortcodeGuideOpen, setShortcodeGuideOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  const { data: templates = [], isLoading } = trpc.templates.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: templateTrackingStats = [] } = trpc.tracking.templateStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const templateStatsMap = new Map(
    (templateTrackingStats as Array<{ templateId: number; opens: number; clicks: number }>).map(
      (s) => [s.templateId, { opens: s.opens, clicks: s.clicks }]
    )
  );

  const topTemplateId: number | null = (() => {
    let best: { id: number; clicks: number } | null = null;
    for (const [id, stats] of Array.from(templateStatsMap.entries())) {
      if (stats.clicks > 0 && (!best || stats.clicks > best.clicks)) {
        best = { id, clicks: stats.clicks };
      }
    }
    return best ? best.id : null;
  })();

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: platforms = [] } = trpc.reviewPlatforms.list.useQuery(undefined, { enabled: isAuthenticated });
  const defaultPlatform = (platforms as Array<{ isDefault: number; url: string }>).find((p) => p.isDefault) ??
    (platforms as Array<{ url: string }>)[0];

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      utils.templates.getDefault.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Template saved!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      utils.templates.getDefault.invalidate();
      setDialogOpen(false);
      setEditTemplate(null);
      setForm(emptyForm);
      toast.success("Template updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      utils.templates.getDefault.invalidate();
      setDeleteTarget(null);
      toast.success("Template deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  function openCreate() {
    setEditTemplate(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(tpl: Template) {
    setEditTemplate(tpl);
    setForm({
      name: tpl.name,
      subject: tpl.subject,
      body: tpl.body,
      isDefault: Boolean(tpl.isDefault),
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
      isDefault: form.isDefault,
    };
    if (editTemplate) {
      updateMutation.mutate({ id: editTemplate.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  /** Insert a shortcode at the cursor position in the body textarea */
  function insertShortcode(code: string) {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, body: f.body + code }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newBody = el.value.slice(0, start) + code + el.value.slice(end);
    setForm((f) => ({ ...f, body: newBody }));
    // Restore cursor after the inserted code
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + code.length, start + code.length);
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Live preview substitution
  const sampleCustomer = "Alex Johnson";
  const sampleBusiness = profile?.businessName || "Your Business";
  const samplePhame = defaultPlatform?.url || "https://g.page/r/your-review-link";
  const samplePlatformLinks =
    (platforms as Array<{ label?: string; platform: string; url: string }>).length > 0
      ? (platforms as Array<{ label?: string; platform: string; url: string }>)
          .map((p) => `• ${p.label || p.platform}: ${p.url}`)
          .join("\n")
      : `• Google: https://g.page/r/your-review-link\n• Yelp: Search "Your Business" on Yelp`;

  function applyPreview(text: string) {
    return text
      .replace(/\{\{customerName\}\}/g, sampleCustomer)
      .replace(/\{\{businessName\}\}/g, sampleBusiness)
      .replace(/\{\{reviewLink\}\}/g, samplePhame)
      .replace(/\{\{platformLinks\}\}/g, samplePlatformLinks);
  }

  const previewSubject = applyPreview(form.subject);
  const previewBody = applyPreview(form.body);

  const typedTemplates = (templates as unknown as Template[]).map((t) => ({
    ...t,
    isDefault: Boolean(t.isDefault),
  }));

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* ── Header ── */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-1 text-base font-bold rr-text-gold transition-opacity"
          >
            <ChevronLeft size={16} /> Settings
          </button>
          <LanguageFlyout />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Email Templates
            </h1>
            <p className="text-base font-bold mt-1 text-white">
              {typedTemplates.length} template{typedTemplates.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Button
            onClick={openCreate}
            size="sm"
            className="font-bold rr-bg-gold rr-text-navy"
          >
            <Plus size={16} className="mr-1" /> New Template
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* ── Shortcode Reference Card ── */}
        <div
          className="rounded-2xl p-4 border"
          style={{ background: "oklch(0.97 0.02 260)", borderColor: "oklch(0.88 0.04 260)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Info size={15} style={{ color: "oklch(0.40 0.08 260)" }} />
              <p className="text-sm font-bold" style={{ color: "oklch(0.20 0.06 260)" }}>
                Available Shortcodes
              </p>
            </div>
            <button
              onClick={() => setShortcodeGuideOpen((v) => !v)}
              className="text-xs font-semibold"
              style={{ color: "oklch(0.30 0.08 260)", fontWeight: "bold" }}
            >
              {shortcodeGuideOpen ? "Hide" : "Show all"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SHORTCODES.map((sc) => (
              <span
                key={sc.code}
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                style={{ background: sc.color, color: sc.textColor }}
              >
                {sc.code}
              </span>
            ))}
          </div>

          {shortcodeGuideOpen && (
            <div className="mt-3 space-y-2">
              {SHORTCODES.map((sc) => (
                <div
                  key={sc.code}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: "white", border: `1px solid ${sc.color}` }}
                >
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ background: sc.color, color: sc.textColor }}
                  >
                    {sc.code}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{sc.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sc.description}</p>
                    <p className="text-xs mt-1 font-mono text-gray-400">e.g. {sc.example}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Template List ── */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading templates…</div>
        ) : typedTemplates.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No templates yet — create your first one above.</p>
          </div>
        ) : (
          typedTemplates.map((tpl) => {
            const stats = templateStatsMap.get(tpl.id);
            return (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Name + badges row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-gray-900">{tpl.name}</p>

                      {tpl.isDefault && (
                        <span
                          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "oklch(0.96 0.12 80)", color: "oklch(0.45 0.18 80)" }}
                        >
                          <Star size={10} fill="currentColor" /> Default
                        </span>
                      )}

                      {topTemplateId === tpl.id && (
                        <span
                          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "oklch(0.92 0.15 145)", color: "oklch(0.30 0.10 145)" }}
                        >
                          🏆 Best performer
                        </span>
                      )}

                      {(tpl.usageCount ?? 0) > 0 ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "oklch(0.95 0.02 260)", color: "oklch(0.45 0.05 260)" }}
                        >
                          Used {tpl.usageCount}×
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "oklch(0.96 0.01 260)", color: "oklch(0.60 0.03 260)" }}
                        >
                          Not used yet
                        </span>
                      )}

                      {stats && stats.opens > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "oklch(0.93 0.04 260)", color: "oklch(0.40 0.08 260)" }}
                        >
                          <Eye size={10} /> {stats.opens} opens
                        </span>
                      )}
                      {stats && stats.clicks > 0 && (
                        <span
                          className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "oklch(0.92 0.08 80)", color: "oklch(0.40 0.12 80)" }}
                        >
                          <MousePointerClick size={10} /> {stats.clicks} clicks
                        </span>
                      )}
                    </div>

                    {/* Subject line */}
                    <p className="text-sm text-gray-600 truncate">{tpl.subject}</p>

                    {/* Body preview */}
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-line">
                      {tpl.body}
                    </p>

                    {/* Shortcode chips used in this template */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {SHORTCODES.filter((sc) => tpl.body.includes(sc.code) || tpl.subject.includes(sc.code)).map(
                        (sc) => (
                          <span
                            key={sc.code}
                            className="text-xs font-mono px-1.5 py-0.5 rounded"
                            style={{ background: sc.color, color: sc.textColor, fontSize: "10px" }}
                          >
                            {sc.code}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(tpl)}
                      aria-label={`Edit ${tpl.name}`}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit template"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tpl)}
                      aria-label={`Delete ${tpl.name}`}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete template"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDialogOpen(false);
            setEditTemplate(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {editTemplate ? `Edit: ${editTemplate.name}` : "New Template"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setShowLivePreview((v) => !v)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors"
                style={{
                  background: showLivePreview ? "oklch(0.22 0.09 260)" : "oklch(0.96 0.01 260)",
                  color: showLivePreview ? "oklch(0.80 0.18 80)" : "oklch(0.45 0.05 260)",
                }}
              >
                {showLivePreview ? <EyeOff size={13} /> : <Eye size={13} />}
                {showLivePreview ? "Hide preview" : "Show preview"}
              </button>
            </div>
          </DialogHeader>

          <div className={`grid gap-5 ${showLivePreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {/* ── Left: Editor ── */}
            <div className="space-y-4">
              {/* Template Name */}
              <div>
                <Label className="font-bold text-gray-700">Template Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder='e.g. "Quick Favor" or "Post-Purchase Follow-up"'
                  className="mt-1"
                />
              </div>

              {/* Subject */}
              <div>
                <Label className="font-bold text-gray-700">Subject Line *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Quick favor, {{businessName}}?"
                  className="mt-1"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="font-bold text-gray-700">Email Body *</Label>
                  <span className="text-xs text-gray-400">Click a shortcode to insert it at your cursor</span>
                </div>

                {/* Shortcode insertion buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SHORTCODES.map((sc) => (
                    <button
                      key={sc.code}
                      type="button"
                      onClick={() => insertShortcode(sc.code)}
                      className="text-xs font-mono font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 active:scale-95"
                      style={{ background: sc.color, color: sc.textColor }}
                      title={sc.description}
                    >
                      + {sc.code}
                    </button>
                  ))}
                </div>

                <Textarea
                  ref={bodyRef}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={showLivePreview ? 12 : 16}
                  className="font-mono text-sm"
                  placeholder="Write your email body here. Use the shortcode buttons above to insert dynamic values."
                />

                {/* CAN-SPAM reminder */}
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-xs flex items-start gap-2"
                  style={{ background: "oklch(0.96 0.04 30)", color: "oklch(0.40 0.10 30)" }}
                >
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>CAN-SPAM tip:</strong> Include an unsubscribe line, e.g.{" "}
                    <em>reply with "unsubscribe"</em>. This is already included in the starter templates.
                  </span>
                </div>
              </div>

              {/* Set as default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
                <Label htmlFor="isDefault" className="cursor-pointer text-sm">
                  Set as default template (used automatically when sending)
                </Label>
              </div>
            </div>

            {/* ── Right: Live Preview ── */}
            {showLivePreview && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "oklch(0.45 0.05 260)" }}>
                    Live Preview
                  </p>
                  <p className="text-xs text-gray-400">
                    Showing with sample data: <strong>{sampleCustomer}</strong> · <strong>{sampleBusiness}</strong>
                  </p>
                </div>

                {/* Subject preview */}
                <div
                  className="rounded-xl p-3 border"
                  style={{ background: "oklch(0.98 0.01 260)", borderColor: "oklch(0.90 0.02 260)" }}
                >
                  <p className="text-xs font-bold mb-1 text-gray-500 uppercase tracking-wide">Subject</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {previewSubject || <span className="opacity-40 italic">No subject yet</span>}
                  </p>
                </div>

                {/* Body preview */}
                <div
                  className="rounded-xl border flex-1 overflow-hidden"
                  style={{ borderColor: "oklch(0.90 0.02 260)" }}
                >
                  {/* Email header bar */}
                  <div
                    className="px-3 py-2 flex items-center gap-2"
                    style={{ background: "oklch(0.94 0.01 260)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                    >
                      {sampleBusiness[0]?.toUpperCase() ?? "B"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{sampleBusiness}</p>
                      <p className="text-xs text-gray-500">To: {sampleCustomer}</p>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4 overflow-y-auto bg-white" style={{ maxHeight: "320px" }}>
                    <pre
                      className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
                      style={{ color: "oklch(0.25 0.03 260)" }}
                    >
                      {previewBody || (
                        <span className="opacity-40 italic">Start typing your email body…</span>
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="rr-bg-navy text-white font-bold"
            >
              {isSaving ? "Saving…" : editTemplate ? "Update Template" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
