/**
 * SavedContacts — manage repeat customers for re-sending review requests.
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
import { UserPlus, Send, Pencil, Trash2, ChevronLeft, Mail, Phone, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

type Contact = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  lastSentAt: number | null;
  totalSent: number;
};

type FormData = { name: string; email: string; phone: string; notes: string };
const emptyForm: FormData = { name: "", email: "", phone: "", notes: "" };

export default function SavedContacts() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [sendTarget, setSendTarget] = useState<Contact | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const utils = trpc.useUtils();

  const { data: contacts = [], isLoading } = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Contact saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setDialogOpen(false);
      setEditContact(null);
      setForm(emptyForm);
      toast.success("Contact updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setDeleteTarget(null);
      toast.success("Contact deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = trpc.requests.send.useMutation({
    onSuccess: () => {
      if (sendTarget) {
        markSentMutation.mutate({ id: sendTarget.id });
      }
      utils.contacts.list.invalidate();
      utils.requests.stats.invalidate();
      setSendTarget(null);
      toast.success("Review request sent!");
    },
    onError: (e) => {
      setSendTarget(null);
      toast.error(e.message);
    },
  });

  const markSentMutation = trpc.contacts.markSent.useMutation();

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) return null;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  function openCreate() {
    setEditContact(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Contact) {
    setEditContact(c);
    setForm({ name: c.name, email: c.email, phone: c.phone ?? "", notes: c.notes ?? "" });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editContact) {
      updateMutation.mutate({ id: editContact.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mb-4 text-sm opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Saved Contacts
            </h1>
            <p className="text-sm mt-1 opacity-70 text-white">Re-send review requests to repeat customers</p>
          </div>
          <Button
            onClick={openCreate}
            size="sm"
            className="font-bold"
            style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
          >
            <UserPlus size={16} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-4 pr-10 bg-white border-gray-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {search ? "No matches found" : "No saved contacts yet"}
            </p>
            {!search && (
              <p className="text-gray-400 text-sm mt-1">Add customers you want to re-contact regularly</p>
            )}
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{c.name}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <Mail size={12} />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                      <Phone size={12} />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic truncate">{c.notes}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                      Sent {c.totalSent} time{c.totalSent !== 1 ? "s" : ""}
                    </span>
                    {c.lastSentAt && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} />
                        Last: {format(new Date(c.lastSentAt), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Button
                    size="sm"
                    onClick={() => setSendTarget(c)}
                    className="font-bold text-xs px-3"
                    style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
                  >
                    <Send size={13} className="mr-1" /> Send
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditContact(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{editContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Regular customer, prefers email" rows={2} />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} style={{ background: "oklch(0.22 0.09 260)", color: "white" }}>
              {isSaving ? "Saving…" : editContact ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> from your saved contacts. This cannot be undone.
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

      {/* Send Confirm */}
      <AlertDialog open={!!sendTarget} onOpenChange={(o) => { if (!o) setSendTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send review request?</AlertDialogTitle>
            <AlertDialogDescription>
              Send a review request email to <strong>{sendTarget?.name}</strong> ({sendTarget?.email})?
              {sendTarget && sendTarget.totalSent > 0 && (
                <span className="block mt-1 text-amber-600 text-sm">
                  This customer has already received {sendTarget.totalSent} request{sendTarget.totalSent !== 1 ? "s" : ""}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                sendTarget &&
                sendMutation.mutate({
                  customerName: sendTarget.name,
                  customerEmail: sendTarget.email,
                  method: "email",
                })
              }
              disabled={sendMutation.isPending}
              style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
            >
              {sendMutation.isPending ? "Sending…" : "Send Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
