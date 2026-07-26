/**
 * Compliance Guide — review request best practices, platform risk levels,
 * legal notes, and what NOT to do.
 */
import { useLocation } from "wouter";
import { ChevronLeft, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Zap, Scale } from "lucide-react";

type RiskLevel = "low" | "moderate" | "high";

const RISK_COLOR: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: "oklch(0.96 0.08 150)", text: "oklch(0.35 0.14 150)", label: "Low Risk" },
  moderate: { bg: "oklch(0.96 0.12 80)", text: "oklch(0.45 0.18 80)", label: "Moderate Risk" },
  high: { bg: "oklch(0.96 0.08 20)", text: "oklch(0.45 0.18 20)", label: "High Risk" },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const c = RISK_COLOR[level];
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "oklch(0.45 0.18 80)" }}>{icon}</span>
        <h2 className="font-black text-base rr-text-navy">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Item({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-medium" style={{ color: "oklch(0.15 0.05 260)" }}>{text}</p>
        {sub && <p className="text-xs mt-0.5 rr-text-navy-muted">{sub}</p>}
      </div>
    </div>
  );
}

export default function Compliance() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-1 mb-4 text-sm hover:opacity-100 transition-opacity rr-text-gold"
        >
          <ChevronLeft size={16} /> Settings
        </button>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Compliance Guide
        </h1>
        <p className="text-base mt-1 text-white font-bold">
          Stay safe, stay legal, and protect your reputation
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Safe zone */}
        <Section icon={<ShieldCheck size={18} />} title="Where You're Safe">
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Customer had a real transaction with you" />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="No incentives offered (money, discounts, gifts)" />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="No scripted or pressured review wording" />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Ask ALL customers — not just happy ones" sub="Review gating (filtering unhappy customers away) is where most businesses get burned." />
        </Section>

        {/* Platform risk */}
        <Section icon={<AlertTriangle size={18} />} title="Platform Risk Levels">
          {/* Google */}
          <div className="rounded-xl p-3 mb-2 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm rr-text-navy">Google</p>
              <RiskBadge level="low" />
            </div>
            <Item icon={<CheckCircle2 size={13} className="rr-text-green" />} text="Asking for reviews via email is allowed" />
            <Item icon={<XCircle size={13} className="rr-text-red" />} text="No incentives, no review gating" />
            <p className="text-xs mt-1 rr-text-navy-muted">Worst case: reviews removed or profile flagged.</p>
          </div>

          {/* Yelp */}
          <div className="rounded-xl p-3 mb-2 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm rr-text-navy">Yelp</p>
              <RiskBadge level="high" />
            </div>
            <Item icon={<AlertTriangle size={13} style={{ color: "oklch(0.55 0.18 80)" }} />} text="Strongly discourages asking for reviews at all" />
            <Item icon={<AlertTriangle size={13} style={{ color: "oklch(0.55 0.18 80)" }} />} text="Algorithm actively filters 'solicited' reviews" />
            <Item icon={<CheckCircle2 size={13} className="rr-text-green" />} text="Safer: list your business name only — don't embed a direct Yelp link in bulk campaigns" />
            <p className="text-xs mt-1 rr-text-navy-muted">Worst case: reviews filtered (not shown publicly) + consumer alert badge on profile.</p>
          </div>

          {/* Bing */}
          <div className="rounded-xl p-3 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm rr-text-navy">Bing / Microsoft</p>
              <RiskBadge level="low" />
            </div>
            <Item icon={<CheckCircle2 size={13} className="rr-text-green" />} text="Similar to Google in practice, less aggressive enforcement" />
            <p className="text-xs mt-1 rr-text-navy-muted">Generally safe to include a direct link.</p>
          </div>
        </Section>

        {/* Legal */}
        <Section icon={<Scale size={18} />} title="Legal Considerations (U.S.)">
          <p className="text-xs mb-2 rr-text-navy-mid">
            The FTC cares about fake reviews, undisclosed incentives, and misleading practices. If you only ask real customers, don't compensate, and don't manipulate — you're fine legally.
          </p>
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Fake reviews" />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Undisclosed incentives" />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Misleading or deceptive practices" />
        </Section>

        {/* What kills accounts */}
        <Section icon={<XCircle size={18} />} title="What Kills Accounts">
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Incentives" sub='"Leave a review, get 10% off" — this is a direct violation.' />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Review gating funnels" sub="Filtering unhappy customers away from public platforms." />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Bulk blasts that look automated/spammy" sub="Sudden spikes of 50+ reviews in a day raise red flags." />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Writing reviews for customers or coaching exact wording" />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text="Embedding a Yelp review link in bulk email campaigns" />
        </Section>

        {/* Best practice playbook */}
        <Section icon={<CheckCircle2 size={18} />} title="Best-Practice Playbook">
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Send a simple, neutral request" sub={`"We'd appreciate your honest feedback"`} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Give multiple platform options" sub="Don't push one platform aggressively." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Ask ALL customers — not just happy ones" />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Avoid direct Yelp links in campaigns" sub="Safer to list your business name only." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Throttle volume" sub="No sudden spikes. Spread sends over days/weeks." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Send from a real person" sub="Not 'support@' — use a first name." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Keep emails under 100–120 words" />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Add subtle urgency" sub={`"while it's still fresh"`} />
        </Section>

        {/* WooCommerce timing */}
        <Section icon={<Zap size={18} />} title="WooCommerce Timing">
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Product orders: send 3–5 days after order completion" sub="Gives customers time to receive and use the product." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Service orders: send 1–2 days after completion" sub="While the experience is still fresh." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Trigger: WooCommerce order status → Completed" />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Rotate platforms across sends" sub="Don't send everyone to the same platform at once." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text="Track conversion rate" sub="Aim for reviews per 100 customers as your KPI." />
        </Section>

        {/* Subject line tips */}
        <Section icon={<Zap size={18} />} title="Subject Lines That Convert">
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text='"Quick favor?"' sub="Direct, low-pressure, high open rate." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text='"How did we do?"' sub="Conversational and curiosity-driven." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text='"[First Name], got a minute?"' sub="Personalisation boosts open rates." />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text='"Thanks for your order — got a minute?"' sub="Best for WooCommerce post-purchase flows." />
        </Section>

        {/* Bottom line */}
        <div className="rounded-2xl p-4 rr-bg-navy">
          <p className="text-xs font-bold uppercase tracking-wide mb-2 rr-text-gold">Bottom Line</p>
          <p className="text-base text-white font-bold">Google + Bing → safe if done correctly.</p>
          <p className="text-base text-white font-bold">Yelp → proceed carefully or avoid direct solicitation.</p>
          <p className="text-base text-white font-bold">Legal risk → low if you stay honest and don't incentivize.</p>
        </div>
      </div>
    </div>
  );
}
