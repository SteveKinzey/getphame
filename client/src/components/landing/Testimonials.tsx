import { Star, ArrowRight, Quote } from "lucide-react";
import FadeUp, { StaggerChildren } from "./FadeUp";

const testimonials = [
  {
    quote: "I used to dread asking clients for reviews — it felt awkward and salesy. Get Phame sends the request from my own Gmail so it actually looks like I wrote it. I went from 12 Google reviews to 47 in six weeks.",
    name: "Sarah M.",
    role: "Freelance Photographer",
    initials: "SM",
    result: "12 → 47 reviews in 6 weeks",
  },
  {
    quote: "We serve about 80 customers a day. I import the week's regulars from a CSV on Friday, hit send, and by Monday morning we've usually picked up 8–10 new reviews. It's become part of our weekly routine.",
    name: "Tom R.",
    role: "Owner, The Corner Café",
    initials: "TR",
    result: "8–10 new reviews per week",
  },
  {
    quote: "As an agency managing 12 client locations, the lifetime deal was a no-brainer. Each client gets their own review link and I send requests on their behalf. The ROI paid for itself in the first month.",
    name: "David K.",
    role: "Digital Marketing Agency Owner",
    initials: "DK",
    result: "12 locations managed from one account",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/4 rounded-full blur-[80px]" />

      <div className="container relative z-10">
        <FadeUp className="max-w-2xl mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Real results</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            They asked. Customers answered.
          </h2>
          <p className="text-lg text-slate-200 font-medium">
            Real businesses using Get Phame to grow their reputation every week.
          </p>
        </FadeUp>

        <StaggerChildren className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12" staggerDelay={0.13}>
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`relative p-6 md:p-8 rounded-2xl backdrop-blur-sm border border-[#1e3050] hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_40px_oklch(0.78_0.15_75/0.06)] ${
                i === 0 ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.04_250/0.8)]" :
                i === 1 ? "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.17_0.03_240/0.8)]" :
                "bg-gradient-to-br from-[#0f1d32] to-[oklch(0.16_0.035_260/0.8)]"
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl rounded-tr-2xl" />
              <Quote size={20} className="text-primary/40 mb-4" />
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} className="text-primary fill-primary" />
                ))}
              </div>
              <p className="text-white leading-relaxed mb-6 text-sm md:text-[15px] font-medium">"{t.quote}"</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <span className="text-xs font-semibold text-emerald-400">{t.result}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{t.initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-sm text-slate-300 font-semibold">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </StaggerChildren>

        <FadeUp className="text-center">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-7 py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_30px_oklch(0.78_0.15_75/0.2)]"
          >
            Get Started Free
            <ArrowRight size={18} />
          </a>
        </FadeUp>
      </div>
    </section>
  );
}
