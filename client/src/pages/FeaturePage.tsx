import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  MessageSquareText,
  Repeat2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import SEOHead from "@/components/landing/SEOHead";

type WorkflowStep = {
  title: string;
  description: string;
};

type Benefit = {
  title: string;
  description: string;
};

type FAQItem = {
  question: string;
  answer: string;
};

export type FeaturePageConfig = {
  slug: "review-requests" | "email-campaigns" | "reputation-management";
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  headline: string;
  introduction: string;
  supportingHeading: string;
  supportingCopy: string;
  icon: LucideIcon;
  benefits: Benefit[];
  workflowTitle: string;
  workflowSteps: WorkflowStep[];
  faq: FAQItem[];
};

export const reviewRequestsFeature: FeaturePageConfig = {
  slug: "review-requests",
  title: "Review Request Software for Local Businesses | Get Phame",
  description:
    "Create personalized review request emails, direct customers to the right review link, and track campaign engagement from one simple workspace.",
  keywords: [
    "review request software",
    "review request emails",
    "customer feedback",
    "local business reviews",
  ],
  eyebrow: "Review request software",
  headline: "Make every review request feel like a personal follow-up",
  introduction:
    "Get Phame helps local businesses send timely, branded review requests without turning a customer relationship into a bulk-email exercise.",
  supportingHeading: "A clearer path from completed service to customer feedback",
  supportingCopy:
    "Keep the request connected to the work you just completed, guide customers to the review destination you manage, and see which outreach is earning attention.",
  icon: MessageSquareText,
  benefits: [
    {
      title: "Personalize the ask",
      description: "Use a message that sounds like your business and arrives from the email account customers already recognize.",
    },
    {
      title: "Send customers to the right place",
      description: "Keep your review destinations organized so every request points to the platform that matters to your business.",
    },
    {
      title: "See engagement clearly",
      description: "Track sends, opens, and clicks to understand which follow-ups are gaining attention.",
    },
  ],
  workflowTitle: "How review request campaigns work",
  workflowSteps: [
    { title: "Connect your sending email", description: "Use your existing business inbox so messages remain familiar and accountable." },
    { title: "Choose a review destination", description: "Add the review links you want customers to use and select the right one for the request." },
    { title: "Send and learn", description: "Deliver a considerate follow-up, then use engagement signals to refine future outreach." },
  ],
  faq: [
    { question: "Can I use my own business email?", answer: "Yes. Get Phame is designed to send through the email account your business already uses for customer communication." },
    { question: "Can I manage more than one review link?", answer: "Yes. Keep the destinations you use organized and choose the appropriate link for each campaign." },
    { question: "Does Get Phame filter customer feedback?", answer: "No. The workflow is built around direct, respectful review requests rather than filtering customers by expected sentiment." },
  ],
};

export const emailCampaignsFeature: FeaturePageConfig = {
  slug: "email-campaigns",
  title: "Email Campaigns for Review Requests | Get Phame",
  description:
    "Build personalized email campaigns for review requests, schedule respectful follow-ups, and measure engagement without leaving your own workflow.",
  keywords: [
    "review request email campaigns",
    "review follow-up emails",
    "customer email outreach",
    "email engagement tracking",
  ],
  eyebrow: "Email campaigns",
  headline: "Turn one customer follow-up into a repeatable email campaign",
  introduction:
    "Plan a consistent review-request cadence while keeping the message personal, the sender familiar, and the next action easy for customers to understand.",
  supportingHeading: "Campaign structure without impersonal bulk-email behavior",
  supportingCopy:
    "Build useful templates, send at the right moment, and use engagement signals to decide when a thoughtful follow-up is appropriate.",
  icon: Mail,
  benefits: [
    {
      title: "Reuse your strongest message",
      description: "Create reliable templates that preserve your voice while saving the team from starting over with every request.",
    },
    {
      title: "Set a considerate sequence",
      description: "Use reminders as a measured follow-up, not an endless stream of messages competing for attention.",
    },
    {
      title: "Measure what happens next",
      description: "Review send, open, and click activity to improve the campaign based on real engagement patterns.",
    },
  ],
  workflowTitle: "How email review campaigns work",
  workflowSteps: [
    { title: "Create your message", description: "Start with a clear review-request template that explains the next step in plain language." },
    { title: "Add the right recipients", description: "Import or select the customers who should receive this specific follow-up." },
    { title: "Review campaign engagement", description: "Use visible engagement activity to improve timing, content, and future follow-up decisions." },
  ],
  faq: [
    { question: "Can I use templates for recurring campaigns?", answer: "Yes. Templates help teams stay consistent while leaving room to personalize messages for the customer relationship." },
    { question: "Can I follow up after the first email?", answer: "Yes. You can use a measured reminder sequence when it fits your customer communication policy." },
    { question: "What does campaign engagement show?", answer: "Get Phame surfaces practical email activity such as sends, opens, and clicks so you can evaluate outreach performance." },
  ],
};

