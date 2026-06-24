import { useState } from "react";
import { Mail, ArrowRight, Check } from "lucide-react";
import FadeUp from "./FadeUp";

export default function LeadCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <FadeUp className="max-w-2xl mx-auto">
          <div className="relative p-8 md:p-12 rounded-3xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/20 transition-colors duration-300 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-[4rem]" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-tr-[3rem]" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <Mail size={24} className="text-primary" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
                Not ready to commit?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get a free guide on how to 3× your Google reviews in 30 days — plus early access to new features and reputation tips.
              </p>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="flex-1 px-4 py-3.5 bg-background border border-border/50 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] whitespace-nowrap shadow-[0_0_20px_oklch(0.78_0.15_75/0.2)]"
                  >
                    Send Guide
                    <ArrowRight size={15} />
                  </button>
                </form>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={18} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Check your inbox — guide is on the way!</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                No spam. Unsubscribe anytime. We respect your inbox.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
