import { ArrowRight, Star } from "lucide-react";
import FadeUp from "./FadeUp";

export default function FinalCTA() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.12_0.025_250)] via-background to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/4 rounded-full blur-[120px]" />

      <div className="container relative z-10 text-center">
        <FadeUp>
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={28} className="text-primary fill-primary" />
            ))}
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl text-white mb-5 max-w-3xl mx-auto leading-tight">
            Your inbox. Your reputation.{" "}
            <span className="text-primary">Your growth.</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8">
            Free forever on the starter plan. No credit card. Set up in under 2 minutes. Start collecting 5-star reviews today.
          </p>
          <a
            href="https://getphame.app/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold text-lg rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_50px_oklch(0.78_0.15_75/0.3)]"
          >
            Get Started Free
            <ArrowRight size={20} />
          </a>
          <p className="text-sm text-muted-foreground mt-5">
            Join hundreds of businesses already growing their reputation with Get Phame.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
