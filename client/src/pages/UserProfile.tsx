// Phame — User Profile Settings Page
// Lets users update display name, default From Email, From Name, and upload a profile picture
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Tag, Save, Loader2, CheckCircle2, Camera } from "lucide-react";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function UserProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState(user?.name ?? "");
  const [defaultFromEmail, setDefaultFromEmail] = useState(user?.defaultFromEmail ?? "");
  const [defaultFromName, setDefaultFromName] = useState(user?.defaultFromName ?? "");
  const [saved, setSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // Keep form in sync if user data loads after mount
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setDefaultFromEmail(user.defaultFromEmail ?? "");
      setDefaultFromName(user.defaultFromName ?? "");
      setAvatarPreview((user as any).avatarUrl ?? null);
    }
  }, [user?.id]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadAvatar = trpc.auth.uploadAvatar.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      setAvatarPreview(data.avatarUrl);
      toast.success("Profile picture updated");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") {
      toast.error("Upload a JPG, PNG, or WebP image");
      return;
    }
    const mimeType: "image/jpeg" | "image/png" | "image/webp" = file.type;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setAvatarPreview(dataUrl);
      uploadAvatar.mutate({ base64, mimeType });
    };
    reader.readAsDataURL(file);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProfile.mutate({
      name: name.trim() || undefined,
      defaultFromEmail: defaultFromEmail.trim() || null,
      defaultFromName: defaultFromName.trim() || null,
    });
  }

  const initials = (user?.name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => {
      toast.success("Account deleted. Goodbye!");
      setTimeout(() => { window.location.href = "/"; }, 1200);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-[oklch(0.22_0.09_260)] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[oklch(0.22_0.09_260)]/90 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/settings")} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-semibold text-white text-lg">Edit Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[oklch(0.80_0.18_80)]/20 border-2 border-[oklch(0.80_0.18_80)]/40 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-[oklch(0.80_0.18_80)]">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[oklch(0.80_0.18_80)] flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="w-4 h-4 text-black animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-black" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
      accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-sm text-white/50">Tap the camera icon to upload a photo (max 5 MB)</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <User className="w-4 h-4" /> Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[oklch(0.80_0.18_80)]/60 transition-colors"
            />
          </div>

          {/* Default From Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Default From Email
            </label>
            <input
              type="email"
              value={defaultFromEmail}
              onChange={(e) => setDefaultFromEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[oklch(0.80_0.18_80)]/60 transition-colors"
            />
            <p className="text-xs text-white/40">Used as the default sender address for review request emails.</p>
          </div>

          {/* Default From Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Default From Name
            </label>
            <input
              type="text"
              value={defaultFromName}
              onChange={(e) => setDefaultFromName(e.target.value)}
              placeholder="Your Business Name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[oklch(0.80_0.18_80)]/60 transition-colors"
            />
            <p className="text-xs text-white/40">Shown as the sender name in outgoing emails.</p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="w-full py-3.5 rounded-xl font-semibold text-black bg-[oklch(0.80_0.18_80)] hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateProfile.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <><CheckCircle2 className="w-5 h-5" /> Saved!</>
            ) : (
              <><Save className="w-5 h-5" /> Save Changes</>
            )}
          </button>
        </form>

        {/* ── Danger Zone ─────────────────────────────────────────────────── */}
        <div className="border border-red-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">Danger Zone</span>
          </div>
          <p className="text-sm text-white/50">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/40 hover:bg-red-500/10 active:scale-[0.97] transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[oklch(0.22_0.09_260)] border border-red-500/40 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">Delete Account</h2>
                <p className="text-xs text-white/50">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-white/70">
              All your contacts, campaigns, settings, and data will be permanently removed.
              To confirm, type your email address below:
            </p>
            <div className="space-y-1">
              <p className="text-xs text-white/40 font-mono">{user?.email}</p>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Type your email to confirm"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-red-500/60 transition-colors text-sm"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmEmail(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/70 border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={confirmEmail !== user?.email || deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteAccount.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete Forever</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
