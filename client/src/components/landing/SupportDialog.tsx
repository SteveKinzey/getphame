import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, Paperclip, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type FormValues = {
  name: string;
  email: string;
  topic: "billing" | "onboarding" | "technical";
  subject: string;
  message: string;
  website: string;
};

type UploadedAttachment = {
  key: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
};

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const initialValues: FormValues = {
  name: "",
  email: "",
  topic: "technical",
  subject: "",
  message: "",
  website: "",
};

type Translate = (key: string, options?: { defaultValue?: string }) => string;

function readFileAsBase64(file: File, errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(errorMessage));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(errorMessage));
        return;
      }
      resolve(reader.result.split(",", 2)[1] || "");
    };
    reader.readAsDataURL(file);
  });
}

function validate(
  values: FormValues,
  t: Translate
): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = t("landing.support.validation.email", {
      defaultValue: "Enter a valid email address.",
    });
  if (values.subject.trim().length < 3)
    errors.subject = t("landing.support.validation.subjectMin", {
      defaultValue: "Enter a subject with at least 3 characters.",
    });
  if (values.subject.trim().length > 120)
    errors.subject = t("landing.support.validation.subjectMax", {
      defaultValue: "Keep the subject to 120 characters or fewer.",
    });
  if (values.message.trim().length < 10)
    errors.message = t("landing.support.validation.messageMin", {
      defaultValue: "Tell us a little more so we can help.",
    });
  if (values.message.trim().length > 4000)
    errors.message = t("landing.support.validation.messageMax", {
      defaultValue: "Keep the message to 4,000 characters or fewer.",
    });
  if (values.name.trim().length > 80)
    errors.name = t("landing.support.validation.nameMax", {
      defaultValue: "Keep your name to 80 characters or fewer.",
    });
  return errors;
}

type SupportDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export default function SupportDialog({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: SupportDialogProps = {}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormValues, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const errors = validate(values, t);

  const submitSupport = trpc.support.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
    },
    onError: () => {
      setError(
        t("landing.support.error", {
          defaultValue:
            "We could not send your message. Please try again shortly.",
        })
      );
    },
  });
  const uploadScreenshot = trpc.support.uploadScreenshot.useMutation();

  useEffect(() => {
    if (open && !submitted) {
      window.setTimeout(() => nameRef.current?.focus(), 0);
    }
  }, [open, submitted]);

  const update = (key: keyof FormValues, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    if (Object.keys(errors).length > 0) return;

    setError(null);
    setAttachmentError(null);

    try {
      let uploadedAttachment = attachment;
      if (selectedFile && !uploadedAttachment) {
        const dataBase64 = await readFileAsBase64(
          selectedFile,
          t("landing.support.fileReadError", {
            defaultValue: "We could not read that screenshot.",
          })
        );
        const uploaded = await uploadScreenshot.mutateAsync({
          filename: selectedFile.name,
          mimeType: selectedFile.type as UploadedAttachment["mimeType"],
          dataBase64,
          website: values.website,
        });
        uploadedAttachment = uploaded.attachment;
        setAttachment(uploadedAttachment);
      }

      await submitSupport.mutateAsync({
        name: values.name.trim() || undefined,
        email: values.email.trim().toLowerCase(),
        topic: values.topic,
        subject: values.subject.trim(),
        message: values.message.trim(),
        attachment: uploadedAttachment ?? undefined,
        website: values.website,
      });
    } catch {
      setError(
        t("landing.support.error", {
          defaultValue:
            "We could not send your message. Please try again shortly.",
        })
      );
    }
  };

  const chooseAttachment = (file: File | null) => {
    setAttachmentError(null);
    setAttachment(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (
      !(["image/jpeg", "image/png", "image/webp"] as const).includes(
        file.type as UploadedAttachment["mimeType"]
      )
    ) {
      setSelectedFile(null);
      setAttachmentError(
        t("landing.support.attachmentType", {
          defaultValue: "Attach a JPG, PNG, or WebP screenshot.",
        })
      );
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setSelectedFile(null);
      setAttachmentError(
        t("landing.support.attachmentSize", {
          defaultValue: "Keep screenshots to 8 MB or less.",
        })
      );
      return;
    }
    setSelectedFile(file);
  };

  const reset = () => {
    setValues(initialValues);
    setTouched({});
    setSubmitted(false);
    setError(null);
    setSelectedFile(null);
    setAttachment(null);
    setAttachmentError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) window.setTimeout(reset, 150);
  };

  const fieldError = (key: keyof FormValues) =>
    touched[key] ? errors[key] : undefined;

  return (
    <Dialog open={open} onOpenChange={updateOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <button
            type="button"
            className="text-slate-200 font-medium transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#071121]"
          >
            {t("landing.footer.support", { defaultValue: "Support" })}
          </button>
        </DialogTrigger>
      )}
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[#34496d] bg-[#0b1830] text-white sm:max-w-xl"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl text-white">
            {t("landing.support.title", { defaultValue: "How can we help?" })}
          </DialogTitle>
          <DialogDescription className="max-w-md text-slate-200">
            {t("landing.support.description", {
              defaultValue:
                "Send our team a message and we’ll reply to the email address you provide.",
            })}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div
            className="space-y-4 rounded-xl border border-emerald-300/35 bg-emerald-400/10 p-5"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-emerald-300"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-emerald-100">
                  {t("landing.support.successTitle", {
                    defaultValue: "Your support request was sent.",
                  })}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-50">
                  {t("landing.support.successDescription", {
                    defaultValue:
                      "We’ll reply to the email address you provided as soon as we can.",
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-emerald-200/50 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-300/15"
            >
              {t("landing.support.sendAnother", {
                defaultValue: "Send another message",
              })}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="sr-only" aria-hidden="true">
              <label htmlFor={`${formId}-website`}>
                {t("landing.support.website", { defaultValue: "Website" })}
              </label>
              <input
                id={`${formId}-website`}
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={event => update("website", event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-name`}
                className="mb-1.5 block text-sm font-semibold text-white"
              >
                {t("landing.support.name", { defaultValue: "Name" })}{" "}
                <span className="text-slate-300">
                  ({t("landing.support.optional", { defaultValue: "optional" })}
                  )
                </span>
              </label>
              <input
                ref={nameRef}
                id={`${formId}-name`}
                value={values.name}
                onChange={event => update("name", event.target.value)}
                onBlur={() =>
                  setTouched(current => ({ ...current, name: true }))
                }
                maxLength={80}
                autoComplete="name"
                aria-invalid={Boolean(fieldError("name"))}
                aria-describedby={
                  fieldError("name") ? `${formId}-name-error` : undefined
                }
                className="w-full rounded-lg border border-[#496087] bg-[#07152d] px-3 py-2.5 text-white placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {fieldError("name") && (
                <p
                  id={`${formId}-name-error`}
                  className="mt-1.5 text-sm font-medium text-red-200"
                >
                  {fieldError("name")}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={`${formId}-email`}
                className="mb-1.5 block text-sm font-semibold text-white"
              >
                {t("landing.support.email", { defaultValue: "Email" })}
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={values.email}
                onChange={event => update("email", event.target.value)}
                onBlur={() =>
                  setTouched(current => ({ ...current, email: true }))
                }
                required
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(fieldError("email"))}
                aria-describedby={
                  fieldError("email") ? `${formId}-email-error` : undefined
                }
                className="w-full rounded-lg border border-[#496087] bg-[#07152d] px-3 py-2.5 text-white placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {fieldError("email") && (
                <p
                  id={`${formId}-email-error`}
                  className="mt-1.5 text-sm font-medium text-red-200"
                >
                  {fieldError("email")}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={`${formId}-topic`}
                className="mb-1.5 block text-sm font-semibold text-white"
              >
                {t("landing.support.topic", {
                  defaultValue: "What can we help with?",
                })}
              </label>
              <select
                id={`${formId}-topic`}
                value={values.topic}
                onChange={event => update("topic", event.target.value)}
                className="w-full rounded-lg border border-[#496087] bg-[#07152d] px-3 py-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="billing">
                  {t("landing.support.topicBilling", {
                    defaultValue: "Billing",
                  })}
                </option>
                <option value="onboarding">
                  {t("landing.support.topicOnboarding", {
                    defaultValue: "Onboarding",
                  })}
                </option>
                <option value="technical">
                  {t("landing.support.topicTechnical", {
                    defaultValue: "Technical issue",
                  })}
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor={`${formId}-subject`}
                className="mb-1.5 block text-sm font-semibold text-white"
              >
                {t("landing.support.subject", { defaultValue: "Subject" })}
              </label>
              <input
                id={`${formId}-subject`}
                value={values.subject}
                onChange={event => update("subject", event.target.value)}
                onBlur={() =>
                  setTouched(current => ({ ...current, subject: true }))
                }
                required
                minLength={3}
                maxLength={120}
                aria-invalid={Boolean(fieldError("subject"))}
                aria-describedby={
                  fieldError("subject") ? `${formId}-subject-error` : undefined
                }
                className="w-full rounded-lg border border-[#496087] bg-[#07152d] px-3 py-2.5 text-white placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {fieldError("subject") && (
                <p
                  id={`${formId}-subject-error`}
                  className="mt-1.5 text-sm font-medium text-red-200"
                >
                  {fieldError("subject")}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={`${formId}-message`}
                className="mb-1.5 block text-sm font-semibold text-white"
              >
                {t("landing.support.message", { defaultValue: "Message" })}
              </label>
              <Textarea
                id={`${formId}-message`}
                value={values.message}
                onChange={event => update("message", event.target.value)}
                onBlur={() =>
                  setTouched(current => ({ ...current, message: true }))
                }
                required
                minLength={10}
                maxLength={4000}
                rows={6}
                aria-invalid={Boolean(fieldError("message"))}
                aria-describedby={
                  fieldError("message")
                    ? `${formId}-message-error`
                    : `${formId}-message-hint`
                }
                className="border-[#496087] bg-[#07152d] text-white placeholder:text-slate-300 focus-visible:border-primary focus-visible:ring-primary"
              />
              <div className="mt-1.5 flex items-start justify-between gap-3">
                {fieldError("message") ? (
                  <p
                    id={`${formId}-message-error`}
                    className="text-sm font-medium text-red-200"
                  >
                    {fieldError("message")}
                  </p>
                ) : (
                  <p
                    id={`${formId}-message-hint`}
                    className="text-sm text-slate-200"
                  >
                    {t("landing.support.messageHint", {
                      defaultValue:
                        "Do not include passwords or card information.",
                    })}
                  </p>
                )}
                <span className="shrink-0 text-xs text-slate-200">
                  {values.message.length}/4000
                </span>
              </div>
            </div>
            <div>
              <label
                htmlFor={`${formId}-attachment`}
                className="mb-1.5 block text-sm font-semibold text-white"
              >
                {t("landing.support.attachment", {
                  defaultValue: "Screenshot",
                })}{" "}
                <span className="text-slate-300">
                  ({t("landing.support.optional", { defaultValue: "optional" })}
                  )
                </span>
              </label>
              <input
                ref={fileInputRef}
                id={`${formId}-attachment`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={event =>
                  chooseAttachment(event.target.files?.[0] ?? null)
                }
                aria-describedby={`${formId}-attachment-hint${attachmentError ? ` ${formId}-attachment-error` : ""}`}
                className="block w-full cursor-pointer rounded-lg border border-[#496087] bg-[#07152d] text-sm text-slate-100 file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-primary-foreground hover:file:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p
                id={`${formId}-attachment-hint`}
                className="mt-1.5 text-sm text-slate-200"
              >
                {t("landing.support.attachmentHint", {
                  defaultValue: "JPG, PNG, or WebP only. Maximum 8 MB.",
                })}
              </p>
              {selectedFile && !attachmentError && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#496087] bg-[#07152d] px-3 py-2 text-sm text-slate-100">
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip size={15} aria-hidden="true" />
                    <span className="truncate">{selectedFile.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => chooseAttachment(null)}
                    className="rounded p-1 text-slate-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={t("landing.support.removeAttachment", {
                      defaultValue: "Remove screenshot",
                    })}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
              {attachmentError && (
                <p
                  id={`${formId}-attachment-error`}
                  className="mt-1.5 text-sm font-medium text-red-200"
                  role="alert"
                >
                  {attachmentError}
                </p>
              )}
            </div>
            {error && (
              <p
                className="rounded-lg border border-red-300/45 bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-100"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitSupport.isPending || uploadScreenshot.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_0_20px_oklch(0.78_0.15_75/0.25)] transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitSupport.isPending || uploadScreenshot.isPending ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  {uploadScreenshot.isPending
                    ? t("landing.support.uploading", {
                        defaultValue: "Uploading screenshot…",
                      })
                    : t("landing.support.sending", {
                        defaultValue: "Sending…",
                      })}
                </>
              ) : (
                <>
                  <Send size={16} aria-hidden="true" />
                  {t("landing.support.submit", {
                    defaultValue: "Send support request",
                  })}
                </>
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
