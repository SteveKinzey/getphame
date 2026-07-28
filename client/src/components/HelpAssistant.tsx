import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, Bot, ExternalLink, HelpCircle, Loader2, LockKeyhole, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SupportDialog from "@/components/landing/SupportDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { SUPPORTED_LANGS, type SupportedLang } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";

type Citation = { id: string; title: string; href: string };
type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  shouldEscalate?: boolean;
  redacted?: boolean;
  source?: "grounded" | "fallback";
};

const SOURCE_TITLE_KEYS: Record<string, { key: string; defaultValue: string }> = {
  "getting-started": { key: "helpAssistant.sources.gettingStarted", defaultValue: "Get Phame setup" },
  "email-connection": { key: "helpAssistant.sources.emailConnection", defaultValue: "Connect your sending email" },
  "sending-requests": { key: "helpAssistant.sources.sendingRequests", defaultValue: "Send an individual request" },
  "platform-compliance": { key: "helpAssistant.sources.compliance", defaultValue: "Review outreach compliance guide" },
  "contacts-import": { key: "helpAssistant.sources.contacts", defaultValue: "Contacts and consented imports" },
  reminders: { key: "helpAssistant.sources.reminders", defaultValue: "Follow-up reminders" },
  "developer-integrations": { key: "helpAssistant.sources.developer", defaultValue: "Developer Integrations" },
  "account-billing": { key: "helpAssistant.sources.billing", defaultValue: "Account and plan management" },
  "privacy-support": { key: "helpAssistant.sources.privacy", defaultValue: "Privacy and human support" },
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function HelpAssistant() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has("help"));
  const [supportOpen, setSupportOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const language = useMemo<SupportedLang>(() => {
    const resolved = i18n.resolvedLanguage || i18n.language;
    return SUPPORTED_LANGS.includes(resolved as SupportedLang) ? resolved as SupportedLang : "en";
  }, [i18n.language, i18n.resolvedLanguage]);

  const quickQuestions = [
    t("helpAssistant.quick.connectEmail", { defaultValue: "How do I connect my sending email?" }),
    t("helpAssistant.quick.googleLink", { defaultValue: "Where do I add my Google review link?" }),
    t("helpAssistant.quick.yelp", { defaultValue: "What should I know before using Yelp?" }),
  ];

  const ask = trpc.helpAssistant.ask.useMutation({
    onSuccess: (result) => {
      setMessages((current) => [...current, {
        id: createId(),
        role: "assistant",
        text: result.source === "fallback"
          ? t("helpAssistant.unknown", { defaultValue: "I could not find a reliable answer in the approved Get Phame help sources. Please open a support request so a person can review the details." })
          : result.answer,
        citations: result.citations,
        shouldEscalate: result.shouldEscalate,
        redacted: result.redacted,
        source: result.source,
      }]);
    },
    onError: () => {
      setMessages((current) => [...current, {
        id: createId(),
        role: "assistant",
        text: t("helpAssistant.unavailable", { defaultValue: "The help assistant is unavailable right now. Open a support request and our team can help." }),
        shouldEscalate: true,
        source: "fallback",
      }]);
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, ask.isPending]);

  const submitQuestion = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 600 || ask.isPending) return;
    setMessages((current) => [...current, { id: createId(), role: "user", text: trimmed }]);
    setQuestion("");
    ask.mutate({ question: trimmed, language });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(question);
  };

  const openSupport = () => {
    setOpen(false);
    window.setTimeout(() => setSupportOpen(true), 180);
  };

  const openCitation = (citation: Citation) => {
    if (citation.href.startsWith("/")) {
      setOpen(false);
      navigate(citation.href);
      return;
    }
    window.open(citation.href, "_blank", "noopener,noreferrer");
  };

  const mobileTriggerBottomClass = user
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+15rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            data-testid="help-assistant-trigger"
            className={`fixed ${mobileTriggerBottomClass} right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 py-3 font-display text-sm font-extrabold text-primary-foreground shadow-[0_8px_30px_oklch(0.22_0.09_260/0.28)] transition-all duration-200 hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/35 md:bottom-5 md:right-5`}
            aria-label={t("helpAssistant.open", { defaultValue: "Open Get Phame help" })}
          >
            <HelpCircle size={20} aria-hidden="true" />
            <span>{t("helpAssistant.trigger", { defaultValue: "Help" })}</span>
          </button>
        </DialogTrigger>

        <DialogContent className="flex h-[min(760px,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-border bg-background p-0 text-foreground shadow-2xl sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border bg-[var(--navy)] px-5 py-4 text-left sm:px-6">
            <div className="flex items-center gap-3 pr-8">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Bot size={21} aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="rr-h4 rr-on-dark">
                  {t("helpAssistant.title", { defaultValue: "Get Phame Help" })}
                </DialogTitle>
                <DialogDescription className="rr-l2 rr-on-dark-muted">
                  {t("helpAssistant.description", { defaultValue: "Grounded answers from approved product guidance" })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" role="log" aria-live="polite" aria-label={t("helpAssistant.conversation", { defaultValue: "Help conversation" })}>
            {messages.length === 0 ? (
              <div className="mx-auto max-w-lg space-y-5">
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 shrink-0 text-primary" size={19} aria-hidden="true" />
                    <div>
                      <p className="rr-h5">{t("helpAssistant.privateTitle", { defaultValue: "Keep private data out of chat" })}</p>
                      <p className="rr-b2 mt-1 text-muted-foreground">
                        {t("helpAssistant.privateBody", { defaultValue: "Do not enter passwords, API keys, card details, customer lists, or private review content. Questions are not saved as a durable chat transcript." })}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="rr-h5 mb-3">{t("helpAssistant.tryQuestion", { defaultValue: "Try a common question" })}</p>
                  <div className="grid gap-2">
                    {quickQuestions.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => submitQuestion(prompt)}
                        disabled={ask.isPending}
                        className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-card-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                      >
                        <span>{prompt}</span>
                        <ArrowRight size={17} className="shrink-0 text-primary" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <article key={message.id} className={`flex items-start gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "assistant" ? "bg-[var(--navy)] text-white" : "bg-primary text-primary-foreground"}`}>
                      {message.role === "assistant" ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
                    </span>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === "assistant" ? "border border-border bg-card text-card-foreground" : "bg-primary text-primary-foreground"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>

                      {message.redacted && (
                        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-foreground">
                          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                          {t("helpAssistant.redacted", { defaultValue: "A possible private value was removed before your question was processed." })}
                        </p>
                      )}

                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("helpAssistant.sourcesLabel", { defaultValue: "Approved sources" })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.citations.map((citation) => {
                              const localized = SOURCE_TITLE_KEYS[citation.id];
                              return (
                                <button
                                  key={citation.id}
                                  type="button"
                                  onClick={() => openCitation(citation)}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-left text-xs font-bold text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  {localized ? t(localized.key, { defaultValue: localized.defaultValue }) : citation.title}
                                  <ExternalLink size={12} aria-hidden="true" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {message.role === "assistant" && (message.shouldEscalate || message.source === "fallback") && (
                        <Button type="button" variant="secondary" size="sm" className="mt-3 min-h-10" onClick={openSupport}>
                          {t("helpAssistant.humanSupport", { defaultValue: "Open a support request" })}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
                {ask.isPending && (
                  <div className="flex items-center gap-2.5" role="status">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--navy)] text-white"><Bot size={16} aria-hidden="true" /></span>
                    <span className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      {t("helpAssistant.thinking", { defaultValue: "Checking approved guidance…" })}
                    </span>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-6">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="help-assistant-question" className="sr-only">
                  {t("helpAssistant.questionLabel", { defaultValue: "Ask a Get Phame question" })}
                </label>
                <Textarea
                  id="help-assistant-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 600))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitQuestion(question);
                    }
                  }}
                  rows={2}
                  maxLength={600}
                  disabled={ask.isPending}
                  placeholder={t("helpAssistant.placeholder", { defaultValue: "Ask how something works…" })}
                  className="min-h-12 resize-none bg-background"
                />
              </div>
              <Button type="submit" size="icon-lg" disabled={ask.isPending || question.trim().length < 3} aria-label={t("helpAssistant.send", { defaultValue: "Send help question" })}>
                {ask.isPending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{t("helpAssistant.disclaimer", { defaultValue: "Answers use approved Get Phame guidance and may need human review." })}</span>
              <button type="button" className="shrink-0 font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={openSupport}>
                {t("helpAssistant.supportLink", { defaultValue: "Human support" })}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} hideTrigger />
    </>
  );
}