export const reputationManagementFeature: FeaturePageConfig = {
  slug: "reputation-management",
  title: "Reputation Management Software for Local Businesses | Get Phame",
  description:
    "Organize customer review outreach, maintain clear review links, and track email engagement in one reputation management workspace.",
  keywords: [
    "reputation management software",
    "local business reputation",
    "customer review outreach",
    "review management tools",
  ],
  eyebrow: "Reputation management",
  headline: "Build a steadier reputation workflow around real customer relationships",
  introduction:
    "Get Phame gives local teams a focused place to organize review outreach, keep destination links accurate, and measure how customers engage with requests.",
  supportingHeading: "Reputation work is a system, not a one-time ask",
  supportingCopy:
    "Bring email outreach, review destinations, and engagement reporting into a simple operating rhythm that your team can maintain over time.",
  icon: ShieldCheck,
  benefits: [
    {
      title: "Keep review links organized",
      description: "Manage the destinations customers need, so your team has a consistent next step for every request.",
    },
    {
      title: "Make outreach easier to run",
      description: "Give staff a practical repeatable workflow instead of relying on disconnected spreadsheets and inbox reminders.",
    },
    {
      title: "Use reporting to improve the process",
      description: "Compare outreach activity over time and identify where your reputation workflow needs attention.",
    },
  ],
  workflowTitle: "How reputation management works in Get Phame",
  workflowSteps: [
    { title: "Set up the essentials", description: "Connect your business email and organize the review destinations your team needs." },
    { title: "Run consistent outreach", description: "Use a clear follow-up process after the customer experience is complete." },
    { title: "Review engagement patterns", description: "Use campaign reporting to keep your operating process clear and accountable." },
  ],
  faq: [
    { question: "Is this only for Google reviews?", answer: "No. You can organize the review destinations your business uses and select the appropriate one for an outreach campaign." },
    { question: "Can a team use the same workflow?", answer: "Yes. A shared workflow gives the team a more consistent way to prepare and send customer follow-up." },
    { question: "Does the product promise a specific rating outcome?", answer: "No. Get Phame supports respectful review outreach and engagement tracking; customer feedback remains independent." },
  ],
};

const featureLinks = [
  { href: "/review-requests", label: "Review Requests" },
  { href: "/email-campaigns", label: "Email Campaigns" },
  { href: "/reputation-management", label: "Reputation Management" },
];

