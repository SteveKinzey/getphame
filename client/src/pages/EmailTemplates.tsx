/**
 * EmailTemplates — create and manage custom email templates for review requests.
 * Supports {{customerName}}, {{businessName}}, {{reviewLink}} placeholders.
 */
import { useState } from "react";
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
import { FileText, Plus, Pencil, Trash2, ChevronLeft, Star, Eye, EyeOff, MousePointerClick } from "lucide-react";
import { useLocation } from "wouter";

type Template = {
  id: number;
  name: string;
  usageCount?: number;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: number;
};

type FormData = { name: string; subject: string; body: string; isDefault: boolean };

const DEFAULT_BODY = `Hi {{customerName}},

Thank you for choosing {{businessName}}! We hope you had a great experience.

Could you take 30 seconds to leave us a quick review? It means the world to us and helps other customers find us.

👉 {{reviewLink}}

Thank you so much for your support!

The {{businessName}} team

---
You received this email because you are a customer of {{businessName}}. To stop receiving these emails, reply with "unsubscribe".`;

const emptyForm: FormData = {
  name: "",
  subject: "{{businessName}} would love your feedback!",
  body: DEFAULT_BODY,
  isDefault: false,
};

const PLACEHOLDERS = ["{{customerName}}", "{{businessName}}", "{{reviewLink}}"];

