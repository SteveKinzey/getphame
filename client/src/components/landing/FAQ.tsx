import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";
import FadeUp from "./FadeUp";

export default function FAQ() {
  const { t } = useTranslation();

  const faqs = [
  { question: t("landing.faq.q1", { defaultValue: "Will it look like spam?" }), answer: t("landing.faq.a1", { defaultValue: "No. Every email is sent directly from your own email address — not from a third-party server. Your customers see your name, your address, and your signature. It looks exactly like you sat down and typed it yourself. Open rates average 45–60% because recipients recognize the sender." }) },
  { question: t("landing.faq.q2", { defaultValue: "What email providers work?" }), answer: t("landing.faq.a2", { defaultValue: "Get Phame works with any email provider that supports SMTP: Gmail, Google Workspace, Outlook, Microsoft 365, Yahoo, Zoho, iCloud, and any custom SMTP server. If you can send email from it, you can connect it to Get Phame." }) },
  { question: t("landing.faq.q3", { defaultValue: "Is it really free?" }), answer: t("landing.faq.a3", { defaultValue: "Yes. The free plan gives you 10 initial review requests, then 5 more every rolling 30 days — with no credit card required and no time limit. If you want unlimited requests, bulk send, follow-up reminders, and WooCommerce sync, upgrade to Pro." }) },
  { question: t("landing.faq.q4", { defaultValue: "Can I import my customer list?" }), answer: t("landing.faq.a4", { defaultValue: "Absolutely. Upload a CSV file with customer names and email addresses, or sync directly from WooCommerce. We validate emails automatically, remove duplicates, and flag any invalid addresses before you send." }) },
  { question: t("landing.faq.q5", { defaultValue: "Does Get Phame store my email password?" }), answer: t("landing.faq.a5", { defaultValue: "Your SMTP credentials are encrypted at rest using AES-256 encryption. We never store plain-text passwords. Your credentials are only used to send emails on your behalf — we cannot read your inbox or access any other email data." }) },
  { question: t("landing.faq.q6", { defaultValue: "Will my emails land in spam?" }), answer: t("landing.faq.a6", { defaultValue: "Because emails are sent from your own email account (not a bulk-sending server), they have the same deliverability as any email you'd send manually. Your domain reputation, SPF, and DKIM records all apply normally. This is a key advantage over third-party senders." }) },
  { question: t("landing.faq.q7", { defaultValue: "What happens to my customer list?" }), answer: t("landing.faq.a7", { defaultValue: "Your customer data is stored securely and is never shared, sold, or used for any purpose other than sending your review requests. You can export or delete your entire customer list at any time. We comply with GDPR and CAN-SPAM requirements." }) },
  { question: t("landing.faq.q8", { defaultValue: "Can customers opt out?" }), answer: t("landing.faq.a8", { defaultValue: "Yes. Every email includes an unsubscribe link. When a customer opts out, they're automatically removed from future sends. This keeps you compliant and protects your sender reputation." }) },
  { question: t("landing.faq.q9", { defaultValue: "Do I need technical skills to connect my email?" }), answer: t("landing.faq.a9", { defaultValue: "No. For Gmail and Outlook, we provide step-by-step guides with screenshots. Most users connect in under 60 seconds. For custom SMTP, you'll need your server address, port, and credentials — your hosting provider can supply these." }) },
  { question: t("landing.faq.q10", { defaultValue: "Which review platforms does it support?" }), answer: t("landing.faq.a10", { defaultValue: "Any platform with a review link: Google, Yelp, TripAdvisor, Facebook, Bing Places, Trustpilot, G2, Capterra, and more. Just paste your review link and we'll include it in every request. You can change platforms anytime." }) },
  { question: t("landing.faq.q11", { defaultValue: "How does WooCommerce sync work?" }), answer: t("landing.faq.a11", { defaultValue: "Install our free WooCommerce plugin, enter your API key, and new customers are automatically imported after each completed order. You can set a delay (e.g., 7 days after purchase) before they appear in your send queue." }) },
  { question: t("landing.faq.q12", { defaultValue: "What does unlimited mean on the Pro plan?" }), answer: t("landing.faq.a12", { defaultValue: "Unlimited means no cap on the number of review requests you can send per month. Send 50 or 5,000 — no extra charges. The only limit is your email provider's own sending limits (e.g., Gmail allows ~500/day for personal accounts, 2,000/day for Workspace)." }) },
];
  return (
    <section id="faq" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
      <div className="container">
        <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
          <FadeUp className="lg:col-span-1">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("landing.faq.sectionTitle", { defaultValue: "FAQ" })}</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              {t("landing.faq.headline", { defaultValue: "Questions about email safety, privacy & setup" })}
            </h2>
            <p className="text-slate-200 font-medium">
              {t("landing.faq.description", { defaultValue: "Everything you need to know before connecting your email and sending your first review request." })}
            </p>
          </FadeUp>

          <FadeUp delay={0.15} className="lg:col-span-2">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-[#0f1d32] border border-[#1e3050] rounded-xl px-5 md:px-6 data-[state=open]:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold text-white hover:text-primary py-4 md:py-5 text-sm md:text-base [&[data-state=open]>svg]:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-200 font-medium leading-relaxed pb-5 text-base md:text-[16px]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
