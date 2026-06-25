import { Mail, Users, Globe } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";

const features = [
  {
    icon: Mail,
    title: "Your name. Your inbox. Their trust.",
    description:
      "Every review request arrives from your actual email address. Customers recognize the sender, so they open it — and they respond.",
    stat: "45–60%",
    statLabel: "avg. open rate",
  },
  {
    icon: Users,
    title: "One click sends to hundreds",
    description:
      "Import your customer list via CSV or WooCommerce sync, select all, and send personalized requests in seconds. No copy-pasting. No manual work.",
    stat: "500+",
    statLabel: "sends per batch",
  },
  {
    icon: Globe,
    title: "Every platform. Your choice.",
    description:
      "Google, Yelp, TripAdvisor, Bing, Facebook, Trustpilot, and more. Paste your link, switch platforms anytime. One tool for all your review destinations.",
    stat: "10+",
    statLabel: "platforms supported",
  },
];

export default function Features() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <FadeUp className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Why it works
          </p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            From your inbox to their review
          </h2>
          <p className="text-lg text-muted-foreground">
            The simplest way to turn happy customers into 5-star reviews — without expensive tools or awkward conversations.
          </p>
        </FadeUp>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 lg:gap-8" staggerDelay={0.12}>
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative p-8 rounded-2xl border border-border/50 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_50px_oklch(0.78_0.15_75/0.08)] backdrop-blur-sm ${
                i === 0 ? "bg-gradient-to-br from-card to-[oklch(0.16_0.04_250)]" :
                i === 1 ? "bg-gradient-to-br from-card to-[oklch(0.17_0.03_240)]" :
                "bg-gradient-to-br from-card to-[oklch(0.16_0.035_260)]"
              }`}
            >
              <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                <feature.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {feature.description}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/15">
                <span className="font-display font-extrabold text-lg text-primary">{feature.stat}</span>
                <span className="text-xs text-muted-foreground">{feature.statLabel}</span>
              </div>
            </div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