export default function EmailTemplates() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);

  const utils = trpc.useUtils();

  const { data: templates = [], isLoading } = trpc.templates.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch per-template open/click stats
  const { data: templateTrackingStats = [] } = trpc.tracking.templateStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const templateStatsMap = new Map(
    templateTrackingStats.map((s) => [s.templateId, { opens: s.opens, clicks: s.clicks }])
  );

  // Fetch real profile data for live preview substitution
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: platforms = [] } = trpc.reviewPlatforms.list.useQuery(undefined, { enabled: isAuthenticated });
  const defaultPlatform = (platforms as Array<{ isDefault: number; url: string }>).find((p) => p.isDefault) ?? (platforms as Array<{ url: string }>)[0];

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      utils.templates.getDefault.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Template saved.");
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
      toast.success("Template updated.");
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

  function openEdit(t: Template) {
    setEditTemplate({ ...t, isDefault: Boolean(t.isDefault) });
    setForm({ name: t.name, subject: t.subject, body: t.body, isDefault: t.isDefault });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error("Name, subject, and body are required.");
      return;
    }
    const payload = { name: form.name.trim(), subject: form.subject.trim(), body: form.body.trim(), isDefault: form.isDefault };
    if (editTemplate) {
      updateMutation.mutate({ id: editTemplate.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function insertPlaceholder(ph: string) {
    setForm((f) => ({ ...f, body: f.body + ph }));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Preview: replace placeholders with real profile data (or sample fallbacks)
  const sampleCustomer = "Alex Johnson";
  const sampleBusiness = profile?.businessName || "Your Business";
  const sampleReviewLink = defaultPlatform?.url || "https://g.page/r/your-review-link";

  function applyPreview(text: string) {
    return text
      .replace(/\{\{customerName\}\}/g, sampleCustomer)
      .replace(/\{\{businessName\}\}/g, sampleBusiness)
      .replace(/\{\{reviewLink\}\}/g, sampleReviewLink);
  }

  const previewSubject = applyPreview(form.subject);
  const previewBody = applyPreview(form.body);

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-1 mb-4 text-sm opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ChevronLeft size={16} /> Settings
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Email Templates
            </h1>
            <p className="text-sm mt-1 opacity-70 text-white">Customise your review request messages</p>
          </div>
          <Button
            onClick={openCreate}
            size="sm"
            className="font-bold"
            style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
          >
            <Plus size={16} className="mr-1" /> New
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Placeholder hint */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          <strong>Available placeholders:</strong>{" "}
          {PLACEHOLDERS.map((p) => (
            <code key={p} className="bg-blue-100 rounded px-1 mx-0.5">{p}</code>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No templates yet</p>
            <p className="text-gray-400 text-sm mt-1">Create a template to personalise your review requests</p>
          </div>
        ) : (
          (templates as unknown as Template[]).map((t) => ({ ...t, isDefault: Boolean(t.isDefault) })).map((t) => (
            <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 truncate">{t.name}</p>
                    {t.isDefault && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "oklch(0.96 0.12 80)", color: "oklch(0.55 0.18 80)" }}>
                        <Star size={10} fill="currentColor" /> Default
                      </span>
                    )}
                    {((t as Template & { usageCount?: number }).usageCount ?? 0) > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "oklch(0.95 0.02 260)", color: "oklch(0.45 0.05 260)" }}>
                        Used {(t as Template & { usageCount?: number }).usageCount} {((t as Template & { usageCount?: number }).usageCount ?? 0) === 1 ? "time" : "times"}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "oklch(0.97 0.01 260)", color: "oklch(0.65 0.03 260)" }}>
                        Not used yet
                      </span>
                    )}
                    {/* Open / click tracking badges */}
                    {templateStatsMap.has(t.id) && (
                      <>
                        {(templateStatsMap.get(t.id)!.opens > 0) && (
                          <span
                            className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "oklch(0.93 0.04 260)", color: "oklch(0.40 0.08 260)" }}
                            title="Total opens for emails sent with this template"
                          >
                            <Eye size={10} /> {templateStatsMap.get(t.id)!.opens} open{templateStatsMap.get(t.id)!.opens !== 1 ? "s" : ""}
                          </span>
                        )}
                        {(templateStatsMap.get(t.id)!.clicks > 0) && (
                          <span
                            className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "oklch(0.92 0.08 80)", color: "oklch(0.40 0.12 80)" }}
                            title="Total review link clicks for emails sent with this template"
                          >
                            <MousePointerClick size={10} /> {templateStatsMap.get(t.id)!.clicks} click{templateStatsMap.get(t.id)!.clicks !== 1 ? "s" : ""}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-line">{t.body}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Dialog — wide layout with live preview */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditTemplate(null); setForm(emptyForm); } }}>
        <DialogContent className="w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editTemplate ? "Edit Template" : "New Template"}</DialogTitle>
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
                {showLivePreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>
          </DialogHeader>

          <div className={`grid gap-4 ${showLivePreview ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {/* ── Left: Editor ── */}
            <div className="space-y-3">
              <div>
                <Label>Template name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard follow-up" />
              </div>
              <div>
                <Label>Subject line *</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="{{businessName}} would love your feedback!" />
              </div>
              <div>
                <Label>Body *</Label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p)}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={showLivePreview ? 10 : 12}
                  className="font-mono text-sm"
                  placeholder="Write your email body here…"
                />
                <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.06 30)" }}>
                  <strong>CAN-SPAM tip:</strong> Include an unsubscribe line in your template. Use{" "}
                  <code className="bg-gray-100 px-1 rounded text-xs">reply with "unsubscribe"</code>{" "}
                  or a similar phrase so recipients can opt out.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">Set as default template</Label>
              </div>
            </div>

            {/* ── Right: Live Preview ── */}
            {showLivePreview && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.03 260)" }}>
                  Live Preview
                </p>
                <p className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>
                  Sample: <strong>{sampleCustomer}</strong> · {sampleBusiness}
                </p>

                {/* Subject preview */}
                <div className="rounded-xl p-3 border" style={{ background: "oklch(0.97 0.01 260)", borderColor: "oklch(0.90 0.02 260)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.55 0.03 260)" }}>SUBJECT</p>
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.22 0.09 260)" }}>
                    {previewSubject || <span className="opacity-40 italic">No subject yet</span>}
                  </p>
                </div>

                {/* Body preview — email-style card */}
                <div
                  className="rounded-xl border flex-1 overflow-hidden"
                  style={{ borderColor: "oklch(0.90 0.02 260)" }}
                >
                  {/* Email header bar */}
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: "oklch(0.94 0.01 260)" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}>
                      {sampleBusiness[0]?.toUpperCase() ?? "B"}
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>{sampleBusiness}</p>
                      <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>To: {sampleCustomer}</p>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-3 overflow-y-auto" style={{ maxHeight: "280px", background: "white" }}>
                    <pre
                      className="text-sm whitespace-pre-wrap font-sans"
                      style={{ color: "oklch(0.25 0.03 260)", lineHeight: "1.6" }}
                    >
                      {previewBody || <span className="opacity-40 italic">No body yet</span>}
                    </pre>
                  </div>
                </div>

                {/* Review link highlight */}
                {form.body.includes("{{reviewLink}}") && (
                  <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "oklch(0.96 0.06 145)", color: "oklch(0.35 0.12 145)" }}>
                    <strong>Review link:</strong>{" "}
                    <span className="break-all">{sampleReviewLink}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} style={{ background: "oklch(0.22 0.09 260)", color: "white" }}>
              {isSaving ? "Saving…" : editTemplate ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Subject</p>
              <p className="font-medium text-gray-800">
                {form.subject
                  .replace(/\{\{customerName\}\}/g, "Jane Smith")
                  .replace(/\{\{businessName\}\}/g, "Acme Co.")
                  .replace(/\{\{reviewLink\}\}/g, "https://g.page/r/your-review-link")}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Body</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{previewBody}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This cannot be undone.
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
