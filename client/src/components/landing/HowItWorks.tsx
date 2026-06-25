import { ArrowRight } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";

const steps = [
  {
    number: "1",
    title: "Connect your email",
    description: "Link your Gmail, Outlook, or any SMTP email in 60 seconds. Credentials encrypted with AES-256.",
  },
  {
    number: "2",
    title: "Add your review link",
    description: "Paste your Google, Yelp, TripAdvisor, or any review platform link. Switch platforms anytime.",
  },
  {
    number: "3",
    title: "Import your customers",
    description: "Upload a CSV, sync from WooCommerce, or add contacts manually. We validate emails automatically.",
  },
  {
    number: "4",
    title: "Send & track results",
    description: "Hit send. Each customer gets a personal email from you. Track opens, clicks, and new reviews live.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.025_250)] via-background to-background" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          {/* Left — sticky headline */}
          <FadeUp className="lg:col-span-2 lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Setup in 4 steps
            </p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              Two minutes to your first review request
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              No technical skills needed. No onboarding calls. Just connect, import, and send.
            </p>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.2)]"
            >
              Get Started Free
              <ArrowRight size={18} />
            </a>
            <p className="text-sm text-muted-foreground mt-3">
              Takes less than 2 minutes to set up
            </p>
          </FadeUp>

          {/* Right — staggered steps */}
          <StaggerChildren className="lg:col-span-3 space-y-4" staggerDelay={0.12} baseDelay={0.1}>
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="group relative p-6 md:p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_40px_oklch(0.78_0.15_75/0.06)]"
              >
                {i < steps.length - 1 && (
                  <div className="absolute left-[2.1rem] md:left-[2.6rem] top-[4.5rem] bottom-[-1rem] w-[2px] bg-gradient-to-b from-primary/30 to-transparent" />
                )}
                <div className="flex gap-5 items-start">
                  <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                    <span className="font-display font-bold text-primary text-lg">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white mb-1.5">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </div>
    </section>
  );
}