export default function FeaturePage({ feature }: { feature: FeaturePageConfig }) {
  const Icon = feature.icon;

  return (
    <div className="bg-[#0a1628] text-white">
      <SEOHead
        title={feature.title}
        description={feature.description}
        canonical={`https://getphame.app/${feature.slug}`}
        keywords={feature.keywords}
      />

      <section className="relative overflow-hidden border-b border-[#1e3050]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,oklch(0.8_0.18_80/0.16),transparent_30%),radial-gradient(circle_at_15%_70%,oklch(0.35_0.1_260/0.42),transparent_35%)]" />
        <div className="container relative grid gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-primary">{feature.eyebrow}</p>
            <h1 className="font-display text-4xl font-black leading-[1.1] text-white md:text-5xl">{feature.headline}</h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-200">{feature.introduction}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/onboarding" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[0_0_30px_oklch(0.78_0.15_75/0.2)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]">
                Start free <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a href="#workflow" className="inline-flex items-center justify-center rounded-xl border border-[#2a3a5c] bg-[#1a2744] px-7 py-4 text-base font-semibold text-white transition-colors hover:border-primary/50">
                See the workflow
              </a>
            </div>
          </div>

          <aside className="rounded-3xl border border-primary/25 bg-[#0f1d32] p-7 shadow-[0_0_50px_oklch(0.78_0.15_75/0.1)]" aria-label={`${feature.eyebrow} overview`}>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_25px_oklch(0.78_0.15_75/0.28)]">
              <Icon size={28} aria-hidden="true" />
            </div>
            <p className="font-display text-2xl font-extrabold text-white">A focused customer follow-up system</p>
            <ul className="mt-6 space-y-4">
              {feature.benefits.map((benefit) => (
                <li key={benefit.title} className="flex gap-3 text-slate-200">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
                  <span><strong className="font-semibold text-white">{benefit.title}.</strong> {benefit.description}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-b border-[#1e3050] bg-[oklch(0.12_0.025_250/0.6)] py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">A practical operating rhythm</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-white md:text-4xl">{feature.supportingHeading}</h2>
            <p className="mt-5 text-lg font-medium leading-relaxed text-slate-200">{feature.supportingCopy}</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {feature.benefits.map((benefit, index) => {
              const BenefitIcon = [ClipboardCheck, Repeat2, BarChart3][index] ?? CheckCircle2;
              return (
                <article key={benefit.title} className="rounded-2xl border border-[#1e3050] bg-[#0f1d32] p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_40px_oklch(0.78_0.15_75/0.06)]">
                  <BenefitIcon className="text-primary" size={24} aria-hidden="true" />
                  <h3 className="mt-5 font-display text-xl font-bold text-white">{benefit.title}</h3>
                  <p className="mt-3 leading-relaxed text-slate-300">{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-24 py-16 md:py-24" aria-labelledby={`${feature.slug}-workflow-title`}>
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">A simple workflow</p>
            <h2 id={`${feature.slug}-workflow-title`} className="mt-3 font-display text-3xl font-extrabold text-white md:text-4xl">{feature.workflowTitle}</h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {feature.workflowSteps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-[#1e3050] bg-[#0f1d32] p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-sm font-black text-primary-foreground">{index + 1}</span>
                <h3 className="mt-6 font-display text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-300">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-[#1e3050] bg-[oklch(0.12_0.025_250)] py-16 md:py-24" aria-labelledby={`${feature.slug}-faq-title`}>
        <div className="container max-w-4xl">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.16em] text-primary">Common questions</p>
          <h2 id={`${feature.slug}-faq-title`} className="mt-3 text-center font-display text-3xl font-extrabold text-white md:text-4xl">Useful details before you start</h2>
          <div className="mt-10 space-y-4">
            {feature.faq.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-[#1e3050] bg-[#0f1d32] p-5 open:border-primary/35">
                <summary className="cursor-pointer list-none font-display text-lg font-bold text-white marker:hidden">
                  <span className="flex items-center justify-between gap-4">{item.question}<span aria-hidden="true" className="text-primary transition-transform duration-200 group-open:rotate-45">+</span></span>
                </summary>
                <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="related-solutions-title">
        <div className="container">
          <div className="flex flex-col gap-5 rounded-3xl border border-primary/25 bg-[#0f1d32] p-7 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Explore Get Phame</p>
              <h2 id="related-solutions-title" className="mt-2 font-display text-2xl font-extrabold text-white">Related customer outreach solutions</h2>
            </div>
            <nav aria-label="Related Get Phame solutions" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {featureLinks.filter((link) => link.href !== `/${feature.slug}`).map((link) => (
                <a key={link.href} href={link.href} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-slate-200 transition-colors hover:bg-[#1a2744] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {link.label}<ArrowRight size={16} aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>
    </div>
  );
}
