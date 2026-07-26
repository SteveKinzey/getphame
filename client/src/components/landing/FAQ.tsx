import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FadeUp from "./FadeUp";
import { useTranslation } from "react-i18next";
export default function FAQ() {
  const { t } = useTranslation();

  const faqs = [
    { question: t("faq.q1", { defaultValue: "Will it look like spam?" }), answer: t("faq.a1", { defaultValue: "No. Emails are sent directly from your own email account — your name, your address, your reputation." }) },
    { question: t("faq.q2", { defaultValue: "What email providers work?" }), answer: t("faq.a2", { defaultValue: "Get Phame works with any email provider that supports SMTP: Gmail, Google Workspace, Outlook, Microsoft 365, Yahoo, Zoho, iCloud, and any custom SMTP server." }) },
    { question: t("faq.q3", { defaultValue: "Is it really free?" }), answer: t("faq.a3", { defaultValue: "Yes. The free plan gives you 10 review requests with no credit card required and no time limit." }) },
    { question: t("faq.q4", { defaultValue: "Can I import my customer list?" }), answer: t("faq.a4", { defaultValue: "Absolutely. Upload a CSV file with customer names and email addresses, or sync directly from WooCommerce." }) },
    { question: t("faq.q5", { defaultValue: "Does Get Phame store my email password?" }), answer: t("faq.a5", { defaultValue: "Your SMTP credentials are encrypted at rest using AES-256 encryption. We never store plain-text passwords." }) },
    { question: t("faq.q6", { defaultValue: "Will my emails land in spam?" }), answer: t("faq.a6", { defaultValue: "Because emails are sent from your own email account (not a bulk-sending server), they have the same deliverability as any email you'd send manually." }) },
    { question: t("faq.q7", { defaultValue: "What happens to my customer list?" }), answer: t("faq.a7", { defaultValue: "Your customer data is stored securely and is never shared, sold, or used for any purpose other than sending your review requests." }) },
    { question: t("faq.q8", { defaultValue: "Can customers opt out?" }), answer: t("faq.a8", { defaultValue: "Yes. Every email includes an unsubscribe link. When a customer opts out, they're automatically removed from future sends." }) },
    { question: t("faq.q9", { defaultValue: "Do I need technical skills to connect my email?" }), answer: t("faq.a9", { defaultValue: "No. For Gmail and Outlook, we provide step-by-step guides with screenshots. Most users connect in under 60 seconds." }) },
    { question: t("faq.q10", { defaultValue: "Which review platforms does it support?" }), answer: t("faq.a10", { defaultValue: "Any platform with a review link: Google, Yelp, TripAdvisor, Facebook, Bing Places, Trustpilot, G2, Capterra, and more." }) },
    { question: t("faq.q11", { defaultValue: "How does WooCommerce sync work?" }), answer: t("faq.a11", { defaultValue: "Install our free WooCommerce plugin, enter your API key, and new customers are automatically imported after each completed order." }) },
    { question: t("faq.q12", { defaultValue: "What does unlimited mean on the Pro plan?" }), answer: t("faq.a12", { defaultValue: "Unlimited means no cap on the number of review requests you can send per month. Send 50 or 5,000 — no extra charges." }) },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-[oklch(0.12_0.025_250)]">
      <div className="container">
        <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
          <FadeUp className="lg:col-span-1">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("faq.sectionTagline", { defaultValue: "FAQ" })}</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              {t("faq.sectionHeadline", { defaultValue: "Questions about email safety, privacy & setup" })}
            </h2>
            <p className="text-slate-200 font-medium">
              {t("faq.sectionSubheadline", { defaultValue: "Everything you need to know before connecting your email and sending your first review request." })}
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
