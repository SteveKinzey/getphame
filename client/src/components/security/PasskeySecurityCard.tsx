import { useEffect, useRef, useState } from "react";
import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  Check,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearPasskeyEnrollmentEmail,
  readPasskeyEnrollmentEmail,
} from "@/lib/passkeyEnrollment";

type Passkey = {
  id: number;
  displayName: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: number;
  lastUsedAt: number | null;
};

function PasskeyRow({
  passkey,
  onChanged,
}: {
  passkey: Passkey;
  onChanged: () => Promise<void> | void;
}) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [name, setName] = useState(passkey.displayName);
  const rename = trpc.passkeys.rename.useMutation();
  const revoke = trpc.passkeys.revoke.useMutation();
  const pending = rename.isPending || revoke.isPending;
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage || "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await rename.mutateAsync({
        credentialId: passkey.id,
        displayName: trimmed,
      });
      await onChanged();
      setEditing(false);
      toast.success(
        t("passkeys.security.renameSuccess", {
          defaultValue: "Passkey renamed.",
        })
      );
    } catch {
      toast.error(
        t("passkeys.security.renameError", {
          defaultValue: "Passkey could not be renamed.",
        })
      );
    }
  }

  async function remove() {
    try {
      await revoke.mutateAsync({ credentialId: passkey.id });
      await onChanged();
      toast.success(
        t("passkeys.security.removeSuccess", {
          defaultValue: "Passkey removed.",
        })
      );
    } catch {
      toast.error(
        t("passkeys.security.removeError", {
          defaultValue: "Passkey could not be removed.",
        })
      );
    }
  }

  return (
    <li className="border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-foreground">
          <KeyRound size={17} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <label htmlFor={`passkey-name-${passkey.id}`} className="sr-only">
                {t("passkeys.security.nameLabel", {
                  defaultValue: "Passkey name",
                })}
              </label>
              <input
                id={`passkey-name-${passkey.id}`}
                value={name}
                maxLength={80}
                onChange={event => setName(event.target.value)}
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={pending || !name.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                aria-label={t("passkeys.security.saveName", {
                  defaultValue: "Save passkey name",
                })}
              >
                {rename.isPending ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Check size={16} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(passkey.displayName);
                  setEditing(false);
                }}
                disabled={pending}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground"
                aria-label={t("passkeys.security.cancelRename", {
                  defaultValue: "Cancel rename",
                })}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-foreground">
                  {passkey.displayName}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("passkeys.security.created", {
                    defaultValue: "Created {{date}}",
                    date: dateFormatter.format(new Date(passkey.createdAt)),
                  })}
                  {passkey.lastUsedAt
                    ? ` · ${t("passkeys.security.lastUsed", { defaultValue: "Last used {{date}}", date: dateFormatter.format(new Date(passkey.lastUsedAt)) })}`
                    : ""}
                </p>
                {passkey.backedUp && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck size={13} aria-hidden="true" />
                    {t("passkeys.security.synced", {
                      defaultValue: "Synced by your device provider",
                    })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("passkeys.security.rename", {
                  defaultValue: "Rename {{name}}",
                  name: passkey.displayName,
                })}
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
            </div>
          )}
          {!editing && (
            <div className="mt-3">
              {confirmingRemove ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-destructive/10 p-3">
                  <p className="w-full text-xs font-bold text-destructive">
                    {t("passkeys.security.removeConfirm", {
                      defaultValue:
                        "Remove this passkey? You will not be able to use it to sign in.",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={pending}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {revoke.isPending ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={14} aria-hidden="true" />
                    )}
                    {t("passkeys.security.confirmRemove", {
                      defaultValue: "Remove passkey",
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingRemove(false)}
                    disabled={pending}
                    className="min-h-9 rounded-lg bg-muted px-3 text-xs font-bold text-foreground"
                  >
                    {t("passkeys.security.cancel", { defaultValue: "Cancel" })}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  {t("passkeys.security.remove", { defaultValue: "Remove" })}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PasskeySecurityCard() {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeNeedsAction, setResumeNeedsAction] = useState(false);
  const resumeStarted = useRef(false);
  const enrollmentEmail = readPasskeyEnrollmentEmail();
  const supported = browserSupportsWebAuthn();
  const passkeys = trpc.passkeys.list.useQuery(undefined, {
    enabled: supported,
  });
  const beginRegistration = trpc.passkeys.beginRegistration.useMutation();
  const finishRegistration = trpc.passkeys.finishRegistration.useMutation();
  const pending = beginRegistration.isPending || finishRegistration.isPending;

  async function registerPasskey(isVerifiedResume = false) {
    setStatus(null);
    if (isVerifiedResume) setResumeNeedsAction(false);
    try {
      setStatus(
        t("passkeys.security.preparing", {
          defaultValue: "Preparing your secure device prompt…",
        })
      );
      const ceremony = await beginRegistration.mutateAsync();
      const response = await startRegistration({
        optionsJSON: ceremony.options,
      });
      setStatus(
        t("passkeys.security.verifying", {
          defaultValue: "Verifying your new passkey…",
        })
      );
      await finishRegistration.mutateAsync({
        ceremonyId: ceremony.ceremonyId,
        displayName:
          displayName.trim() ||
          t("passkeys.security.defaultName", { defaultValue: "My passkey" }),
        response,
      });
      setDisplayName("");
      setStatus(null);
      await passkeys.refetch();
      if (isVerifiedResume) {
        clearPasskeyEnrollmentEmail();
        setResumeOpen(false);
      }
      toast.success(
        t("passkeys.security.createSuccess", {
          defaultValue: "Passkey created. You can now use it to sign in.",
        })
      );
    } catch {
      setStatus(null);
      if (isVerifiedResume) setResumeNeedsAction(true);
      else
        toast.error(
          t("passkeys.security.createError", {
            defaultValue:
              "Passkey setup could not be completed. Please try again.",
          })
        );
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("passkey_enroll") !== "1" || resumeStarted.current) return;
    resumeStarted.current = true;
    params.delete("passkey_enroll");
    const nextSearch = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );
    setResumeOpen(true);
    if (!supported) {
      setResumeNeedsAction(true);
      return;
    }
    const timer = window.setTimeout(() => void registerPasskey(true), 120);
    return () => window.clearTimeout(timer);
  }, [supported]);

  function handleResumeOpenChange(open: boolean) {
    setResumeOpen(open);
    if (!open) clearPasskeyEnrollmentEmail();
  }

  return (
    <>
      <Dialog open={resumeOpen} onOpenChange={handleResumeOpenChange}>
        <DialogContent
          data-testid="passkey-enrollment-resume"
          className="w-[calc(100%-2rem)] max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {t("passkeys.enrollment.resumeTitle", {
                defaultValue: "Finish adding your passkey",
              })}
            </DialogTitle>
            <DialogDescription>
              {resumeNeedsAction
                ? t("passkeys.enrollment.resumeRetryDescription", {
                    defaultValue:
                      "Your account is verified. Select Continue to open your device’s fingerprint, face, or screen-lock prompt.",
                  })
                : enrollmentEmail
                  ? t("passkeys.enrollment.resumeDescription", {
                      defaultValue:
                        "Your account is verified. Complete the secure device prompt to add a passkey for {{email}}.",
                      email: enrollmentEmail,
                    })
                  : t("passkeys.enrollment.resumeDescriptionWithoutEmail", {
                      defaultValue:
                        "Your account is verified. Complete the secure device prompt to add your passkey.",
                    })}
            </DialogDescription>
          </DialogHeader>
          {enrollmentEmail && (
            <p className="break-all rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground">
              {enrollmentEmail}
            </p>
          )}
          {resumeNeedsAction && (
            <button
              type="button"
              onClick={() => void registerPasskey(true)}
              disabled={pending || !supported}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-60"
            >
              {pending ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <KeyRound size={17} aria-hidden="true" />
              )}
              {t("passkeys.enrollment.continue", {
                defaultValue: "Continue to device prompt",
              })}
            </button>
          )}
        </DialogContent>
      </Dialog>
      <section
        className="rounded-2xl bg-card p-5 text-card-foreground shadow-sm"
        aria-labelledby="passkey-security-title"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck size={19} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="passkey-security-title"
              className="text-base font-black text-foreground"
            >
              {t("passkeys.security.title", { defaultValue: "Passkeys" })}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("passkeys.security.description", {
                defaultValue:
                  "Add a phishing-resistant sign-in method using your device biometrics or screen lock. Email sign-in remains available as a fallback.",
              })}
            </p>
          </div>
        </div>
        {!supported ? (
          <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            {t("passkeys.security.unsupported", {
              defaultValue:
                "This browser cannot create passkeys. Try a current version of Chrome, Safari, Edge, or Firefox.",
            })}
          </p>
        ) : (
          <>
            <div className="mt-5 rounded-2xl bg-muted/70 p-4">
              <label
                htmlFor="new-passkey-name"
                className="text-xs font-bold text-foreground"
              >
                {t("passkeys.security.newNameLabel", {
                  defaultValue: "Passkey name",
                })}
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("passkeys.security.newNameHelp", {
                  defaultValue:
                    "Choose a name that helps you recognize this device.",
                })}
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="new-passkey-name"
                  value={displayName}
                  maxLength={80}
                  onChange={event => setDisplayName(event.target.value)}
                  placeholder={t("passkeys.security.namePlaceholder", {
                    defaultValue: "Example: Work laptop",
                  })}
                  disabled={pending}
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void registerPasskey(false)}
                  disabled={pending}
                  aria-busy={pending}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus size={17} aria-hidden="true" />
                  )}
                  {pending
                    ? t("passkeys.security.creating", {
                        defaultValue: "Creating…",
                      })
                    : t("passkeys.security.create", {
                        defaultValue: "Create passkey",
                      })}
                </button>
              </div>
              {status && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 text-sm font-semibold text-muted-foreground"
                >
                  {status}
                </p>
              )}
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-black text-foreground">
                {t("passkeys.security.savedTitle", {
                  defaultValue: "Saved passkeys",
                })}
              </h3>
              {passkeys.isLoading ? (
                <div
                  className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
                  role="status"
                >
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  {t("passkeys.security.loading", {
                    defaultValue: "Loading passkeys…",
                  })}
                </div>
              ) : passkeys.isError ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-semibold text-destructive"
                >
                  {t("passkeys.security.loadError", {
                    defaultValue: "Passkeys could not be loaded.",
                  })}
                </p>
              ) : passkeys.data?.length ? (
                <ul className="mt-3">
                  {passkeys.data.map(passkey => (
                    <PasskeyRow
                      key={passkey.id}
                      passkey={passkey}
                      onChanged={() => passkeys.refetch().then(() => undefined)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {t("passkeys.security.empty", {
                    defaultValue:
                      "No passkeys yet. Create one above to enable faster, phishing-resistant sign-in.",
                  })}
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
