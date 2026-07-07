import { useState } from "react";
import { Mail, ArrowRight, Check, Loader2 } from "lucide-react";
import FadeUp from "./FadeUp";
import { trpc } from "@/lib/trpc";

export default function LeadCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = trpc.leadCapture.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
    },
    onError: (err: { message?: string }) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    submitLead.mutate({ email });
  };

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <FadeUp className="max-w-2xl mx-auto">
          <div className="relative p-8 md:p-12 rounded-3xl bg-[#0f1d32] border border-[#1e3050] hover:border-primary/20 transition-colors duration-300 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-[4rem]" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-tr-[3rem]" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <Mail size={24} className="text-primary" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
                Not ready to commit?
              </h2>
              <p className="text-slate-200 font-medium mb-8 max-w-md mx-auto">
                Get a free guide on how to 3× your Google reviews in 30 days — plus early access to new features and reputation tips.
              </p>

              {!submitted ? (
                <>
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={submitLead.isPending}
                      className="flex-1 px-4 py-3.5 bg-[#1a2744] border border-[#2a3a5c] rounded-xl text-white placeholder:text-slate-400 font-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={submitLead.isPending}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] whitespace-nowrap shadow-[0_0_20px_oklch(0.78_0.15_75/0.2)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitLead.isPending ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Guide
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>
                  {error && (
                    <p className="text-sm text-red-400 font-medium mt-3">{error}</p>
                  )}
                </>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={18} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Check your inbox — guide is on the way!</span>
                </div>
              )}

              <p className="text-sm text-slate-300 font-medium mt-4">
                No spam. Unsubscribe anytime. We respect your inbox.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
