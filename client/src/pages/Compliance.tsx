/**
 * Compliance Guide — review request best practices, platform risk levels,
 * legal notes, and what NOT to do.
 */
import { useLocation } from "wouter";
import { ChevronLeft, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Zap, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";

type RiskLevel = "low" | "moderate" | "high";

const RISK_COLOR: Record<RiskLevel, { bg: string; text: string }> = {
  low: { bg: "oklch(0.96 0.08 150)", text: "oklch(0.35 0.14 150)" },
  moderate: { bg: "oklch(0.96 0.12 80)", text: "oklch(0.45 0.18 80)" },
  high: { bg: "oklch(0.96 0.08 20)", text: "oklch(0.45 0.18 20)" },
};

function RiskBadge({ level, label }: { level: RiskLevel; label: string }) {
  const c = RISK_COLOR[level];
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "oklch(0.45 0.18 80)" }}>{icon}</span>
        <h2 className="font-black text-base rr-text-navy">{title}</h2>
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
  const { t } = useTranslation();
  const guide = (key: string) => t(`complianceGuide.${key}`);

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-1 mb-4 text-sm hover:opacity-100 transition-opacity rr-text-gold"
        >
          <ChevronLeft size={16} /> {guide("backToSettings")}
        </button>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {guide("title")}
        </h1>
        <p className="text-base mt-1 text-white font-bold">{guide("subtitle")}</p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <Section icon={<ShieldCheck size={18} />} title={guide("safeZone.title")}>
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("safeZone.transaction")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("safeZone.noIncentives")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("safeZone.noPressure")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("safeZone.allCustomers")} sub={guide("safeZone.allCustomersSub")} />
        </Section>

        <Section icon={<AlertTriangle size={18} />} title={guide("platformRisk.title")}>
          <div className="rounded-xl p-3 mb-2 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm rr-text-navy">Google</p>
              <RiskBadge level="low" label={guide("risk.low")} />
            </div>
            <Item icon={<CheckCircle2 size={13} className="rr-text-green" />} text={guide("platformRisk.google.allowed")} />
            <Item icon={<XCircle size={13} className="rr-text-red" />} text={guide("platformRisk.google.noIncentives")} />
            <p className="text-xs mt-1 rr-text-navy-muted">{guide("platformRisk.google.worstCase")}</p>
          </div>

          <div className="rounded-xl p-3 mb-2 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm rr-text-navy">Yelp</p>
              <RiskBadge level="high" label={guide("risk.high")} />
            </div>
            <Item icon={<AlertTriangle size={13} style={{ color: "oklch(0.55 0.18 80)" }} />} text={guide("platformRisk.yelp.discourages")} />
            <Item icon={<AlertTriangle size={13} style={{ color: "oklch(0.55 0.18 80)" }} />} text={guide("platformRisk.yelp.filters")} />
            <Item icon={<CheckCircle2 size={13} className="rr-text-green" />} text={guide("platformRisk.yelp.safer")} />
            <p className="text-xs mt-1 rr-text-navy-muted">{guide("platformRisk.yelp.worstCase")}</p>
          </div>

          <div className="rounded-xl p-3 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm rr-text-navy">{guide("platformRisk.bing.title")}</p>
              <RiskBadge level="low" label={guide("risk.low")} />
            </div>
            <Item icon={<CheckCircle2 size={13} className="rr-text-green" />} text={guide("platformRisk.bing.similar")} />
            <p className="text-xs mt-1 rr-text-navy-muted">{guide("platformRisk.bing.worstCase")}</p>
          </div>
        </Section>

        <Section icon={<Scale size={18} />} title={guide("legal.title")}>
          <p className="text-xs mb-2 rr-text-navy-mid">{guide("legal.intro")}</p>
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("legal.fakeReviews")} />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("legal.undisclosedIncentives")} />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("legal.misleading")} />
        </Section>

        <Section icon={<XCircle size={18} />} title={guide("accountRisks.title")}>
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("accountRisks.incentives")} sub={guide("accountRisks.incentivesSub")} />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("accountRisks.gating")} sub={guide("accountRisks.gatingSub")} />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("accountRisks.bulk")} sub={guide("accountRisks.bulkSub")} />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("accountRisks.writing")} />
          <Item icon={<XCircle size={14} className="rr-text-red" />} text={guide("accountRisks.yelpLinks")} />
        </Section>

        <Section icon={<CheckCircle2 size={18} />} title={guide("playbook.title")}>
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.neutral")} sub={guide("playbook.neutralSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.multiplePlatforms")} sub={guide("playbook.multiplePlatformsSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.allCustomers")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.noYelpLinks")} sub={guide("playbook.noYelpLinksSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.throttle")} sub={guide("playbook.throttleSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.realPerson")} sub={guide("playbook.realPersonSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.emailLength")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("playbook.urgency")} sub={guide("playbook.urgencySub")} />
        </Section>

        <Section icon={<Zap size={18} />} title={guide("wooTiming.title")}>
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("wooTiming.product")} sub={guide("wooTiming.productSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("wooTiming.service")} sub={guide("wooTiming.serviceSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("wooTiming.trigger")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("wooTiming.rotate")} sub={guide("wooTiming.rotateSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("wooTiming.track")} sub={guide("wooTiming.trackSub")} />
        </Section>

        <Section icon={<Zap size={18} />} title={guide("subjectLines.title")}>
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("subjectLines.quickFavor")} sub={guide("subjectLines.quickFavorSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("subjectLines.howDidWeDo")} sub={guide("subjectLines.howDidWeDoSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("subjectLines.gotAMinute")} sub={guide("subjectLines.gotAMinuteSub")} />
          <Item icon={<CheckCircle2 size={14} className="rr-text-green" />} text={guide("subjectLines.thanksOrder")} sub={guide("subjectLines.thanksOrderSub")} />
        </Section>

        <div className="rounded-2xl p-4 rr-bg-navy">
          <p className="text-xs font-bold uppercase tracking-wide mb-2 rr-text-gold">{guide("bottomLine.label")}</p>
          <p className="text-base text-white font-bold">{guide("bottomLine.googleBing")}</p>
          <p className="text-base text-white font-bold">{guide("bottomLine.yelp")}</p>
          <p className="text-base text-white font-bold">{guide("bottomLine.legal")}</p>
        </div>
      </div>
    </div>
  );
}
